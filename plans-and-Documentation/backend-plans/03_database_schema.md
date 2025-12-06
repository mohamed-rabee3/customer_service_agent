# Database Schema

## Overview

The database uses **PostgreSQL** via **Supabase** with the following key tables:

---

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ Uid (PK)        |
| Display name    │
│ Email           │
| password        |◄────┐
│ created_at      │     │
└─────────────────┘     │
                        │
                        │ FK: user_id
        ┌───────────────┴──────────────────┐
        │                                  │
┌───────┴──────────┐              ┌────────┴────────┐
│   supervisors    │              │     admins      │
│──────────────────│              │─────────────────│
│ id (PK)          │              │ id (PK)         │
│ user_id (FK)     │              │ user_id (FK)    │
│                  │              │ created_at      │
│ supervisor_type  │              └─────────────────┘
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │
         │ FK: supervisor_id (where role='supervisor')
         │
┌────────┴─────────┐
│     agents       │
│──────────────────│
│ id (PK)          │
│ supervisor_id(FK)│
│ name             │
│ agent_type       │
│ system_prompt    │
│ mcp_tools (JSON) │
│ status           │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │
         │ FK: agent_id
         │
┌────────┴──────────────┐
│   interactions        │
│───────────────────────│
│ id (PK)               │
│ agent_id (FK)         │
│ phone_number          │
│ interaction_type      │
│ livekit_room_id       │
│ status                │
│ started_at            │
│ ended_at              │
│ duration_seconds      │
│ created_at            │
└───────┬───────────────┘
        │
        │ FK: interaction_id
        │
┌───────┴────────────────┐
│  interaction_archives  │
│────────────────────────│
│ id (PK)                │
│ interaction_id (FK)    │
│ summary                │
│ issues (JSON)          │
│ tags (JSON)            │
│ csat_score             │
│ resolution_time_sec    │
│ fcr_status             │
│ created_at             │
└────────────────────────┘

┌──────────────────────┐
│  realtime_metrics    │
│──────────────────────│
│ id (PK)              │
│ interaction_id (FK)  │
│ timestamp            │
│ sentiment            │
│ satisfaction_score   │
│ feed_text            │
│ created_at           │
└──────────────────────┘

┌────────────────────────┐
│  tool_permissions      │
│────────────────────────│
│ id (PK)                │
│ interaction_id (FK)    │
│ tool_name              │
│ requested_at           │
│ supervisor_response    │
│ responded_at           │
│ status                 │
└────────────────────────┘

┌──────────────────┐
│   agent_tools    │
│──────────────────│
│ id (PK)          │
│ agent_id (FK)    │
│ tool_name        │
│ tool_config(JSON)│
│ requires_permission │
│ created_at       │
└──────────────────┘


```

---

## Table Definitions

### 1. users

Managed by **Supabase Auth**. Extended with custom role and profile information for both admins and supervisors.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor')),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,  -- NULL for admins, required for supervisors
    supervisor_type VARCHAR(20) CHECK (supervisor_type IN ('voice', 'chat')),  -- NULL for admins, required for supervisors
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints: Supervisors must have username and supervisor_type, admins must not
ALTER TABLE users ADD CONSTRAINT check_supervisor_fields 
    CHECK (
        (role = 'supervisor' AND username IS NOT NULL AND supervisor_type IS NOT NULL) OR
        (role = 'admin' AND username IS NULL AND supervisor_type IS NULL)
    );

-- Unique username only for supervisors
CREATE UNIQUE INDEX idx_users_username_supervisor 
    ON users(username) WHERE role = 'supervisor';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_supervisor_type ON users(supervisor_type) WHERE supervisor_type IS NOT NULL;
```

**Columns:**
- `id`: UUID primary key (auto-generated)
- `email`: User email (unique)
- `role`: Either 'admin' or 'supervisor'
- `name`: Display name (required for both admins and supervisors)
- `username`: Unique username for display in UI (cards, leaderboards) - NULL for admins, required for supervisors. NOT used for login
- `supervisor_type`: 'voice' or 'chat' - NULL for admins, required for supervisors
- `created_at`: Account creation timestamp
- `updated_at`: Last modification timestamp

**Constraints:**
- Supervisors must have `username` and `supervisor_type` (both NOT NULL)
- Admins must have `username` and `supervisor_type` as NULL
- Username must be unique across all supervisors
- Supervisor type must be 'voice' or 'chat' when role is 'supervisor'

