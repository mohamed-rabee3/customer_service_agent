# 🚀 Multi-Channel Webhook Integration - Implementation Plan

## Overview
Add WhatsApp and Instagram support alongside existing Telegram integration. Agents can send/receive messages on all 3 channels simultaneously.

---

## 📊 Database Schema Changes

### Migration #1: Add webhook_configs JSONB column

```sql
-- Add JSONB column for all channel configurations
ALTER TABLE agents ADD COLUMN webhook_configs JSONB DEFAULT '{
  "telegram": { "enabled": false, "bot_token": null },
  "whatsapp": { "enabled": false, "phone_number": null, "api_token": null, "api_provider": null },
  "instagram": { "enabled": false, "business_account_id": null, "api_token": null }
}'::jsonb;

-- Create index for efficient queries
CREATE INDEX idx_agents_webhook_configs ON agents USING GIN (webhook_configs);

-- Keep telegram_bot_token for backward compatibility, populate from webhook_configs if missing
UPDATE agents SET telegram_bot_token = webhook_configs->'telegram'->>'bot_token' WHERE telegram_bot_token IS NULL;
```

### Schema Structure
```json
{
  "telegram": {
    "enabled": true,
    "bot_token": "123456:ABC-DEF..."
  },
  "whatsapp": {
    "enabled": true,
    "phone_number": "+1234567890",
    "api_token": "...",
    "api_provider": "twilio" // or "meta"
  },
  "instagram": {
    "enabled": true,
    "business_account_id": "12345...",
    "api_token": "...",
    "webhook_token": "..." // for webhook verification
  }
}
```

---

## 💾 Interactions Table Update (optional)

### Add source_channel field
```sql
-- Track which channel a conversation started from
ALTER TABLE interactions ADD COLUMN source_channel VARCHAR(20);

-- Constraint
ALTER TABLE interactions ADD CONSTRAINT chk_source_channel 
  CHECK (source_channel IN ('telegram', 'whatsapp', 'instagram'));
```

---

## 🔧 Backend Updates

### 1️⃣ Models & Schemas

**AgentModel** (repository/agent_repository.py):
```python
webhook_configs: dict[str, Any] # Contains all channel configs
```

**CreateAgentRequest** (api/v1/schemas/agent.py):
```python
webhook_configs: dict[str, Any] = Field(default_factory=dict)
```

### 2️⃣ Webhook Endpoints

Create endpoints in `app/api/v1/endpoints/webhooks.py`:

```python
# Telegram (existing)
POST /v1/telegram/{agent_id}

# WhatsApp (new)
POST /v1/whatsapp/{agent_id}

# Instagram (new)
POST /v1/instagram/{agent_id}

# Generic handler
POST /v1/webhooks/{agent_id}/receive
```

### 3️⃣ Message Sending Functions

```python
async def send_telegram_message(chat_id, text, bot_token)
async def send_whatsapp_message(phone_number, text, api_token, provider)
async def send_instagram_message(recipient_id, text, api_token)
```

---

## 🎨 Frontend Changes

### AgentFormModal - Channel Selection

**Add Tabs/Sections:**
1. **Telegram Tab**
   - Input: Bot Token
   - Link to BotFather
   - Status: ✅ Connected / ⚠️ Not configured

2. **WhatsApp Tab**
   - Input: Phone Number
   - Input: API Token
   - Select: API Provider (Twilio / Meta)
   - Status: ✅ Connected / ⚠️ Not configured

3. **Instagram Tab**
   - Input: Business Account ID
   - Input: API Token
   - Input: Webhook Token
   - Status: ✅ Connected / ⚠️ Not configured

### ChatAgentCard Updates

Show badges for enabled channels:
```
[Chat Agent Name]
Status: active
🔔 Telegram  📱 WhatsApp  📸 Instagram
```

---

## 🔑 API Provider Information

