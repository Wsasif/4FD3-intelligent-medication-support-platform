from fastapi import APIRouter, Depends
from psycopg import Connection
from pydantic import BaseModel, Field

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db

router = APIRouter(prefix="/users", tags=["users"])


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)


@router.get("/me")
def read_me(
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    row = conn.execute(
        "SELECT full_name FROM profiles WHERE id = %s",
        (user.id,),
    ).fetchone()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": row["full_name"] if row and row["full_name"] else "",
    }


@router.patch("/me")
def update_me(
    data: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    row = conn.execute(
        """INSERT INTO profiles (id, full_name)
           VALUES (%s, %s)
           ON CONFLICT (id)
           DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id, full_name""",
        (user.id, data.full_name.strip()),
    ).fetchone()
    return {"id": user.id, "email": user.email, "full_name": row["full_name"]}