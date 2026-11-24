from datetime import date, datetime, time
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

Frequency = Literal["daily", "weekly", "monthly"]
Weekday = Annotated[int, Field(ge=1, le=7)]   # ISO: 1 = Monday ... 7 = Sunday


class MedicationBase(BaseModel):
    """Fields the user fills in (shared by create and output)."""
    name: str = Field(min_length=1, max_length=200, examples=["Metformin"])
    dosage: str = Field(min_length=1, max_length=100, examples=["500 mg"])
    units_per_dose: float = Field(default=1, gt=0, le=9999)       # e.g. 2 tablets
    condition: str | None = Field(default=None, max_length=200)    # what it treats
    quantity_remaining: float = Field(default=0, ge=0, le=999999)  # tablets on hand
    refill_alert_days: int = Field(default=7, ge=1, le=60)
    is_as_needed: bool = False                                     # no fixed schedule
    low_quantity_alert: float = Field(default=5, gt=0, le=999999)
    drug_id: int | None = None          # from GET /drugs/search; needed for interaction checks
    pharmacy_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = Field(default=None, max_length=1000)
    # How often: every `repeat_every` days / weeks / months.
    # weekly also needs days_of_week. See migration 003 for examples.
    frequency: Frequency = "daily"
    repeat_every: int = Field(default=1, ge=1, le=12)
    days_of_week: list[Weekday] = Field(default_factory=list, examples=[[1, 3, 5]])


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
        if self.frequency == "weekly":
            if not self.days_of_week:
                raise ValueError("weekly medications need at least one day in days_of_week")
            self.days_of_week = sorted(set(self.days_of_week))
        else:
            self.days_of_week = []  # only used by weekly
        if (self.repeat_every > 1 or self.frequency == "monthly") and self.start_date is None:
            raise ValueError("start_date is needed for this frequency (it sets which days count)")
        return self


class MedicationOut(MedicationBase):
    """What the API sends back."""
    id: UUID
    is_active: bool
    created_at: datetime
    intake_times: list[time]
    drug_name: str | None = None    # DDInter name of drug_id, for display


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
    frequency: Frequency | None = None
    repeat_every: int | None = None
    days_of_week: list[Weekday] | None = None
    intake_times: list[time] | None = None
