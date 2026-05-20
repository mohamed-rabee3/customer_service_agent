# Quick Reference - Multi-Channel Agent System

## 🎯 What You Have Now

A complete multi-channel messaging platform where:
- ✅ Supervisors create agents
- ✅ Each agent can use: Telegram + WhatsApp + Instagram
- ✅ Users send messages on any channel
- ✅ Agent responds automatically via LLM
- ✅ Conversation history stored in database

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  3 EXTERNAL CHANNELS                                        │
├──────────────┬──────────────────┬──────────────────────────┤
│  Telegram    │  WhatsApp        │  Instagram               │
│  (Native)    │  (Twilio/Meta)   │  (Meta Graph API)        │
└──────┬───────┴────────┬─────────┴──────────┬───────────────┘
       │                │                    │
       └────────────────┼────────────────────┘
                        ↓
         ┌──────────────────────────────────┐
         │  FastAPI Backend                 │
         │  POST /v1/{channel}/{agent_id}   │
         └──────┬───────────────────────────┘
                ↓
    ┌───────────────────────────┐
    │  ChatAgent LLM Processing  │
    │  (Uses system_prompt)      │
    └───────────┬────────────────┘
                ↓
    ┌───────────────────────────┐
    │  Response Generated        │
    │  Message Saved to DB       │
    └───────────┬────────────────┘
                ↓
       Response Sent Back
       via Original Channel
```

---

## 📁 Key Files

### Backend Services
| File | Purpose | Status |
|------|---------|--------|
| `app/services/telegram_service.py` | Telegram message handling | ✅ Complete |
| `app/services/whatsapp_service.py` | WhatsApp over Twilio/Meta | ✅ Complete |
| `app/services/instagram_service.py` | Instagram DM handling | ✅ Complete |

### Endpoints
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/telegram/{agent_id}` | POST | Telegram webhook | ✅ Complete |
| `/v1/whatsapp/{agent_id}` | POST | WhatsApp webhook | ✅ Complete |
| `/v1/instagram/{agent_id}` | POST | Instagram webhook | ✅ Complete |

### Database
| File | Purpose | Status |
|------|---------|--------|
| `db/006_ca_add_webhook_configs.sql` | Migration for multi-channel | ⏳ Needs running |

### Frontend Types
| File | Update | Status |
|------|--------|--------|
| `frontend/src/services/agentsService.ts` | WebhookConfigs interface | ✅ Complete |

---

## 🔑 Provider Credentials

### Telegram
| Field | Value | Example |
|-------|-------|---------|
| Source | BotFather | @BotFather on Telegram |
| Token | API Token | `123456:ABC-DEF1234...` |
| Location | bot_token | `webhook_configs.telegram.bot_token` |

### WhatsApp - Twilio
| Field | Value | Example |
|-------|-------|---------|
| Source | Twilio Console | https://twilio.com/console |
| Phone | Twilio Number | `+1 (234) 567-8900` |
| Account SID | Account ID | `AC...` |
| Auth Token | API Password | `auth_token_here` |
| Location | `api_token` (format: `SID:TOKEN`) | `webhook_configs.whatsapp.api_token` |

### WhatsApp - Meta
| Field | Value | Example |
|-------|-------|---------|
| Source | Meta Developers | https://developers.facebook.com |
| Phone | WhatsApp Bus Phone | `+1 (234) 567-8900` |
| Phone ID | WhatsApp Phone ID | `1234567890` |
| API Token | Graph API Token | `EAA...` |
| Location | `api_token` (format: `ID:TOKEN`) | `webhook_configs.whatsapp.api_token` |

### Instagram
| Field | Value | Example |
|-------|-------|---------|
| Source | Meta Developers | https://developers.facebook.com |
| Bus Account ID | Business Account | `17841...` |
| API Token | Graph API Token | `EAA...` |
| Location | In two places | `webhook_configs.instagram` |

---

## 🚀 Deployment Checklist

### Initial Setup (First Time)
- [ ] Run database migration: `db/006_ca_add_webhook_configs.sql`
- [ ] Install dependencies for both frontend and backend
- [ ] Start full stack & ngrok tunnel: `python run_all.py` (from project root)
- [ ] Get Telegram token from BotFather

### Add Telegram
- [ ] Create bot on BotFather
- [ ] Copy token
- [ ] Create/update agent with token in `webhook_configs.telegram.bot_token`
- [ ] Send test message to bot

### Add WhatsApp (Twilio)
- [ ] Create Twilio account
- [ ] Set up WhatsApp Sandbox
- [ ] Copy: Account SID, Auth Token, Phone Number
- [ ] Create/update agent with credentials in `webhook_configs.whatsapp`
- [ ] Send test message