---

### 2. agents

AI agent configurations.

```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('voice', 'chat')),
    system_prompt TEXT NOT NULL,
    mcp_tools JSONB,
    status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'in_call', 'in_chat', 'paused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_supervisor_role CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = supervisor_id AND role = 'supervisor')
    )
);

CREATE INDEX idx_agents_supervisor_id ON agents(supervisor_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(agent_type);
```

**Columns:**
- `id`: UUID primary key
- `supervisor_id`: References users table where role='supervisor' (CASCADE delete)
- `name`: Agent display name
- `agent_type`: 'voice' or 'chat' (must match supervisor type)
- `system_prompt`: Instructions for agent behavior (LLM system message)
- `mcp_tools`: JSON configuration for MCP tools
- `status`: Current agent status ('idle', 'in_call', 'in_chat', 'paused')
- `created_at`: Agent creation timestamp
- `updated_at`: Last configuration update timestamp

**MCP Tools JSON Structure:**
```json
{
  "tools": [
    {
      "name": "get_customer_details",
      "description": "Fetch customer account information",
      "requires_permission": true,
      "config": {
        "endpoint": "https://api.example.com/customers",
        "auth_type": "bearer"
      }
    },
    {
      "name": "check_account_status",
      "description": "Check customer account status",
      "requires_permission": false,
      "config": {
        "endpoint": "https://api.example.com/status"
      }
    }
  ]
}
```

**Constraints:**
- Maximum 3 agents per supervisor (enforced in application logic)
- Agent type must match supervisor type

---

### 5. interactions

Active and historical call/chat records.

```sql
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('voice', 'chat')),
    livekit_room_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_agent_id ON interactions(agent_id);
CREATE INDEX idx_interactions_phone_number ON interactions(phone_number);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_started_at ON interactions(started_at DESC);
```

**Columns:**
- `id`: UUID primary key
- `agent_id`: References agents table
- `phone_number`: Customer phone number (asked by agent)
- `interaction_type`: 'voice' or 'chat'
- `livekit_room_id`: LiveKit room identifier
- `status`: 'active', 'completed', or 'failed'
- `started_at`: Interaction start timestamp
- `ended_at`: Interaction end timestamp (NULL if active)
- `duration_seconds`: Total duration in seconds
- `created_at`: Record creation timestamp

**Note:** Phone number is collected by agent during conversation

---

### 6. interaction_archives

Post-call/chat analysis and metrics.

```sql
CREATE TABLE interaction_archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    issues JSONB,
    tags JSONB,
    csat_score DECIMAL(5,2) CHECK (csat_score >= 0 AND csat_score <= 100),
    resolution_time_seconds INTEGER,
    fcr_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(interaction_id)
);

CREATE INDEX idx_archives_interaction_id ON interaction_archives(interaction_id);
CREATE INDEX idx_archives_created_at ON interaction_archives(created_at DESC);
CREATE INDEX idx_archives_fcr_status ON interaction_archives(fcr_status);
```

**Columns:**
- `id`: UUID primary key
- `interaction_id`: References interactions table (one-to-one)
- `summary`: AI-generated text summary
- `issues`: JSON array of issues encountered
- `tags`: JSON array of categorization tags
- `csat_score`: Post-call satisfaction (0-100%)
- `resolution_time_seconds`: Time to resolution
- `fcr_status`: First Contact Resolution flag (TRUE if resolved)
- `created_at`: Archive creation timestamp

**Issues JSON Structure:**
```json
[
  {
    "issue": "Payment failed",
    "status": "resolved",
    "priority": "high"
  },
  {
    "issue": "Account access",
    "status": "unresolved",
    "priority": "medium"
  }
]
```

**Tags JSON Structure:**
```json
{
  "topics": ["billing", "technical_support"],
  "sentiment": "neutral",
  "issues": [
    {
      "tag": "payment_failed",
      "status": "resolved"
    },
    {
      "tag": "account_locked",
      "status": "unresolved"
    }
  ]
}
```

---

### 7. realtime_metrics

Real-time sentiment, satisfaction, and feed during interactions.

