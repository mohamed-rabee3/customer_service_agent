from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MetricSchema(BaseModel):
    timestamp: datetime
    metric_name: str
    value: float

class Interaction(BaseModel):
    id: str
    agent_id: str
    status: str
    started_at: datetime
    phone_number: Optional[str]

class InteractionDetail(Interaction):
    livekit_room_id: Optional[str]
    realtime_metrics: List[MetricSchema] = []
    tool_permissions: List[dict] = []

class InteractionUpdate(BaseModel):
    status: str # completed, failed