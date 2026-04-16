
# ==================== WHATSAPP WEBHOOK ====================

@router.post(
    "/whatsapp/{agent_id}",
    status_code=status.HTTP_200_OK,
    summary="WhatsApp Webhook",
    description="Receives incoming messages from WhatsApp (Twilio or Meta) and routes them to the ChatAgent.",
)
async def whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    agent_id: UUID = Path(..., description="The ID of the AI Agent to handle this webhook"),
):
    """WhatsApp Webhook Endpoint - supports Twilio and Meta."""
    
    logger.debug(f"📥 Received WhatsApp webhook request for agent {agent_id}")
    
    payload = await request.json()
    logger.debug(f"WhatsApp payload: {json.dumps(payload)}")
    
    # Determine provider and parse message
    message_data = None
    provider = None
    
    # Check if it's Twilio or Meta format
    if "MessageSid" in payload:
        # Twilio format
        provider = "twilio"
        message_data = WhatsAppService.parse_message_twilio(payload)
    elif "entry" in payload:
        # Meta format
        provider = "meta"
        message_data = WhatsAppService.parse_message_meta(payload)
    
    if not message_data:
        logger.debug(f"⏭️ Skipping non-text WhatsApp message")
        return {"status": "ignored", "reason": "no_text_message"}
    
    phone_number, customer_text = message_data
    call_source_id = WhatsAppService.get_call_source_id(phone_number)
    
    logger.info(f"📱 WhatsApp message from {phone_number}: {customer_text[:50]}...")
    
    db = get_supabase_service_client()
    now_ts = datetime.now(timezone.utc).isoformat()
    
    # 2. Lookup Agent & webhook config
    agent_result = db.table("agents").select("id, name, system_prompt, status, webhook_configs").eq("id", str(agent_id)).limit(1).execute()
    
    if not agent_result.data:
        logger.error(f"❌ Agent {agent_id} not found")
        return {"status": "error", "reason": "agent_not_found"}
    
    agent = agent_result.data[0]
    webhook_configs = agent.get("webhook_configs", {})
    whatsapp_config = webhook_configs.get("whatsapp", {})
    
    if not whatsapp_config.get("enabled"):
        logger.error(f"❌ WhatsApp not configured for agent {agent_id}")
        return {"status": "ignored", "reason": "whatsapp_not_configured"}
    
    api_token = whatsapp_config.get("api_token")
    
    if not api_token:
        logger.error(f"❌ No WhatsApp API token configured")
        return {"status": "ignored", "reason": "no_api_token"}
    
    logger.debug(f"✅ Found agent: {agent.get('name')}")
    
    # Agent paused check
    if agent.get("status") == AgentStatus.PAUSED.value:
        logger.info(f"⏸️ Agent {agent_id} is paused")
        return {"status": "ignored", "reason": "agent_paused"}
    
    # 3. Find or create session
    session_result = db.table("interactions").select("id").eq("call_source_id", call_source_id).eq("status", InteractionStatus.ACTIVE.value).limit(1).execute()
    
    interaction_id = None
    chat_agent = None
    
    if session_result.data:
        interaction_id = UUID(session_result.data[0]["id"])
        logger.debug(f"📋 Found existing WhatsApp session: {interaction_id}")
        chat_agent = AgentRunner.get_session(interaction_id)
        
        if not chat_agent:
            logger.info(f"🔄 Recovering WhatsApp session {interaction_id}")
            chat_agent = await AgentRunner.start_session(
                agent_id=agent_id,
                interaction_id=interaction_id,
                system_prompt=agent["system_prompt"],
                agent_name=agent["name"],
            )
            history_res = db.table("chat_messages").select("role, content").eq("interaction_id", str(interaction_id)).order("created_at").execute()
            for row in history_res.data:
                mapped_role = "user" if row["role"] == "customer" else "assistant"
                chat_agent.messages.append({"role": mapped_role, "content": row["content"]})
            logger.info(f"✅ Session recovered with {len(history_res.data)} messages")
    else:
        logger.info(f"🚀 Starting new WhatsApp session")
        interaction_data = {
            "agent_id": str(agent_id),
            "interaction_type": InteractionType.CHAT.value,
            "status": InteractionStatus.ACTIVE.value,
            "started_at": now_ts,
            "call_source_id": call_source_id,
            "source_channel": "whatsapp"
        }
        interaction_result = db.table("interactions").insert(interaction_data).execute()
        if not interaction_result.data:
            logger.error(f"❌ Failed to create interaction")
            return {"status": "error", "reason": "db_insert_failed"}
        
        interaction_id = UUID(interaction_result.data[0]["id"])
        db.table("agents").update({"status": AgentStatus.IN_CHAT.value, "updated_at": now_ts}).eq("id", str(agent_id)).execute()
        
        chat_agent = await AgentRunner.start_session(
            agent_id=agent_id,
            interaction_id=interaction_id,
            system_prompt=agent["system_prompt"],
            agent_name=agent["name"],
        )
    
    # 4. Save message and process
    db.table("chat_messages").insert({
        "interaction_id": str(interaction_id),
        "role": "customer",
        "content": customer_text,
    }).execute()
    
    await AgentRunner.broadcast_event(interaction_id, {
        "type": "message",
        "data": {"role": "customer", "content": customer_text, "created_at": now_ts},
    })
    
    # Process in background
    async def process_whatsapp():
        full_response = ""
        try:
            async for chunk in chat_agent.process_message(customer_text):
                full_response += chunk
            
            db.table("chat_messages").insert({
                "interaction_id": str(interaction_id),
                "role": "agent",
                "content": full_response,
            }).execute()
            
            await AgentRunner.broadcast_event(interaction_id, {
                "type": "message",
                "data": {"role": "agent", "content": full_response, "created_at": datetime.now(timezone.utc).isoformat()},
            })
            
            # Send WhatsApp response
            success = await WhatsAppService.send_message(
                recipient_phone=phone_number,
                text=full_response,
                api_token=api_token,
                provider=whatsapp_config.get("provider", "twilio")
            )
            if success:
                logger.info(f"✅ WhatsApp response sent")
            
            await analyze_and_metrics_background_task(interaction_id, chat_agent)
        except Exception as e:
            logger.error(f"❌ Error processing WhatsApp: {e}", exc_info=True)
            await WhatsAppService.send_message(
                recipient_phone=phone_number,
                text="Sorry, I'm having technical difficulties. Please try again.",
                api_token=api_token,
                provider=whatsapp_config.get("provider", "twilio")
            )
    
    background_tasks.add_task(process_whatsapp)
    return {"status": "processing"}