```sql
CREATE TABLE realtime_metrics (
    id BIGSERIAL PRIMARY KEY,
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    sentiment VARCHAR(20) CHECK (sentiment IN ('good', 'neutral', 'critical')),
    satisfaction_score DECIMAL(5,2) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
    feed_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_realtime_metrics_interaction_id ON realtime_metrics(interaction_id);
CREATE INDEX idx_realtime_metrics_timestamp ON realtime_metrics(timestamp DESC);
```

**Columns:**
- `id`: Auto-increment primary key
- `interaction_id`: References interactions table
- `timestamp`: Metric capture time
- `sentiment`: 'good', 'neutral', or 'critical'
- `satisfaction_score`: Real-time satisfaction (0-100%)
- `feed_text`: Short conversation summary sentence
- `created_at`: Record creation timestamp

**Usage:**
- New record inserted every 5 seconds during active interaction
- Retrieved by supervisor dashboard via SSE
- Deleted after interaction completion (optional retention)

---

### 8. tool_permissions

Track tool permission requests and supervisor responses.

```sql
CREATE TABLE tool_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    tool_description TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    supervisor_response VARCHAR(20) CHECK (supervisor_response IN ('allowed', 'denied', 'timeout')),
    responded_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'allowed', 'denied', 'timeout')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_permissions_interaction_id ON tool_permissions(interaction_id);
CREATE INDEX idx_tool_permissions_status ON tool_permissions(status);
CREATE INDEX idx_tool_permissions_requested_at ON tool_permissions(requested_at DESC);
```

**Columns:**
- `id`: UUID primary key
- `interaction_id`: References interactions table
- `tool_name`: Name of the tool requesting permission
- `tool_description`: Description of what the tool will do
- `requested_at`: Permission request timestamp
- `supervisor_response`: 'allowed', 'denied', or 'timeout'
- `responded_at`: Supervisor response timestamp
- `status`: Current status ('pending', 'allowed', 'denied', 'timeout')
- `created_at`: Record creation timestamp

**Permission Flow:**
1. Agent requests tool → Record created with status='pending'
2. Supervisor responds → Update status and supervisor_response
3. After 6 minutes with no response → Update status='timeout'

---

### 9. agent_tools

Predefined tools for each agent from MCP configuration.

```sql
CREATE TABLE agent_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    tool_config JSONB,
    requires_permission BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(agent_id, tool_name)
);

CREATE INDEX idx_agent_tools_agent_id ON agent_tools(agent_id);
CREATE INDEX idx_agent_tools_requires_permission ON agent_tools(requires_permission);
```

**Columns:**
- `id`: UUID primary key
- `agent_id`: References agents table
- `tool_name`: Unique tool identifier
- `tool_config`: JSON configuration for tool
- `requires_permission`: Whether supervisor approval is needed
- `created_at`: Tool creation timestamp

**Tool Config JSON Structure:**
```json
{
  "endpoint": "https://api.example.com/action",
  "method": "POST",
  "auth_type": "bearer",
  "params": {
    "timeout": 30,
    "retry_count": 3
  }
}
```

---

## Analytics Views (Optional for Performance)

### Supervisor Performance View

```sql
CREATE OR REPLACE VIEW supervisor_performance AS
SELECT 
    u.id AS supervisor_id,
    u.name AS supervisor_name,
    u.supervisor_type,
    COUNT(DISTINCT a.id) AS total_agents,
    COUNT(DISTINCT i.id) AS total_interactions,
    COUNT(DISTINCT CASE WHEN i.status = 'active' THEN i.id END) AS active_interactions,
    AVG(ia.csat_score) AS avg_csat,
    AVG(ia.resolution_time_seconds) AS avg_resolution_time,
    COUNT(CASE WHEN ia.fcr_status = TRUE THEN 1 END)::FLOAT / 
        NULLIF(COUNT(ia.id), 0) * 100 AS fcr_percentage
FROM users u
LEFT JOIN agents a ON u.id = a.supervisor_id
LEFT JOIN interactions i ON a.id = i.agent_id
LEFT JOIN interaction_archives ia ON i.id = ia.interaction_id
WHERE u.role = 'supervisor'
GROUP BY u.id, u.name, u.supervisor_type;
```

### Agent Performance View

