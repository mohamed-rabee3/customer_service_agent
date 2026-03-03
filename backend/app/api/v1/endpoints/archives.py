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
    supervisor_id: Optional[UUID] = None,
    # Change to str to handle various formats (like space separated)
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    phone_number: Optional[str] = None,
    tags: Optional[str] = Query(None), # Comma-separated string or JSON
    current_user: UserResponse = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get call/chat archive with advanced filtering."""
    interaction_service = InteractionService()
    
    if current_user.role == "admin":
        if supervisor_id:
            allowed_agent_ids = await interaction_service.get_agent_ids_for_supervisor(supervisor_id)
        else:
            # Admin can see all, so passing None/Empty to repository (handled there)
            allowed_agent_ids = []
    else:
        allowed_agent_ids = await interaction_service.get_agent_ids(current_user.id)
    
    # Parse tags
    parsed_tags = None
    if tags:
        import json
        try:
            # Try parsing as JSON first (e.g. ["tag1", "tag2"] or {"topic": "x"})
            parsed = json.loads(tags)
            # If it's a list or dict, allow it. Repository handles it.
            parsed_tags = parsed
        except json.JSONDecodeError:
            # Fallback to comma-separated
            parsed_tags = tags.split(",")

    # Parse dates types for Service layer
    parsed_from = None
    if from_date:
        try:
            # Handle "2025-12-10 13:29:24.282233+00" -> Replace space with T
            clean_from = from_date.replace(" ", "T")
            parsed_from = datetime.fromisoformat(clean_from)
        except ValueError:
            # Try pure date if time missing? Or raise 422
            raise HTTPException(status_code=422, detail="Invalid from_date format. ISO 8601 required.")
            
    parsed_to = None
    if to_date:
        try:
            clean_to = to_date.replace(" ", "T")
            parsed_to = datetime.fromisoformat(clean_to)
        except ValueError:
             raise HTTPException(status_code=422, detail="Invalid to_date format. ISO 8601 required.")
    
    service = ArchiveService()
    result = await service.get_archives(
        agent_ids=allowed_agent_ids, page=page, limit=limit, agent_id=agent_id,
        from_date=parsed_from, to_date=parsed_to, phone_number=phone_number, tags=parsed_tags
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
    service = ArchiveService()
    
    # Check if admin
    if current_user.role == "admin":
        # Pass None or special flag to indicate no agent filtering needed?
        # Let's adjust service to accept Optional[List[str]] where None means "all" if logic allows, 
        # OR we just fetch it directly.
        # Better: let's pass None for agent_ids if admin.
        archive = await service.get_archive_detail(interaction_id, agent_ids=None)
    else:
        interaction_service = InteractionService()
        allowed_agent_ids = await interaction_service.get_agent_ids(current_user.id)
        archive = await service.get_archive_detail(interaction_id, allowed_agent_ids)
    
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found or not authorized")
        
    return ArchiveDetail.model_validate(archive)
