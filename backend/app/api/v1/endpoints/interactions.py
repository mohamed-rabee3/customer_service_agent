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
    supervisor_id: Optional[UUID] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """List interactions."""
    service = InteractionService()
    
    if current_user.role == "admin":
        if supervisor_id:
            # Admin can filter by supervisor_id
            target_agent_ids = await service.get_agent_ids_for_supervisor(supervisor_id)
        elif agent_id:
            # Admin can filter by agent_id
            target_agent_ids = [agent_id]
        else:
            # Admin sees all if no filter
            target_agent_ids = []
    else:
        # Supervisor can only see their own agents' interactions
        allowed_agent_ids = await service.get_agent_ids(current_user.id)
        
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
    
    # Security: Admin can view any interaction, Supervisor only their own agents
    if current_user.role != "admin":
        allowed_agent_ids = await service.get_agent_ids(current_user.id)
        if str(interaction.agent_id) not in allowed_agent_ids:
            raise HTTPException(status_code=403, detail="Not authorized to access this interaction")
        
    return interaction

@router.patch("/{interaction_id}", response_model=Interaction)
async def update_interaction_status(
    interaction_id: UUID,
    status: str = Body(..., embed=True),  # Expect JSON body {"status": "val"}
    current_user: UserResponse = Depends(get_current_user),
):
    """Update interaction status."""
    service = InteractionService()
    
    # Security: Verify ownership
    # 1. Admin Bypass
    if current_user.role == "admin":
        pass # Admin can update anything
    else:
        # 2. Supervisor Check
        allowed_agent_ids = await service.get_agent_ids(current_user.id)
        
        # Check interaction existence
        existing = await service.get_interaction_detail(interaction_id)
        if not existing:
             raise HTTPException(status_code=404, detail="Interaction not found")
        
        if str(existing.agent_id) not in allowed_agent_ids:
             raise HTTPException(status_code=403, detail="Not authorized to update this interaction")
    
    # Update
    interaction = await service.update_interaction_status(interaction_id, status)
    
    if not interaction:
         raise HTTPException(status_code=404, detail="Interaction not found")
        
    return interaction