```sql
CREATE OR REPLACE VIEW agent_performance AS
SELECT 
    a.id AS agent_id,
    a.name AS agent_name,
    a.supervisor_id,
    a.status,
    COUNT(i.id) AS total_interactions,
    AVG(ia.csat_score) AS avg_csat,
    AVG(i.duration_seconds) AS avg_handle_time,
    COUNT(CASE WHEN ia.fcr_status = TRUE THEN 1 END)::FLOAT / 
        NULLIF(COUNT(ia.id), 0) * 100 AS fcr_percentage
FROM agents a
LEFT JOIN interactions i ON a.id = i.agent_id AND i.status = 'completed'
LEFT JOIN interaction_archives ia ON i.id = ia.interaction_id
GROUP BY a.id, a.name, a.supervisor_id, a.status;
```

---

## Row-Level Security (RLS) Policies

Enable RLS on all tables and create policies:

### Supervisors Access (Own Data Only)

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_archives ENABLE ROW LEVEL SECURITY;

-- Supervisors can only see their own profile
CREATE POLICY supervisor_own_profile ON users
FOR ALL USING (
    id = auth.uid() AND role = 'supervisor'
);

-- Supervisors can see other supervisors' public info (for leaderboards) but not edit
CREATE POLICY supervisor_view_others ON users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'supervisor'
    ) AND role = 'supervisor'
);

-- Supervisors can only see their own agents
CREATE POLICY supervisor_own_agents ON agents
FOR ALL USING (
    supervisor_id = auth.uid()
);

