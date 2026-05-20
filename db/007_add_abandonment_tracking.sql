-- =====================================================
-- Migration: Add abandonment tracking to interactions
-- =====================================================
-- Tracks calls where the customer disconnected before
-- meaningful agent engagement (no transcript generated,
-- or call duration < 30 seconds with no agent response).
--
-- Usage:
--   Abandonment Rate (%) = COUNT(is_abandoned=true) / COUNT(interaction_type='voice') × 100
--
-- Voice agent sets this flag in _handle_post_call() when:
--   1. transcript_lines is empty (no conversation happened), OR
--   2. call duration < 30 seconds AND no agent reply was recorded
-- =====================================================

ALTER TABLE interactions ADD COLUMN IF NOT EXISTS is_abandoned BOOLEAN DEFAULT false;

-- Index for efficient abandonment rate queries
CREATE INDEX IF NOT EXISTS idx_interactions_abandoned
    ON interactions(is_abandoned) WHERE is_abandoned = true;

COMMENT ON COLUMN interactions.is_abandoned IS 'True if customer disconnected before meaningful agent engagement. Set by voice agent post-call processing.';
