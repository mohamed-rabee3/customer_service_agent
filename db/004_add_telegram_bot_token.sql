-- Add telegram_bot_token column to agents table
ALTER TABLE agents ADD COLUMN telegram_bot_token VARCHAR(255);
