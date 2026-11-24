from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import Connection

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.interaction import InteractionCheckOut, InteractionCheckRequest, InteractionListOut
from app.services import interactions as service

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.post("/check", response_model=InteractionCheckOut)
def check_interactions(
    data: InteractionCheckRequest,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Preview: does this drug interact with anything the user takes now? Saves nothing."""
    try:
        return service.check_drug(conn, user.id, data.drug_id, data.exclude_medication_id)
    except service.DrugNotFound as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("", response_model=InteractionListOut)
def list_interactions(
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """All interacting pairs among the user's active medications."""
    return service.list_interactions(conn, user.id)
