"""Tool permission schemas."""

from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class PermissionRespondIn(BaseModel):
    response: Literal["allowed", "denied"]


class ToolPermissionOut(BaseModel):
    id: str
    interaction_id: str
    tool_name: str
    requested_at: Optional[datetime] = None
    responded_at: Optional[datetime]
    supervisor_response: Optional[str]
    status: Literal["pending","allowed","denied","timeout","completed"]
