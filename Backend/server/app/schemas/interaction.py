from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Severity = Literal["major", "moderate", "minor", "unknown"]


class InteractionCheckRequest(BaseModel):
    """Check one drug against the medications the user is taking now."""
    drug_id: int = Field(examples=[1])          # from GET /drugs/search
    exclude_medication_id: UUID | None = None   # when editing a medication, skip itself


class InteractionOut(BaseModel):
    """One interaction between the checked drug and one of the user's medications."""
    medication_id: UUID
    medication_name: str
    drug_name: str
    severity: Severity
    severity_label: str     # e.g. "Major" or "Unspecified / Exercise Caution"
    message: str            # plain-language advice shown to the user


class UncheckedMedication(BaseModel):
    """An active medication we could not check (it isn't linked to a drug in DDInter)."""
    medication_id: UUID
    medication_name: str
    message: str


class InteractionCheckOut(BaseModel):
    drug_id: int
    drug_name: str
    interactions: list[InteractionOut]            # most serious first
    has_major: bool
    same_drug: list[UncheckedMedication]          # already taking the same drug
    unchecked: list[UncheckedMedication]          # could not be checked
    disclaimer: str


class InteractionPairOut(BaseModel):
    """One interacting pair among the user's own active medications."""
    medication_a_id: UUID
    medication_a_name: str
    medication_b_id: UUID
    medication_b_name: str
    severity: Severity
    severity_label: str
    message: str


class InteractionListOut(BaseModel):
    interactions: list[InteractionPairOut]        # most serious first
    unchecked: list[UncheckedMedication]
    disclaimer: str
