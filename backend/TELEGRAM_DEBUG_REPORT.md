# 🔍 Telegram Agent Debug Report - April 14, 2026

## ❌ PROBLEM IDENTIFIED

You created an "aht agent" with a Telegram token, but **the token was NOT saved to the database**. This is why no responses are coming from Telegram.

## 📊 CURRENT DATABASE STATE

**Total Agents:** 8  
**Agents with Telegram configured:** 0 ❌

### All Agents (No tokens):
1. Chat Agent Beta (chat)
2. Ahmed (chat)
3. Agent A1 (voice)
4. Permanent Agent (chat)
5. Permanent Agent (chat)
6. Agent A1 (voice)
7. Voice Agent Alpha (voice)
8. Sales Assistant Bot v2 (voice)

## 🔧 HOW TO FIX

### Step 1: Get Your Telegram Bot Token
1. Open Telegram and search for **@BotFather**
2. Send `/start` and follow instructions
3. Send `/newbot` if creating a new bot, or `/token` if already created
4. Copy your bot token (format: `123456789:ABCdefGHIjklmnoPQRstuvWXYZ`)

### Step 2: Update Agent with Token
Run this command in terminal:

```bash
cd backend
.\venv\Scripts\python.exe update_telegram_token.py 1 YOUR_BOT_TOKEN_HERE
```

Replace:
- `1` with your agent number (see list above)
- `YOUR_BOT_TOKEN_HERE` with your actual Telegram bot token

**Example:**
```bash
.\venv\Scripts\python.exe update_telegram_token.py 1 123456789:ABCdefGHIjklmnoPQRstuvWXYZ
```

### Step 3: Configure Webhook in BotFather
1. In Telegram, go back to **@BotFather**
2. Select your bot
3. Send `/setwebhook`
4. Enter your webhook URL:
   ```
   https://your-domain.com/api/v1/telegram/webhook/{AGENT_ID}
   ```
   Replace `{AGENT_ID}` with the agent ID (will be shown after Step 2)
   
   **Example:**
   ```
   https://yourdomain.com/api/v1/telegram/webhook/8c7ab36a-7efc-4b61-a1c3-847da073d229
   ```

⚠️ **IMPORTANT:** 
- Domain MUST be HTTPS (Telegram requires it)
- Domain must be publicly accessible
- Cannot use localhost or internal IPs

### Step 4: Test the Connection
1. Send a test message to your Telegram bot
2. Check backend logs for incoming webhook events
3. You should see: `📥 Received Telegram webhook request for agent [ID]`

## 📋 VERIFICATION

After completing steps 1-3, run:

```bash
.\venv\Scripts\python.exe check_telegram_agents.py
```

You should see your agent listed as **"✅ AGENTS WITH TELEGRAM TOKEN"**

## 🐛 TROUBLESHOOTING

### No responses from Telegram:
1. Run `debug_telegram_config.py` to see actual database values
2. Verify token is set: `telegram_bot_token` column should have value
3. Verify `webhook_configs.telegram.enabled` = true
4. Check backend logs for errors:
   - "Agent does not have a telegram bot token"
   - "Invalid Telegram payload"

### Webhook not receiving messages:
1. Verify HTTPS domain is working: `curl https://your-domain.com/api/v1/health`
2. Check BotFather: `/getwebhook` to see current webhook
3. Test webhook: `/testwebhook`
4. Proxy or firewall blocking? Check logs for connection attempts

### Database update failed:
1. Verify Supabase connection: Check `.env` file
2. Check agent UUID is correct
3. Try manual SQL update:
   ```sql
   UPDATE agents 
   SET telegram_bot_token = 'YOUR_TOKEN',
       webhook_configs = '{
         "telegram": {"enabled": true, "bot_token": "YOUR_TOKEN"},
         "whatsapp": {"enabled": false},
         "instagram": {"enabled": false}
       }'::jsonb
   WHERE id = 'AGENT_ID';
   ```

## 📞 AVAILABLE DEBUGGING SCRIPTS

```bash
# List all agents
.\venv\Scripts\python.exe list_agents.py

# Check Telegram configuration
.\venv\Scripts\python.exe check_telegram_agents.py

# Detailed debug report
.\venv\Scripts\python.exe debug_telegram_config.py

# Update a telegram token
.\venv\Scripts\python.exe update_telegram_token.py <agent_num> <token>

# Check database structure
.\venv\Scripts\python.exe check_db_schema.py
```

## 📝 KEY FACTS

- **Webhook Endpoint:** `/api/v1/telegram/webhook/{agent_id}`
- **Database Storage:** `agents.telegram_bot_token` and `agents.webhook_configs`
- **Session Management:** Uses `interactions` table to track active chats
- **Message Flow:** Telegram → Webhook → Agent → Response → Telegram

---

**Report Generated:** April 14, 2026  
**Status:** Database fully examined, root cause identified, fix scripts created
