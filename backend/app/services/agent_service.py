"""Agent service - Business logic layer for agent operations."""

from uuid import UUID

from fastapi import HTTPException, status

from app.api.v1.schemas.agent import CreateAgentRequest, UpdateAgentRequest
from app.core.constants import MAX_AGENTS_PER_SUPERVISOR, AgentStatus, AgentType
from app.core.exceptions import (
    AgentBusyException,
    ForbiddenException,
    NotFoundException,
)
from app.repositories.agent_repository import AgentModel, agent_repository


def create_agent(
    supervisor_id: UUID,
    request: CreateAgentRequest,
    agent_type: AgentType = AgentType.VOICE,
) -> AgentModel:
    """
    Create a new agent for a supervisor.
    """
    current_count = agent_repository.count_by_supervisor(supervisor_id)

    if current_count >= MAX_AGENTS_PER_SUPERVISOR:
        # Max limit is a logic error/validation error using standard HTTP exception
        # or separate MaxAgentsExceededException if it existed.
        # Sticking to HTTPException 400 as standard for known bad request logic not covered by provided exceptions.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_AGENTS_PER_SUPERVISOR} agents allowed per supervisor",
        )

    try:
        created_agent = agent_repository.create_agent(
            supervisor_id=supervisor_id,
            name=request.name,
            system_prompt=request.system_prompt,
            mcp_tools=request.mcp_tools,
            agent_type=agent_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent: {str(e)}",
        )

    return created_agent


def get_agent(agent_id: UUID, supervisor_id: UUID) -> AgentModel:
    """
    Get agent details by ID with ownership check.
    """
    agent = agent_repository.get_by_id(agent_id)

    if agent is None:
        raise NotFoundException("Agent not found")

    if agent.supervisor_id != supervisor_id:
        raise ForbiddenException("You do not have permission to access this agent")

    return agent


def get_agent_detail(agent_id: UUID, supervisor_id: UUID) -> dict:
    """
    Get detailed agent information.
    """
    agent = get_agent(agent_id, supervisor_id)

    current_interaction = None
    if agent.status in [AgentStatus.IN_CALL, AgentStatus.IN_CHAT]:
        current_interaction = agent_repository.get_current_interaction(agent_id)

    analytics = agent_repository.get_agent_analytics(agent_id)

    return {
        **agent.model_dump(),
        "current_interaction": current_interaction,
        "analytics": analytics,
    }


def get_agent_status(agent_id: UUID, supervisor_id: UUID) -> dict:
    """
    Get agent's current status and real-time metrics.
    """
    agent = get_agent(agent_id, supervisor_id)

    current_interaction = None
    realtime_metrics = None

    if agent.status in [AgentStatus.IN_CALL, AgentStatus.IN_CHAT]:
        current_interaction = agent_repository.get_current_interaction(agent_id)
        if current_interaction:
            realtime_metrics = agent_repository.get_latest_metrics(
                UUID(current_interaction["id"])
            )

    return {
        "agent_id": agent.id,
        "status": agent.status,
        "current_interaction": current_interaction,
        "realtime_metrics": realtime_metrics,
    }


def update_agent(
    agent_id: UUID,
    supervisor_id: UUID,
    request: UpdateAgentRequest,
) -> AgentModel:
    """
    Update an agent's configuration.
    """
    agent = get_agent(agent_id, supervisor_id)

    # Check if agent is active
    if agent.status in [AgentStatus.IN_CALL, AgentStatus.IN_CHAT]:
        raise AgentBusyException("Cannot update agent while in active call/chat")

    # Build data for base repository update (expects Pydantic model usually, but our update handles objects)
    # The BaseRepository.update expects `data: BaseModel`.
    # Our request is UpdateAgentRequest which IS a BaseModel.
    # However, BaseRepository.update replaces fields.
    # We need to supply only the fields to update.
    # But BaseRepository.update implementation: `data.model_dump(exclude_none=True)`.
    # So passing request directly is correct!
    
    try:
        updated_agent = agent_repository.update(agent_id, request)
    except Exception as e:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update agent: {str(e)}",
        )

    return updated_agent


def delete_agent(agent_id: UUID, supervisor_id: UUID) -> None:
    """
    Delete an agent.
    """
    agent = get_agent(agent_id, supervisor_id)

    # Check if agent is active
    if agent.status in [AgentStatus.IN_CALL, AgentStatus.IN_CHAT]:
         raise AgentBusyException("Cannot delete agent while in active call/chat")

    try:
        agent_repository.delete(agent_id)
    except Exception as e:
        # Check for FK violation (ON DELETE RESTRICT in database.sql)
        error_msg = str(e).lower()
        if "foreign key constraint" in error_msg or "violates foreign key" in error_msg:
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete agent that has existing interactions (history). Archive it instead.",
            )
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete agent: {str(e)}",
        )
