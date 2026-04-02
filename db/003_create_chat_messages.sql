-- =====================================================
-- Migration: Create chat_messages table
-- Stores individual messages within chat interactions
-- =====================================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,        -- 'customer', 'agent', 'supervisor'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to interactions
    CONSTRAINT fk_chat_messages_interaction 
        FOREIGN KEY (interaction_id) 
        REFERENCES interactions(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_role 
        CHECK (role IN ('customer', 'agent', 'supervisor'))
);

-- Indexes for efficient queries
CREATE INDEX idx_chat_messages_interaction ON chat_messages(interaction_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(interaction_id, created_at);

COMMENT ON TABLE chat_messages IS 'Stores individual chat messages within interactions. M:1 relationship with interactions.';
COMMENT ON COLUMN chat_messages.role IS 'Message sender: customer, agent (AI), or supervisor (whisper injection)';