-- Supervisors can only see interactions from their agents
CREATE POLICY supervisor_own_interactions ON interactions
FOR ALL USING (
    agent_id IN (
        SELECT a.id FROM agents a
        WHERE a.supervisor_id = auth.uid()
    )
);
```

### Admins Access (All Data)

```sql
-- Admins can access all user data
CREATE POLICY admin_all_users ON users
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can access all agents
CREATE POLICY admin_all_agents ON agents
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can access all interactions
CREATE POLICY admin_all_interactions ON interactions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
```

---

## Database Functions

### Update FCR Status (Trigger on New Interaction)

```sql
CREATE OR REPLACE FUNCTION update_fcr_on_followup()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if same customer called within 3 days with same issue
    UPDATE interaction_archives ia
    SET fcr_status = FALSE
    WHERE ia.interaction_id IN (
        SELECT i.id
        FROM interactions i
        JOIN interaction_archives ia2 ON i.id = ia2.interaction_id
        WHERE i.phone_number = NEW.phone_number
        AND i.started_at >= NEW.started_at - INTERVAL '3 days'
        AND i.started_at < NEW.started_at
        AND i.id != NEW.id
        AND EXISTS (
            -- Check for matching issue tags
            SELECT 1
            FROM jsonb_array_elements(ia2.tags->'issues') AS old_issue
            JOIN jsonb_array_elements(
                (SELECT tags->'issues' FROM interaction_archives WHERE interaction_id = NEW.id)
            ) AS new_issue
            ON old_issue->>'tag' = new_issue->>'tag'
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_fcr_on_new_interaction
AFTER INSERT ON interactions
FOR EACH ROW
EXECUTE FUNCTION update_fcr_on_followup();
```

### Calculate Performance Score

```sql
CREATE OR REPLACE FUNCTION calculate_performance_score(
    p_supervisor_id UUID,
    p_period VARCHAR DEFAULT 'month' -- 'today', 'month'
)
RETURNS DECIMAL AS $$
DECLARE
    v_csat_avg DECIMAL;
    v_total_calls INTEGER;
    v_avg_aht DECIMAL;
    v_normalized_calls DECIMAL;
    v_normalized_aht DECIMAL;
    v_performance_score DECIMAL;
    v_start_date TIMESTAMPTZ;
BEGIN
    -- Determine date range
    IF p_period = 'today' THEN
        v_start_date := DATE_TRUNC('day', NOW());
    ELSE
        v_start_date := DATE_TRUNC('month', NOW());
    END IF;
    
    -- Get metrics for supervisor's agents
    SELECT 
        AVG(ia.csat_score),
        COUNT(i.id),
        AVG(i.duration_seconds)
    INTO v_csat_avg, v_total_calls, v_avg_aht
    FROM agents a
    JOIN interactions i ON a.id = i.agent_id
    JOIN interaction_archives ia ON i.id = ia.interaction_id
    WHERE a.supervisor_id = p_supervisor_id
    AND i.started_at >= v_start_date
    AND i.status = 'completed';
    
    -- Normalize calls (0-1 scale)
    SELECT 
        CASE 
            WHEN MAX(call_count) - MIN(call_count) = 0 THEN 0
            ELSE (v_total_calls - MIN(call_count))::DECIMAL / 
                 (MAX(call_count) - MIN(call_count))
        END
    INTO v_normalized_calls
    FROM (
        SELECT a.supervisor_id, COUNT(i.id) AS call_count
        FROM agents a
        JOIN interactions i ON a.id = i.agent_id
        WHERE i.started_at >= v_start_date
        AND i.status = 'completed'
        GROUP BY a.supervisor_id
    ) subquery;
    
    -- Normalize AHT (inverted: lower is better)
    SELECT 
        CASE 
            WHEN MAX(avg_aht) - MIN(avg_aht) = 0 THEN 0
            ELSE 1 - ((v_avg_aht - MIN(avg_aht))::DECIMAL / 
                     (MAX(avg_aht) - MIN(avg_aht)))
        END
    INTO v_normalized_aht
    FROM (
        SELECT a.supervisor_id, AVG(i.duration_seconds) AS avg_aht
        FROM agents a
        JOIN interactions i ON a.id = i.agent_id
        WHERE i.started_at >= v_start_date
        AND i.status = 'completed'
        GROUP BY a.supervisor_id
    ) subquery;
    
    -- Calculate weighted performance score
    v_performance_score := 
        (0.5 * COALESCE(v_csat_avg, 0)) +
        (0.3 * COALESCE(v_normalized_calls, 0) * 100) +
        (0.2 * COALESCE(v_normalized_aht, 0) * 100);
    
    RETURN ROUND(v_performance_score, 2);
END;
$$ LANGUAGE plpgsql;
```

---

## Indexes for Performance

Additional indexes for common query patterns:

```sql
-- Composite indexes for dashboard queries
CREATE INDEX idx_interactions_agent_status 
ON interactions(agent_id, status, started_at DESC);

CREATE INDEX idx_interactions_phone_date 
ON interactions(phone_number, started_at DESC);

-- Archive search optimization
CREATE INDEX idx_archives_tags_gin 
ON interaction_archives USING GIN (tags);

CREATE INDEX idx_archives_issues_gin 
ON interaction_archives USING GIN (issues);

-- Realtime metrics cleanup
CREATE INDEX idx_realtime_metrics_cleanup 
ON realtime_metrics(created_at) 
WHERE created_at < NOW() - INTERVAL '24 hours';
```

---

## Data Retention & Cleanup

### Cleanup Old Realtime Metrics (Daily Job)

```sql
-- Delete realtime metrics older than 24 hours
DELETE FROM realtime_metrics 
WHERE created_at < NOW() - INTERVAL '24 hours';
```

### Archive Cleanup (Configurable)

```sql
-- Function to delete old archives based on retention period
CREATE OR REPLACE FUNCTION cleanup_old_archives(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM interaction_archives
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Run monthly
SELECT cleanup_old_archives(90); -- Keep last 90 days
```

---

## Migration Scripts

### Initial Setup

```sql
-- 1. Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- 2. Create tables (in order of dependencies)
-- Order: users → agents → interactions → archives/metrics

-- 3. Create indexes

-- 4. Create views

-- 5. Enable RLS and create policies

-- 6. Create functions and triggers
```

### Sample Data (Development)

```sql
-- Insert admin user
INSERT INTO users (email, role, name) 
VALUES ('admin@example.com', 'admin', 'System Admin');

-- Insert supervisor
INSERT INTO users (email, role, name, username, supervisor_type) 
VALUES ('supervisor1@example.com', 'supervisor', 'John Doe', 'johndoe', 'voice');

-- Insert agent
INSERT INTO agents (supervisor_id, name, agent_type, system_prompt, mcp_tools)
SELECT 
    id, 
    'Voice Agent 1', 
    'voice',
    'You are a helpful customer service agent...',
    '{"tools": [{"name": "get_customer", "requires_permission": true}]}'::jsonb
FROM users WHERE email = 'supervisor1@example.com';
```

---

## Backup & Recovery

### Automated Backups (Supabase)
- Automatic daily backups (Supabase handles this)
- Point-in-time recovery available
- Manual backups before major changes

### Manual Backup
```bash
# Export entire database
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Restore
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Performance Monitoring

### Slow Query Detection

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT 
    query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Table Sizes

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

This completes the database schema design. Next steps:
1. OpenAPI specification for all endpoints
2. Implementation plan with task breakdown
