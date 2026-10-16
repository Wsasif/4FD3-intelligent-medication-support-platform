from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import Connection

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.medication import MedicationCreate, MedicationOut
from app.services import medications as service

router = APIRouter(prefix="/medications", tags=["medications"])


@router.post("", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
def create_medication(
    data: MedicationCreate,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    try:
        return service.create_medication(conn, user.id, data)
    except service.InvalidReference as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("", response_model=list[MedicationOut])
def list_medications(
    include_inactive: bool = False,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    return service.list_medications(conn, user.id, include_inactive)


@router.get("/{medication_id}", response_model=MedicationOut)
def get_medication(
    medication_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    med = service.get_medication(conn, user.id, medication_id)
    if med is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return med