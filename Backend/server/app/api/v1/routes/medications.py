from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import Connection
from pydantic import ValidationError

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.medication import MedicationCreate, MedicationOut, MedicationUpdate
from app.services import medications as service

router = APIRouter(prefix="/medications", tags=["medications"])

NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")


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
        raise NOT_FOUND
    return med


@router.patch("/{medication_id}", response_model=MedicationOut)
def update_medication(
    medication_id: UUID,
    data: MedicationUpdate,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    changes = data.model_dump(exclude_unset=True)  # only fields actually sent
    try:
        med = service.update_medication(conn, user.id, medication_id, changes)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[err["msg"] for err in e.errors()],
        )
    except service.InvalidReference as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    if med is None:
        raise NOT_FOUND
    return med


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    medication_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if not service.delete_medication(conn, user.id, medication_id):
        raise NOT_FOUND