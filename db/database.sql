-- =====================================================
-- Database Schema
-- Customer Service AI Agents Platform
-- =====================================================
-- Complete database schema based on ERD diagram
-- Run this file in Supabase SQL Editor to create all tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM Types
-- =====================================================

-- Supervisor type enum
CREATE TYPE supervisor_type_enum AS ENUM ('voice', 'chat');

-- Agent type enum
CREATE TYPE agent_type_enum AS ENUM ('voice', 'chat');

-- Agent status enum
CREATE TYPE agent_status_enum AS ENUM ('idle', 'in_call', 'in_chat', 'paused');

-- Interaction type enum
CREATE TYPE interaction_type_enum AS ENUM ('voice', 'chat');

-- Interaction status enum
CREATE TYPE interaction_status_enum AS ENUM ('active', 'completed', 'failed');

-- Sentiment enum
CREATE TYPE sentiment_enum AS ENUM ('good', 'neutral', 'critical');

-- Tool permission status enum
CREATE TYPE tool_permission_status_enum AS ENUM ('pending', 'allowed', 'denied', 'expired', 'completed');

-- =====================================================
-- Tables
-- =====================================================

-- Supervisors table
-- Stores supervisor user information (1:1 with auth.users)
CREATE TABLE supervisors (
    "userID" UUID PRIMARY KEY,
    supervisor_type supervisor_type_enum NOT NULL,
    performance_score DOUBLE PRECISION DEFAULT 0.0,
    total_interactions INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to auth.users (Supabase Auth table)
    CONSTRAINT fk_supervisors_user 
        FOREIGN KEY ("userID") 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_performance_score 
        CHECK (performance_score >= 0.0 AND performance_score <= 100.0),
    CONSTRAINT chk_total_interactions 
        CHECK (total_interactions >= 0)
);

-- Admin table
-- Stores administrator user information (1:1 with auth.users)
CREATE TABLE admin (
    "userID" UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to auth.users (Supabase Auth table)
    CONSTRAINT fk_admin_user 
        FOREIGN KEY ("userID") 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE
);

-- Agents table
-- Stores AI agent configurations (M:1 with supervisors)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervisor_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    agent_type agent_type_enum NOT NULL,
    system_prompt TEXT NOT NULL,
    status agent_status_enum NOT NULL DEFAULT 'idle',
    mcp_tools JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to supervisors
    CONSTRAINT fk_agents_supervisor 
        FOREIGN KEY (supervisor_id) 
        REFERENCES supervisors("userID") 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_agent_name_length 
        CHECK (LENGTH(name) > 0 AND LENGTH(name) <= 255)
);

-- Agent tools table
-- Stores tool configurations for agents (M:1 with agents)
CREATE TABLE agent_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    tool_config JSONB DEFAULT '{}'::jsonb,
    requires_permission BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to agents
    CONSTRAINT fk_agent_tools_agent 
        FOREIGN KEY (agent_id) 
        REFERENCES agents(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_tool_name_length 
        CHECK (LENGTH(tool_name) > 0 AND LENGTH(tool_name) <= 255)
);

-- Agent Analytics table
-- Stores aggregated analytics per agent (1:1 with agents)
CREATE TABLE agent_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL UNIQUE,
    csat_score DOUBLE PRECISION,
    resolution_time_sec INTEGER,
    fcr_status BOOLEAN,
    
    -- Foreign key to agents
    CONSTRAINT fk_agent_analytics_agent 
        FOREIGN KEY (agent_id) 
        REFERENCES agents(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_csat_score 
        CHECK (csat_score IS NULL OR (csat_score >= 0.0 AND csat_score <= 100.0)),
    CONSTRAINT chk_resolution_time 
        CHECK (resolution_time_sec IS NULL OR resolution_time_sec >= 0)
);

