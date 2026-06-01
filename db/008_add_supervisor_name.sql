-- Add supervisor display name (mirrors Supabase Auth user_metadata.name)
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT '' NOT NULL;

COMMENT ON COLUMN supervisors.name IS 'Supervisor display name; synced with auth.users user_metadata.name';
