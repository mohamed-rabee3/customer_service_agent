-- =====================================================
-- Migration: Agent knowledge base documents (markdown)
-- Per-agent uploaded markdown stored for full prompt injection
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agent_knowledge_documents (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    agent_id uuid NOT NULL,
    filename character varying(255) NOT NULL
        CHECK (length(filename::text) > 0 AND length(filename::text) <= 255),
    content_text text NOT NULL CHECK (length(content_text) > 0),
    file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0),
    content_hash text NOT NULL CHECK (length(content_hash) > 0),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT agent_knowledge_documents_pkey PRIMARY KEY (id),
    CONSTRAINT fk_agent_knowledge_documents_agent
        FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE,
    CONSTRAINT uq_agent_knowledge_documents_agent_hash
        UNIQUE (agent_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_documents_agent_id
    ON public.agent_knowledge_documents(agent_id);

COMMENT ON TABLE public.agent_knowledge_documents IS
    'Markdown knowledge base documents per agent for system prompt injection';

-- RLS
ALTER TABLE public.agent_knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY supervisors_own_knowledge ON public.agent_knowledge_documents
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            WHERE a.id = agent_knowledge_documents.agent_id
            AND a.supervisor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents a
            WHERE a.id = agent_knowledge_documents.agent_id
            AND a.supervisor_id = auth.uid()
        )
    );
