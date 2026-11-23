from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class DoseLogCreate(BaseModel):
    medication_id: UUID
    scheduled_for: datetime
    status: Literal["taken", "skipped", "missed"]


class DoseLogOut(BaseModel):
    id: UUID
    medication_id: UUID
    medication_name: str
    dosage: str
    scheduled_for: datetime
    taken_at: datetime | None
    status: Literal["taken", "skipped", "missed"]
