-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- Run this first to enable RLS on all relevant tables
-- =====================================================

ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_permissions ENABLE ROW LEVEL SECURITY;

-- Note: We DO NOT enable RLS on auth.users – Supabase manages that automatically

