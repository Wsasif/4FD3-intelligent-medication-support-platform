from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import Connection

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.dose_log import DoseLogCreate, DoseLogOut
from app.services import dose_logs as service

router = APIRouter(prefix="/dose-logs", tags=["dose logs"])


@router.get("", response_model=list[DoseLogOut])
def list_dose_logs(
    time_zone: str = "UTC",
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    return service.reconcile_today(conn, user.id, time_zone)


@router.post("", response_model=DoseLogOut, status_code=status.HTTP_201_CREATED)
def create_dose_log(
    data: DoseLogCreate,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    try:
        return service.create_dose_log(
            conn,
            user.id,
            data.medication_id,
            data.scheduled_for,
            data.status,
        )
    except service.MedicationNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    except service.DoseAlreadyLogged:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dose already logged")
