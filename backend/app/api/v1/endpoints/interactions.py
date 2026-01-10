from fastapi import APIRouter, Depends
from app.services.interaction_service import InteractionService
from app.core.security import get_current_user
from app.api.v1.schemas.interaction import InteractionDetail, InteractionUpdate

router = APIRouter()

@router.patch("/{interaction_id}")
async def patch_interaction(interaction_id: str, body: InteractionUpdate, current_user = Depends(get_current_user)):
    return await InteractionService.update_interaction_status(interaction_id, body.status, current_user)

@router.get("/{interaction_id}", response_model=InteractionDetail)
async def get_details(interaction_id: str, current_user = Depends(get_current_user)):
    # logic to call service and return detailed data
    pass