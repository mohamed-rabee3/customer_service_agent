"""Archive endpoints."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.archive import ArchiveCard, ArchiveDetail
from app.api.deps import get_current_user
from app.services.archive_service import ArchiveService
from app.services.interaction_service import InteractionService

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_archives(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    agent_id: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    phone_number: Optional[str] = None,
    tags: Optional[str] = Query(None), # Comma-separated string
    current_user: UserResponse = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get call/chat archive with advanced filtering."""
    interaction_service = InteractionService()
    allowed_agent_ids = await interaction_service.get_agent_ids(current_user.id)
    
    parsed_tags = tags.split(",") if tags else None
    
    service = ArchiveService()
    result = await service.get_archives(
        agent_ids=allowed_agent_ids, page=page, limit=limit, agent_id=agent_id,
        from_date=from_date, to_date=to_date, phone_number=phone_number, tags=parsed_tags
    )
    
    return {
        "data": [ArchiveCard.model_validate(item) for item in result["data"]],
        "total": result["total"], "page": result["page"], "limit": result["limit"]
    }

@router.get("/{interaction_id}", response_model=ArchiveDetail)
async def get_archive_detail(
    interaction_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
) -> ArchiveDetail:
    """Get detailed view of a specific interaction archive."""
    interaction_service = InteractionService()
    allowed_agent_ids = await interaction_service.get_agent_ids(current_user.id)
    
    service = ArchiveService()
    archive = await service.get_archive_detail(interaction_id, allowed_agent_ids)
    
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found or not authorized")
        
    return ArchiveDetail.model_validate(archive)
