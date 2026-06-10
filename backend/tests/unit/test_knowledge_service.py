"""Unit tests for agent knowledge base service functions."""

from io import BytesIO
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile

from app.services import agent_service


class TestBuildEffectiveSystemPrompt:
    def test_returns_base_prompt_when_knowledge_empty(self):
        base = "You are a helpful agent."
        assert agent_service.build_effective_system_prompt(base, "") == base
        assert agent_service.build_effective_system_prompt(base, "   ") == base

    def test_includes_knowledge_section(self):
        base = "You are a helpful agent."
        knowledge = "## faq.md\nAnswer: 42"
        result = agent_service.build_effective_system_prompt(base, knowledge)
        assert base in result
        assert "# Knowledge Base" in result
        assert "faq.md" in result
        assert "Answer: 42" in result


class TestGetKnowledgeTextForAgent:
    @patch("app.services.agent_service.get_supabase_service_client")
    def test_formats_documents(self, mock_get_client):
        agent_id = uuid4()
        mock_db = MagicMock()
        mock_get_client.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[
                {"filename": "a.md", "content_text": "Alpha", "file_size_bytes": 10, "created_at": "2026-01-01"},
                {"filename": "b.md", "content_text": "Beta", "file_size_bytes": 20, "created_at": "2026-01-02"},
            ]
        )

        result = agent_service.get_knowledge_text_for_agent(agent_id)
        assert "## a.md\nAlpha" in result
        assert "## b.md\nBeta" in result

    @patch("app.services.agent_service.get_supabase_service_client")
    def test_returns_empty_when_no_documents(self, mock_get_client):
        mock_db = MagicMock()
        mock_get_client.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )
        assert agent_service.get_knowledge_text_for_agent(uuid4()) == ""


class TestResolveEffectiveSystemPrompt:
    @patch("app.services.agent_service.get_knowledge_text_for_agent")
    def test_combines_base_and_knowledge(self, mock_get_kb):
        agent_id = uuid4()
        mock_get_kb.return_value = "## doc.md\nSecret product code: X-99"
        result = agent_service.resolve_effective_system_prompt("Base prompt", agent_id)
        assert "Base prompt" in result
        assert "Secret product code: X-99" in result
        mock_get_kb.assert_called_once_with(agent_id)


class TestUploadKnowledgeValidation:
    def _upload_file(self, filename: str, content: bytes, content_type: str = "text/markdown") -> UploadFile:
        return UploadFile(filename=filename, file=BytesIO(content), headers={"content-type": content_type})

    @pytest.mark.asyncio
    @patch("app.services.agent_service.get_supabase_service_client")
    @patch("app.services.agent_service.get_agent")
    async def test_rejects_non_markdown_extension(self, mock_get_agent, mock_get_client):
        agent_id = uuid4()
        supervisor_id = uuid4()
        mock_get_agent.return_value = MagicMock(status=agent_service.AgentStatus.IDLE)

        with pytest.raises(HTTPException) as exc:
            await agent_service.upload_knowledge_document(
                agent_id,
                self._upload_file("notes.pdf", b"content"),
                supervisor_id,
            )
        assert exc.value.status_code == 400
        mock_get_client.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.agent_service.get_supabase_service_client")
    @patch("app.services.agent_service.get_agent")
    async def test_rejects_oversized_file(self, mock_get_agent, mock_get_client):
        agent_id = uuid4()
        supervisor_id = uuid4()
        mock_get_agent.return_value = MagicMock(status=agent_service.AgentStatus.IDLE)

        with pytest.raises(HTTPException) as exc:
            await agent_service.upload_knowledge_document(
                agent_id,
                self._upload_file("big.md", b"x" * (agent_service.KNOWLEDGE_MAX_FILE_BYTES + 1)),
                supervisor_id,
            )
        assert exc.value.status_code == 400
        mock_get_client.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.agent_service.get_supabase_service_client")
    @patch("app.services.agent_service.get_agent")
    async def test_blocks_upload_when_agent_in_chat(self, mock_get_agent, mock_get_client):
        agent_id = uuid4()
        supervisor_id = uuid4()
        mock_get_agent.return_value = MagicMock(status=agent_service.AgentStatus.IN_CHAT)

        with pytest.raises(agent_service.AgentBusyException):
            await agent_service.upload_knowledge_document(
                agent_id,
                self._upload_file("doc.md", b"# Hello"),
                supervisor_id,
            )
        mock_get_client.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.agent_service.get_supabase_service_client")
    @patch("app.services.agent_service.get_agent")
    async def test_uploads_valid_markdown(self, mock_get_agent, mock_get_client):
        agent_id = uuid4()
        supervisor_id = uuid4()
        mock_get_agent.return_value = MagicMock(status=agent_service.AgentStatus.IDLE)

        mock_db = MagicMock()
        mock_get_client.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{
                "id": str(uuid4()),
                "agent_id": str(agent_id),
                "filename": "doc.md",
                "file_size_bytes": 7,
                "created_at": "2026-06-10T00:00:00+00:00",
            }]
        )

        result = await agent_service.upload_knowledge_document(
            agent_id,
            self._upload_file("doc.md", b"# Hello"),
            supervisor_id,
        )
        assert result["document"]["filename"] == "doc.md"


class TestDeleteKnowledgeDocument:
    @patch("app.services.agent_service.get_supabase_service_client")
    @patch("app.services.agent_service.get_agent")
    def test_deletes_existing_document(self, mock_get_agent, mock_get_client):
        agent_id = uuid4()
        doc_id = uuid4()
        supervisor_id = uuid4()
        mock_get_agent.return_value = MagicMock(status=agent_service.AgentStatus.IDLE)

        mock_db = MagicMock()
        mock_get_client.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[{"id": str(doc_id)}]
        )

        agent_service.delete_knowledge_document(agent_id, doc_id, supervisor_id)
        mock_db.table.return_value.delete.return_value.eq.assert_called_once_with("id", str(doc_id))
