from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ArchiveCard(BaseModel):
    id: str
    agent_id: str
    agent_name: Optional[str] = None
    started_at: datetime
    phone_number: str
    tags: List[str] = []
    summary: Optional[str] = None

class ArchiveDetail(BaseModel):
    id: str
    agent_id: str
    agent_name: Optional[str] = None
    started_at: datetime
    phone_number: str
    summary: Optional[str] = None
    tags: List[str] = []
    csat_score: Optional[float] = Field(None, ge=1, le=5)
    issues: List[str] = []
    resolution_time_seconds: Optional[int] = None
    fcr_status: bool = False