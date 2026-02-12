"""Supervisor endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_admin
from app.services.supervisor_service import SupervisorService
from uuid import UUID
from app.api.v1.schemas.supervisor import (
    SupervisorCreate,
    SupervisorUpdate,
    SupervisorOut
)


router = APIRouter(prefix="/supervisors", tags=["Supervisors"])
service = SupervisorService()

# ============================
# GET /supervisors
# ============================
@router.get("", response_model=list[SupervisorOut])
def list_supervisors(
    supervisor_type: str | None = None,
    page: int = 1,
    limit: int = 10,
    _=Depends(require_admin)
):
    return service.list(supervisor_type, page, limit)


# ============================
# POST /supervisors
# ============================
@router.post("", response_model=SupervisorOut, status_code=status.HTTP_201_CREATED)
def create_supervisor(
    data: SupervisorCreate,
    admin=Depends(require_admin)
):
    return service.create_supervisor(data)


# ============================
# PUT /supervisors/{id}
# ============================
@router.put("/{supervisor_id}")
def update_supervisor(
    supervisor_id: UUID,
    data: SupervisorUpdate,
    service: SupervisorService = Depends()
):
    return service.update_supervisor(str(supervisor_id), data)


# ============================
# DELETE /supervisors/{id}  (DANGEROUS)
# ============================
@router.delete("/{supervisor_id}")
def delete_supervisor(
    supervisor_id: UUID,  # ← مهم جدًا
    user=Depends(require_admin),
    service: SupervisorService = Depends()
):
    service.delete_supervisor(str(supervisor_id), deleted_by=user["id"])
    return {"status": "deleted"}