### Telegram
- **Token Format:** `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
- **Source:** @BotFather
- **Webhook URL:** `/v1/telegram/{agent_id}`
- **Cost:** Free

### WhatsApp

#### Option A: Twilio
- **Account SID:** From Twilio Console
- **Auth Token:** From Twilio Console
- **Phone Number:** Your Twilio number (e.g., +1234567890)
- **Webhook URL:** `/v1/whatsapp/{agent_id}`
- **Cost:** $0.0075 per inbound, $0.0125 per outbound (US)

#### Option B: Meta (WhatsApp Business Platform)
- **Business Account ID:** From Meta Business Manager
- **Phone Number ID:** From WhatsApp Manager
- **API Token:** From Meta System User
- **Webhook URL:** `/v1/whatsapp/{agent_id}`
- **Cost:** $0.005 per inbound, $0.10-0.50 per outbound message

### Instagram DM
- **Business Account ID:** From Meta Business Manager
- **API Token:** From Meta System User
- **Webhook Token:** Generate yourself (for webhook verification)
- **Webhook URL:** `/v1/instagram/{agent_id}`
- **Cost:** Free for API access, but requires Instagram's approval

---

## 📝 Integration Checklist

### Backend
- [ ] Add webhook_configs to AgentModel
- [ ] Update AgentRepository to handle webhook_configs
- [ ] Create service methods for each channel
- [ ] Implement /v1/whatsapp/{agent_id} endpoint
- [ ] Implement /v1/instagram/{agent_id} endpoint
- [ ] Add message sending functions for WhatsApp & Instagram
- [ ] Update setup_webhook.py to configure all channels
- [ ] Add validation for each channel's credentials

### Frontend
- [ ] Update AgentFormModal with tabs for each channel
- [ ] Add channel-specific input fields
- [ ] Add channel enable/disable toggles
- [ ] Update ChatAgentCard to show channel badges
- [ ] Update API service to send webhook_configs

### Database
- [ ] Create migration for webhook_configs column
- [ ] Migrate existing telegram_bot_token to webhook_configs
- [ ] Add source_channel to interactions (optional)

---

## ⚡ Quick Start

### Prerequisites
You'll need at least one of:
- **Telegram:** BotFather account (free)
- **WhatsApp:** Twilio or Meta account
- **Instagram:** Meta Business Account

### Setup Order
1. Add database migration
2. Update backend models
3. Create webhook endpoints
4. Update frontend forms
5. Test each channel

---

## 🤔 Decision Points

**Q: Should we support all 3 channels or start with one?**
A: Recommend implementing structure for all 3, but start with Telegram ✅ and WhatsApp 🆕

**Q: Use Twilio or Meta for WhatsApp?**
A: Twilio is easier to set up, Meta is cheaper at scale

**Q: Store telegram_bot_token separately or only in webhook_configs?**
A: Keep both for now (backward compatibility), deprecate telegram_bot_token column later

**Q: How to handle message formatting differences?**
A: Each handler converts messages to unified format before processing by ChatAgent

---

## File Structure After Changes

```
backend/
├── app/
│   ├── api/v1/
│   │   ├── endpoints/
│   │   │   └── webhooks.py (UPDATED - add whatsapp, instagram handlers)
│   │   └── schemas/
│   │       └── agent.py (UPDATED - add webhook_configs)
│   ├── services/
│   │   ├── telegram_service.py (NEW)
│   │   ├── whatsapp_service.py (NEW)
│   │   └── instagram_service.py (NEW)
│   ├── repositories/
│   │   └── agent_repository.py (UPDATED)
│   └── agents/
│       └── chat_agent.py (unchanged)
├── db/
│   └── 005_add_webhook_configs.sql (NEW)
└── setup_webhook.py (UPDATED - handle all channels)

frontend/
└── src/
    ├── components/agents/
    │   └── AgentFormModal.tsx (UPDATED - add tabs)
    └── services/
        └── agentsService.ts (UPDATED)
```

---

## Next Steps

1. **Confirm Database Design:** JSONB approach approved? ✅
2. **Choose WhatsApp Provider:** Twilio or Meta?
3. **Choose Instagram:** Include or later?
4. **Start Implementation:** Run migrations and begin coding

