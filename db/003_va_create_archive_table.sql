-- =====================================================
-- Archive table: post-call LLM snapshot (Groq Llama 3.1 8B Instant)
-- Run in Supabase SQL Editor (or: psql / supabase db execute)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    overall_performance DOUBLE PRECISION NOT NULL
        CHECK (overall_performance >= 0::double precision AND overall_performance <= 100::double precision),
    sentiment sentiment_enum NOT NULL,
    issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    groq_model TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_archive_interaction UNIQUE (interaction_id)
);

CREATE INDEX IF NOT EXISTS idx_archive_interaction_id ON public.archive(interaction_id);
CREATE INDEX IF NOT EXISTS idx_archive_created_at ON public.archive(created_at DESC);

COMMENT ON TABLE public.archive IS 'Post-call summary, overall performance (0-100), sentiment — produced by Groq Llama 3.1 8B Instant';
COMMENT ON COLUMN public.archive.overall_performance IS 'Agent overall performance score 0-100 from end-of-call LLM';
COMMENT ON COLUMN public.archive.sentiment IS 'Customer tone vs service: good | neutral | critical (maps from model bad)';

ALTER TABLE public.archive ENABLE ROW LEVEL SECURITY;

-- Supervisors: archive rows only for their agents' interactions
CREATE POLICY "supervisors_own_archive" ON public.archive
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.interactions i
            INNER JOIN public.agents a ON a.id = i.agent_id
            WHERE i.id = archive.interaction_id
              AND a.supervisor_id = auth.uid()
        )
    );

-- Admins: full access
CREATE POLICY "admin_full_access_archive" ON public.archive
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin WHERE "userID" = auth.uid()));