# ==================== INSTAGRAM WEBHOOK ====================

@router.post(
    "/instagram/{agent_id}",
    status_code=status.HTTP_200_OK,
    summary="Instagram DM Webhook",
    description="Receives incoming direct messages from Instagram and routes them to the ChatAgent.",
)
async def instagram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    agent_id: UUID = Path(..., description="The ID of the AI Agent to handle this webhook"),
):
    """Instagram Direct Message Webhook Endpoint."""
    
    logger.debug(f"📥 Received Instagram webhook request for agent {agent_id}")
    
    payload = await request.json()
    
    # Instagram challenge verification (first webhook setup)
    if payload.get("hub.mode") == "subscribe":
        challenge = payload.get("hub.challenge")
        logger.info("✅ Instagram webhook verification success")
        return {"hub.challenge": challenge}
    
    message_data = InstagramService.parse_message(payload)
    if not message_data:
        logger.debug(f"⏭️ Skipping non-text Instagram message")
        return {"status": "ignored"}
    
    sender_id, customer_text = message_data
    call_source_id = InstagramService.get_call_source_id(sender_id)
    
    logger.info(f"📸 Instagram DM from {sender_id}: {customer_text[:50]}...")
    
    db = get_supabase_service_client()
    now_ts = datetime.now(timezone.utc).isoformat()
    
    # 2. Lookup Agent
    agent_result = db.table("agents").select("id, name, system_prompt, status, webhook_configs").eq("id", str(agent_id)).limit(1).execute()
    
    if not agent_result.data:
        logger.error(f"❌ Agent {agent_id} not found")
        return {"status": "error"}
    
    agent = agent_result.data[0]
    webhook_configs = agent.get("webhook_configs", {})
    instagram_config = webhook_configs.get("instagram", {})
    
    if not instagram_config.get("enabled"):
        logger.error(f"❌ Instagram not configured for agent {agent_id}")
        return {"status": "ignored"}
    
    api_token = instagram_config.get("api_token")
    if not api_token:
        logger.error(f"❌ No Instagram API token")
        return {"status": "ignored"}
    
    if agent.get("status") == AgentStatus.PAUSED.value:
        logger.info(f"⏸️ Agent {agent_id} is paused")
        return {"status": "ignored"}
    
    # 3. Find or create session
    session_result = db.table("interactions").select("id").eq("call_source_id", call_source_id).eq("status", InteractionStatus.ACTIVE.value).limit(1).execute()
    
    interaction_id = None
    chat_agent = None
    
    if session_result.data:
        interaction_id = UUID(session_result.data[0]["id"])
        logger.debug(f"📋 Found existing Instagram session: {interaction_id}")
        chat_agent = AgentRunner.get_session(interaction_id)
        
        if not chat_agent:
            chat_agent = await AgentRunner.start_session(
                agent_id=agent_id,
                interaction_id=interaction_id,
                system_prompt=agent["system_prompt"],
                agent_name=agent["name"],
            )
            history_res = db.table("chat_messages").select("role, content").eq("interaction_id", str(interaction_id)).order("created_at").execute()
            for row in history_res.data:
                mapped_role = "user" if row["role"] == "customer" else "assistant"
                chat_agent.messages.append({"role": mapped_role, "content": row["content"]})
    else:
        logger.info(f"🚀 Starting new Instagram session")
        interaction_data = {
            "agent_id": str(agent_id),
            "interaction_type": InteractionType.CHAT.value,
            "status": InteractionStatus.ACTIVE.value,
            "started_at": now_ts,
            "call_source_id": call_source_id,
            "source_channel": "instagram"
        }
        interaction_result = db.table("interactions").insert(interaction_data).execute()
        if not interaction_result.data:
            return {"status": "error"}
        
        interaction_id = UUID(interaction_result.data[0]["id"])
        db.table("agents").update({"status": AgentStatus.IN_CHAT.value, "updated_at": now_ts}).eq("id", str(agent_id)).execute()
        
        chat_agent = await AgentRunner.start_session(
            agent_id=agent_id,
            interaction_id=interaction_id,
            system_prompt=agent["system_prompt"],
            agent_name=agent["name"],
        )
    
    # 4. Save message and process
    db.table("chat_messages").insert({
        "interaction_id": str(interaction_id),
        "role": "customer",
        "content": customer_text,
    }).execute()
    
    await AgentRunner.broadcast_event(interaction_id, {
        "type": "message",
        "data": {"role": "customer", "content": customer_text, "created_at": now_ts},
    })
    
    # Process in background
    async def process_instagram():
        full_response = ""
        try:
            async for chunk in chat_agent.process_message(customer_text):
                full_response += chunk
            
            db.table("chat_messages").insert({
                "interaction_id": str(interaction_id),
                "role": "agent",
                "content": full_response,
            }).execute()
            
            await AgentRunner.broadcast_event(interaction_id, {
                "type": "message",
                "data": {"role": "agent", "content": full_response, "created_at": datetime.now(timezone.utc).isoformat()},
            })
            
            # Send Instagram response
            success = await InstagramService.send_message(
                recipient_id=sender_id,
                text=full_response,
                api_token=api_token,
                business_account_id=instagram_config.get("business_account_id", "")
            )
            if success:
                logger.info(f"✅ Instagram response sent")
            
            await analyze_and_metrics_background_task(interaction_id, chat_agent)
        except Exception as e:
            logger.error(f"❌ Error processing Instagram: {e}", exc_info=True)
    
    background_tasks.add_task(process_instagram)
    return {"status": "processing"}
