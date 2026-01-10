from fastapi import APIRouter, Depends, Query
from app.services.archive_service import ArchiveService
from app.core.security import get_current_user
from app.api.v1.schemas.archive import ArchiveDetail

router = APIRouter()

@router.get("/", response_model=dict)
async def list_archives(page: int = 1, limit: int = 10, current_user = Depends(get_current_user)):
    return await ArchiveService.get_all_archives(current_user, page=page, limit=limit)

@router.get("/{interaction_id}", response_model=ArchiveDetail)
async def archive_detail(interaction_id: str, current_user = Depends(get_current_user)):
    return await ArchiveService.get_archive_details(interaction_id, current_user)