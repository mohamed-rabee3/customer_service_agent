"""Archive schemas."""

from pydantic import BaseModel
from typing import Dict, Any


class ArchiveTagsUpdate(BaseModel):
    tags: Dict[str, Any]
