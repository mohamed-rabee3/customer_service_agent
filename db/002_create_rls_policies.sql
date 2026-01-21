-- =====================================================
-- CREATE RLS POLICIES
-- Run this after enabling RLS to create all policies
-- =====================================================

-- First, drop any existing policies to avoid conflicts
DO $$
DECLARE
    r RECORD;
    tables TEXT[] := ARRAY['agents', 'supervisors', 'interactions', 'realtime_metrics', 'tool_permissions', 'agent_tools', 'agent_analytics', 'admin'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        FOR r IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name 
            AND schemaname = 'public'
        )
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, table_name);
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- POLICIES FOR SUPERVISORS (authenticated users)
-- =====================================================

-- Supervisors can access their own agents
CREATE POLICY "supervisors_own_data" ON agents
    FOR ALL 
    TO authenticated
    USING (supervisor_id = auth.uid()) 
    WITH CHECK (supervisor_id = auth.uid());

-- Supervisors can access their own interactions
CREATE POLICY "supervisors_own_interactions" ON interactions
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents a 
            WHERE a.id = interactions.agent_id 
            AND a.supervisor_id = auth.uid()
        )
    );

-- Supervisors can access their own realtime metrics
CREATE POLICY "supervisors_own_realtime_metrics" ON realtime_metrics
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM interactions i 
            WHERE i.id = realtime_metrics.interaction_id
            AND EXISTS (
                SELECT 1 FROM agents a 
                WHERE a.id = i.agent_id 
                AND a.supervisor_id = auth.uid()
            )
        )
    );

-- Supervisors can access their own tool permissions
CREATE POLICY "supervisors_own_tool_permissions" ON tool_permissions
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM interactions i 
            WHERE i.id = tool_permissions.interaction_id
            AND EXISTS (
                SELECT 1 FROM agents a 
                WHERE a.id = i.agent_id 
                AND a.supervisor_id = auth.uid()
            )
        )
    );

-- Supervisors can access their own agent tools
CREATE POLICY "supervisors_own_agent_tools" ON agent_tools
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents a 
            WHERE a.id = agent_tools.agent_id 
            AND a.supervisor_id = auth.uid()
        )
    );

-- Supervisors can access their own agent analytics
CREATE POLICY "supervisors_own_agent_analytics" ON agent_analytics
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents a 
            WHERE a.id = agent_analytics.agent_id 
            AND a.supervisor_id = auth.uid()
        )
    );

-- Supervisors can access their own supervisor record
CREATE POLICY "supervisors_own_supervisor_data" ON supervisors
    FOR ALL 
    TO authenticated
    USING ("userID" = auth.uid())
    WITH CHECK ("userID" = auth.uid());

-- =====================================================
-- POLICIES FOR ADMINS (authenticated users who are admins)
-- =====================================================

CREATE POLICY "admin_full_access_agents" ON agents 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM admin WHERE "userID" = auth.uid()));

CREATE POLICY "admin_full_access_interactions" ON interactions 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM admin WHERE "userID" = auth.uid()));

CREATE POLICY "admin_full_access_realtime_metrics" ON realtime_metrics 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM admin WHERE "userID" = auth.uid()));

CREATE POLICY "admin_full_access_tool_permissions" ON tool_permissions 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM admin WHERE "userID" = auth.uid()));

CREATE POLICY "admin_full_access_agent_tools" ON agent_tools 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM admin WHERE "userID" = auth.uid()));

CREATE POLICY "admin_full_access_agent_analytics" ON agent_analytics 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM admin WHERE "userID" = auth.uid()));

CREATE POLICY "admin_full_access_supervisors" ON supervisors 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM admin WHERE "userID" = auth.uid()));

-- Admin can read their own admin record (for role lookup during authentication)
CREATE POLICY "admin_own_admin_data" ON admin
    FOR SELECT
    TO authenticated
    USING ("userID" = auth.uid());

-- =====================================================
-- NOTE: NO POLICIES FOR ANON ROLE
-- =====================================================
-- We do NOT create policies for 'anon' role
-- When RLS is enabled and NO policies exist for a role, 
-- PostgreSQL/PostgREST behavior may vary:
-- - Some versions return 0 rows (no error)
-- - Some versions return permission denied error
-- This is expected behavior for security

