"""Interaction endpoints."""
from typing import Dict, Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status, Body

from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.interaction import InteractionDetail, Interaction
from app.api.deps import get_current_user
from app.services.interaction_service import InteractionService

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_interactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """List interactions."""
    service = InteractionService()
    
    # Fetch user's agents to filter interactions
    allowed_agent_ids = await service.get_agent_ids(current_user.id)
    
    # Apply agent_id filter if provided (securely)
    if agent_id:
        if agent_id not in allowed_agent_ids:
            # Security: If user asks for an agent they don't own, return empty list
            return {"data": [], "total": 0, "page": page, "limit": limit}
        target_agent_ids = [agent_id]
    else:
        target_agent_ids = allowed_agent_ids
    
    return await service.get_interactions(target_agent_ids, page, limit, status)

@router.get("/{interaction_id}", response_model=InteractionDetail)
async def get_interaction_detail(
    interaction_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
):
    """Get interaction details."""
    service = InteractionService()
    interaction = await service.get_interaction_detail(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction

@router.patch("/{interaction_id}", response_model=Interaction)
async def update_interaction_status(
    interaction_id: UUID,
    status: str = Body(..., embed=True), # Expect JSON body {"status": "val"}
    current_user: UserResponse = Depends(get_current_user),
):
    """Update interaction status."""
    service = InteractionService()
    interaction = await service.update_interaction_status(interaction_id, status)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
        
    return interaction