-- Interactions table
-- Stores call/chat interaction records (M:1 with agents)
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    phone_number VARCHAR(50),
    interaction_type interaction_type_enum NOT NULL,
    status interaction_status_enum NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    summary TEXT,
    issues JSONB,
    tags JSONB,
    call_source_ID VARCHAR(255),
    
    -- Foreign key to agents
    CONSTRAINT fk_interactions_agent 
        FOREIGN KEY (agent_id) 
        REFERENCES agents(id) 
        ON DELETE RESTRICT,
    
    -- Constraints
    CONSTRAINT chk_interaction_dates 
        CHECK (end_at IS NULL OR end_at >= started_at),
    CONSTRAINT chk_phone_number_length 
        CHECK (phone_number IS NULL OR LENGTH(phone_number) <= 50)
);

-- Real-time metrics table
-- Stores real-time metrics during interactions (1:1 with interactions)
CREATE TABLE realtime_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL,
    sentiment sentiment_enum NOT NULL,
    satisfaction_score DOUBLE PRECISION NOT NULL,
    feed_text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to interactions
    CONSTRAINT fk_realtime_metrics_interaction 
        FOREIGN KEY (interaction_id) 
        REFERENCES interactions(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_satisfaction_score 
        CHECK (satisfaction_score >= 0.0 AND satisfaction_score <= 100.0),
    CONSTRAINT chk_feed_text_length 
        CHECK (LENGTH(feed_text) > 0)
);

-- Tool permissions table
-- Stores tool permission requests and responses (M:1 with interactions)
CREATE TABLE tool_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    supervisor_response VARCHAR(20),
    responded_at TIMESTAMPTZ,
    status tool_permission_status_enum NOT NULL DEFAULT 'pending',
    
    -- Foreign key to interactions
    CONSTRAINT fk_tool_permissions_interaction 
        FOREIGN KEY (interaction_id) 
        REFERENCES interactions(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_tool_name_length 
        CHECK (LENGTH(tool_name) > 0 AND LENGTH(tool_name) <= 255),
    CONSTRAINT chk_supervisor_response 
        CHECK (supervisor_response IS NULL OR supervisor_response IN ('allowed', 'denied')),
    CONSTRAINT chk_responded_at 
        CHECK (responded_at IS NULL OR (supervisor_response IS NOT NULL AND responded_at IS NOT NULL))
);

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE supervisors IS 'Stores supervisor user information. 1:1 relationship with auth.users';
COMMENT ON TABLE admin IS 'Stores administrator user information. 1:1 relationship with auth.users';
COMMENT ON TABLE agents IS 'Stores AI agent configurations. M:1 relationship with supervisors';
COMMENT ON TABLE agent_tools IS 'Stores tool configurations for agents. M:1 relationship with agents';
COMMENT ON TABLE agent_analytics IS 'Stores aggregated analytics per agent. 1:1 relationship with agents';
COMMENT ON TABLE interactions IS 'Stores call/chat interaction records. M:1 relationship with agents';
COMMENT ON TABLE realtime_metrics IS 'Stores real-time metrics during interactions. 1:1 relationship with interactions';
COMMENT ON TABLE tool_permissions IS 'Stores tool permission requests and responses. M:1 relationship with interactions';

COMMENT ON COLUMN supervisors."userID" IS 'Primary key and foreign key referencing auth.users.id';
COMMENT ON COLUMN admin."userID" IS 'Primary key and foreign key referencing auth.users.id';
COMMENT ON COLUMN agents.supervisor_id IS 'Foreign key referencing supervisors.userID';
COMMENT ON COLUMN agent_tools.agent_id IS 'Foreign key referencing agents.id';
COMMENT ON COLUMN agent_analytics.agent_id IS 'Foreign key referencing agents.id (1:1 relationship)';
COMMENT ON COLUMN interactions.agent_id IS 'Foreign key referencing agents.id';
COMMENT ON COLUMN interactions.call_source_ID IS 'Identifier for call source: chat: chatID, voice: livekit_room_id';
COMMENT ON COLUMN realtime_metrics.interaction_id IS 'Foreign key referencing interactions.id';
COMMENT ON COLUMN tool_permissions.interaction_id IS 'Foreign key referencing interactions.id';

