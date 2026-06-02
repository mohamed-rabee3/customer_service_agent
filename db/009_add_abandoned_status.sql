-- =====================================================
-- Migration: Add 'abandoned' to interaction_status_enum
-- =====================================================
-- The voice post-call pipeline marks calls with no transcript
-- (or no agent reply) as 'abandoned' (see
-- app/agents/voice_session_manager.py::_handle_post_call), but the
-- interaction_status_enum defined in database.sql only allows
-- 'active' | 'completed' | 'failed'. The mismatch caused a
-- PostgreSQL 22P02 (invalid enum value) error that was silently
-- swallowed, leaving the interaction row stuck at status='active'
-- forever and preventing the archive upsert and LLM summary.
--
-- IMPORTANT: PostgreSQL forbids ALTER TYPE ... ADD VALUE inside a
-- transaction block. Run this file in the Supabase SQL Editor
-- (which auto-commits) or with `psql --single-transaction=off`.
-- The IF NOT EXISTS guard (PG 12+) makes the script idempotent.
-- =====================================================

ALTER TYPE interaction_status_enum ADD VALUE IF NOT EXISTS 'abandoned';