### Add WhatsApp (Meta)
- [ ] Create Meta Business Account
- [ ] Create WhatsApp Business App
- [ ] Get: Phone Number ID, API Token
- [ ] Create/update agent with credentials
- [ ] Send test message

### Add Instagram
- [ ] Create Meta Business Account (can be same as WhatsApp)
- [ ] Link Instagram Business Account
- [ ] Get: Business Account ID, API Token
- [ ] Create/update agent with credentials
- [ ] Send test DM

---

## 💬 API Contract

### Create Agent with Multi-Channel Config

**Request:**
```json
{
  "name": "Support Bot",
  "system_prompt": "You are a helpful support agent...",
  "webhook_configs": {
    "telegram": {
      "enabled": true,
      "bot_token": "123456:ABC-DEF1234..."
    },
    "whatsapp": {
      "enabled": true,
      "phone_number": "+1234567890",
      "api_token": "ACCOUNT_SID:AUTH_TOKEN",
      "provider": "twilio"
    },
    "instagram": {
      "enabled": false,
      "business_account_id": null,
      "api_token": null
    }
  }
}
```

**Response:**
```json
{
  "id": "uuid-here",
  "name": "Support Bot",
  "system_prompt": "You are a helpful support agent...",
  "webhook_configs": { /* same as request */ },
  "status": "idle"
}
```

---

## 📊 Message Flow Example

### Telegram Example
```
User → Sends message to @my_bot on Telegram
Telegram → POST /v1/telegram/agent_uuid
  Body: {
    "message": {
      "text": "Hello!",
      "chat": { "id": 123456 }
    }
  }
Backend → Parses message
ChatAgent → LLM generates response
Backend → Sends back via Telegram API
User ← Receives: "Hi! How can I help?"
```

### WhatsApp (Twilio) Example
```
User → Sends message to Twilio number
Twilio → POST /v1/whatsapp/agent_uuid
  Body: {
    "From": "whatsapp:+1234567890",
    "Body": "Hello!"
  }
Backend → Recognizes Twilio format
Backend → Sends response to Twilio API
Twilio → Forwards to user's phone
User ← Receives: "Hi! How can I help?"
```

### Instagram Example
```
User → Sends DM on Instagram
Meta → POST /v1/instagram/agent_uuid
  Body: {
    "entry": [{
      "messaging": [{
        "sender": { "id": "123456" },
        "message": { "text": "Hello!" }
      }]
    }]
  }
Backend → Parses Meta format, verifies signature
ChatAgent → LLM generates response
Backend → Sends via Instagram API
User ← Receives: "Hi! How can I help?"
```

---

## 🔐 Webhook Setup

### For Local Development
Simply start the project with: `python run_all.py`
This automated orchestrator will:
1. Start the FastAPI backend and React frontend
2. Create an **Ngrok** tunnel mapping to port 8000
3. Auto-detect the `public_url` and update your backend `.env`
4. Automatically iterate your agents and hit Telegram APIs to set your webhooks dynamically

### For Production
You don't need Ngrok or `run_all.py`. You only need to:
1. Deploy the backend to a secure `https://` domain
2. Ensure `WEBHOOK_DOMAIN=https://your-production-domain.com` is in your server's `.env`
3. Set the Telegram/Twilio/Meta webhook configurations to point to your new production endpoints.

---

## ❌ Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Agent not responding | chat_messages table missing | Run migration SQL |
| 404 on webhook | Agent ID wrong | Check agent UUID |
| 403 token error | Invalid/expired token | Regenerate token from provider |
| Message not saved | DB error | Check database connection |
| Ngrok session expires | Tunnel closed | Restart `python run_all.py` |

---

## 📞 Support

**Test Channel with curl:**
```bash
# Telegram test
curl -X POST http://localhost:8000/v1/telegram/AGENT_UUID \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "text": "Hello!",
      "chat": { "id": 123 }
    }
  }'
```

**Check Agent Status:**
- API: `GET /v1/agents/<agent_id>`
- Should return full agent with webhook_configs

**View Recent Messages:**
- Database: `SELECT * FROM chat_messages WHERE agent_id = '<agent_id>' ORDER BY created_at DESC LIMIT 10;`

---

## 🎯 Next Steps

1. ✅ Run database migration
2. ✅ Start backend server  
3. ✅ Get Telegram token
4. ✅ Create test agent
5. ✅ Send test message
6. ⏳ (Optional) Add WhatsApp/Instagram

Then you're ready for production! 🚀

