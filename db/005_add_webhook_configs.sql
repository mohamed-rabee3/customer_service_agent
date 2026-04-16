-- =====================================================
-- Migration: Add multi-channel webhook support
-- Adds support for Telegram, WhatsApp, and Instagram
-- =====================================================

-- 1. Add webhook_configs JSONB column with default structure
ALTER TABLE agents ADD COLUMN IF NOT EXISTS webhook_configs JSONB DEFAULT '{
  "telegram": { "enabled": false, "bot_token": null },
  "whatsapp": { "enabled": false, "phone_number": null, "api_token": null, "provider": null },
  "instagram": { "enabled": false, "business_account_id": null, "api_token": null }
}'::jsonb;

-- 2. Migrate existing telegram_bot_token to webhook_configs
UPDATE agents 
SET webhook_configs = jsonb_set(
  webhook_configs, 
  '{telegram,bot_token}', 
  to_jsonb(telegram_bot_token)
) 
WHERE telegram_bot_token IS NOT NULL;

-- 3. Mark telegram as enabled if token exists
UPDATE agents 
SET webhook_configs = jsonb_set(
  webhook_configs, 
  '{telegram,enabled}', 
  'true'::jsonb
) 
WHERE telegram_bot_token IS NOT NULL;

-- 4. Create index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_agents_webhook_configs ON agents USING GIN (webhook_configs);

-- 5. Optional: Add source_channel to interactions table
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS source_channel VARCHAR(20);

-- Add constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'interactions' AND constraint_name = 'chk_source_channel'
  ) THEN
    ALTER TABLE interactions ADD CONSTRAINT chk_source_channel 
      CHECK (source_channel IN ('telegram', 'whatsapp', 'instagram'));
  END IF;
END $$;

-- 6. Create index on source_channel
CREATE INDEX IF NOT EXISTS idx_interactions_source_channel ON interactions(source_channel);

-- =====================================================
-- Verification queries (run these to verify migration)
-- =====================================================

-- Check if webhook_configs exist and are populated
-- SELECT id, name, telegram_bot_token, webhook_configs FROM agents LIMIT 5;

-- Check if source_channel column exists
-- SELECT column_name FROM information_schema.columns WHERE table_name='interactions' AND column_name='source_channel';
