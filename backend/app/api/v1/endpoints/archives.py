"""Archive endpoints."""

from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.services.archive_service import ArchiveService
from app.api.v1.schemas.archive import ArchiveTagsUpdate

router = APIRouter(prefix="/archives", tags=["Archives"])


@router.patch("/{interaction_id}")
def update_archive_tags(
    interaction_id: str,
    body: ArchiveTagsUpdate,
    user=Depends(get_current_user)
):
    return ArchiveService().update_tags(interaction_id, user["id"], body.tags)
