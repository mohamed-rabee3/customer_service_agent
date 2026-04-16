# 🚀 QUICK START GUIDE - GET TELEGRAM RESPONSES

## ✅ Database Setup - COMPLETE

Your 9 agents are now configured with the Telegram token in database:
```
✅ Agent A1 (voice)
✅ Permanent Agent (chat)
✅ Permanent Agent (chat)
✅ Agent A1 (voice)
✅ Voice Agent Alpha (voice)
✅ Sales Assistant Bot v2 (voice)
✅ Ahmed (chat)
✅ Ahmed (chat)
✅ Chat Agent Beta (chat)
```

Token: `8627012748:AAGxCvcIEoR8HZu2uL64GQwmHIv9MWXDL_0`

---

## 🎯 ACTION REQUIRED: Set Webhooks in BotFather

**⚠️ THIS IS WHY YOU'RE NOT GETTING RESPONSES**

Telegram needs to know where to send messages. You must configure the webhook URL.

### Steps:

1. **Open Telegram** → Search for **@BotFather**

2. **Select your bot** → Type the bot name or `/mybots`

3. **Send this command:**
   ```
   /setwebhook
   ```

4. **Enter your webhook URL** (see table below for each agent)

---

## 📋 WEBHOOK URLs FOR EACH AGENT

Use ONE webhook per bot. If you want multiple agents to handle the same Telegram bot:
- Set the webhook to one agent ID
- All messages will go to that agent

**Choose the agent you want to use and set its webhook:**

| Agent Name | Type | Agent ID | Webhook URL |
|-----------|------|----------|-------------|
| Chat Agent Beta | chat | `8c7ab36a-7efc-4b61-a1c3-847da073d229` | `https://yourdomain.com/api/v1/telegram/webhook/8c7ab36a-7efc-4b61-a1c3-847da073d229` |
| Ahmed | chat | `b05f276e-61dc-475f-9b4c-fe21438e3f32` | `https://yourdomain.com/api/v1/telegram/webhook/b05f276e-61dc-475f-9b4c-fe21438e3f32` |
| Ahmed | chat | `04364cb3-1805-40b8-bd72-25a5b75920bf` | `https://yourdomain.com/api/v1/telegram/webhook/04364cb3-1805-40b8-bd72-25a5b75920bf` |
| Agent A1 | voice | `0f547551-5448-4dc8-96ce-987d6040e828` | `https://yourdomain.com/api/v1/telegram/webhook/0f547551-5448-4dc8-96ce-987d6040e828` |
| Agent A1 | voice | `d7af1002-f826-4b31-8093-17f09543e6c4` | `https://yourdomain.com/api/v1/telegram/webhook/d7af1002-f826-4b31-8093-17f09543e6c4` |
| Permanent Agent | chat | `df90105c-1b96-45c0-9c49-438c5e5896bd` | `https://yourdomain.com/api/v1/telegram/webhook/df90105c-1b96-45c0-9c49-438c5e5896bd` |
| Permanent Agent | chat | `a5e7dcd4-ea00-44a0-8953-a348919f9f39` | `https://yourdomain.com/api/v1/telegram/webhook/a5e7dcd4-ea00-44a0-8953-a348919f9f39` |
| Voice Agent Alpha | voice | `7ae501dd-009b-48ec-b5a3-ae6583554901` | `https://yourdomain.com/api/v1/telegram/webhook/7ae501dd-009b-48ec-b5a3-ae6583554901` |
| Sales Assistant Bot v2 | voice | `13546da6-c140-4960-9817-0c00ed93ecd5` | `https://yourdomain.com/api/v1/telegram/webhook/13546da6-c140-4960-9817-0c00ed93ecd5` |

---

## 💡 EXAMPLE: Set Webhook for Chat Agent Beta

### In BotFather:

```
You: /setwebhook

BotFather: Please send the webhook URL

You: https://yourdomain.com/api/v1/telegram/webhook/8c7ab36a-7efc-4b61-a1c3-847da073d229

BotFather: ✓ Webhook was set
```

---

## ✔️ VERIFY WEBHOOK IS SET

After setting the webhook, verify it's working:

**In BotFather:**
```
You: /getwebhook

BotFather: 
Current webhook: https://yourdomain.com/api/v1/telegram/webhook/8c7ab36a-7efc-4b61-a1c3-847da073d229
Last error date: [time]
Failed connection count: 0
```

---

## 🧪 TEST IT

1. **Send a test message** to your Telegram bot

2. **Check backend logs:**
   ```bash
   cd backend
   python run_dev.py
   ```

3. **Look for:**
   ```
   📥 Received Telegram webhook request for agent 8c7ab36a-7efc-4b61-a1c3-847da073d229
   📱 Message from Telegram chat [ID]: your message...
   ✅ Response sent to Telegram
   ```

---

## ❌ TROUBLESHOOTING

### Problem: BotFather says "Webhook error"

**Checklist:**
- [ ] Domain is HTTPS (not HTTP)
- [ ] Domain is publicly accessible (not localhost)
- [ ] Agent ID in URL is correct (exact UUID)
- [ ] Backend is running

**Test connection:**
```bash
curl https://yourdomain.com/api/v1/telegram/webhook/8c7ab36a-7efc-4b61-a1c3-847da073d229
```

Should return something like: `{"status":"error","reason":"agent_not_found"}` or message received

### Problem: No messages in backend logs

1. Send message to bot
2. Run: `/testwebhook` in BotFather
3. Check if webhook URL is correct: `/getwebhook`
4. Check firewall/proxy isn't blocking webhooks

### Problem: Agent status says "in_call" or "in_chat"

Some agents are currently active. You can:
- Wait for them to finish
- Use an idle agent instead (status: `idle`)

---

## 📝 REQUIREMENT TO REMEMBER

**Telegram requires HTTPS** - your domain must have a valid SSL certificate. Telegram will not accept HTTP webhooks.

If you're on localhost or internal network, you'll need to:
1. Use ngrok or similar tunneling service
2. Set up a reverse proxy with HTTPS
3. Use a public domain with valid SSL cert

---

## ✅ SUCCESS INDICATORS

When it's working, you should see in the backend:
```
📥 Received Telegram webhook request for agent [ID]
📱 Message from Telegram chat [CHAT_ID]: [MESSAGE]
🔄 Processing message with agent...
💬 Agent response: [RESPONSE]
✅ Response sent to Telegram
```

---

**That's it! You're ready to get Telegram responses.** 🎉

