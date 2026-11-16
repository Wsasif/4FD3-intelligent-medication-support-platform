from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class MedicationBase(BaseModel):
    """Fields the user fills in (shared by create and output)."""
    name: str = Field(min_length=1, max_length=200, examples=["Metformin"])
    dosage: str = Field(min_length=1, max_length=100, examples=["500 mg"])
    units_per_dose: float = Field(default=1, gt=0, le=9999)       # e.g. 2 tablets
    condition: str | None = Field(default=None, max_length=200)    # what it treats
    quantity_remaining: float = Field(default=0, ge=0, le=999999)  # tablets on hand
    refill_alert_days: int = Field(default=7, ge=1, le=60)
    is_as_needed: bool = False                                     # no fixed schedule
    low_quantity_alert: float = Field(default=5, ge=0, le=999999)  # as-needed only
    drug_id: int | None = None          # from GET /drugs/search; needed for interaction checks
    pharmacy_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = Field(default=None, max_length=1000)


class MedicationCreate(MedicationBase):
    intake_times: list[time] = Field(default_factory=list, examples=[["08:00", "20:00"]])

    @model_validator(mode="after")
    def check_rules(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if len(set(self.intake_times)) != len(self.intake_times):
            raise ValueError("intake_times must not repeat")
        if self.is_as_needed and self.intake_times:
            raise ValueError("as-needed medications have no intake_times")
        if not self.is_as_needed and not self.intake_times:
            raise ValueError("add at least one intake time, or set is_as_needed to true")
        return self


class MedicationOut(MedicationBase):
    """What the API sends back."""
    id: UUID
    is_active: bool
    created_at: datetime
    intake_times: list[time]


class MedicationUpdate(BaseModel):
    """Send only the fields you want to change.
    intake_times replaces the whole list. All rules are re-checked on the result."""
    name: str | None = None
    dosage: str | None = None
    units_per_dose: float | None = None
    condition: str | None = None
    quantity_remaining: float | None = None
    refill_alert_days: int | None = None
    is_as_needed: bool | None = None
    low_quantity_alert: float | None = None
    drug_id: int | None = None
    pharmacy_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    is_active: bool | None = None          # false = stop taking it, keep the history
    intake_times: list[time] | None = None


    