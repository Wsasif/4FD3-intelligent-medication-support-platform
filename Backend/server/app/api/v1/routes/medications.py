from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from psycopg import Connection
from pydantic import ValidationError

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.medication import MedicationCreate, MedicationOut, MedicationUpdate
from app.services import medications as service
from app.services.interactions import MajorInteraction

router = APIRouter(prefix="/medications", tags=["medications"])

NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")


def _major_conflict(e: MajorInteraction) -> HTTPException:
    """409: the frontend shows these interactions and asks the user to confirm."""
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=jsonable_encoder({
            "message": "Major interaction found. Review it, then save again with "
                       "acknowledge_interactions=true if your doctor or pharmacist has approved it.",
            "interactions": e.interactions,
        }),
    )


@router.post("", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
def create_medication(
    data: MedicationCreate,
    acknowledge_interactions: bool = False,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    try:
        return service.create_medication(conn, user.id, data, acknowledge_interactions)
    except service.InvalidReference as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except MajorInteraction as e:
        raise _major_conflict(e)


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
    acknowledge_interactions: bool = False,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    changes = data.model_dump(exclude_unset=True)  # only fields actually sent
    try:
        med = service.update_medication(
            conn, user.id, medication_id, changes, acknowledge_interactions
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[err["msg"] for err in e.errors()],
        )
    except service.InvalidReference as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except MajorInteraction as e:
        raise _major_conflict(e)
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