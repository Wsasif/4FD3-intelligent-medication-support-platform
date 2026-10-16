from fastapi import APIRouter, Depends, Query
from psycopg import Connection

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.drug import DrugOut

router = APIRouter(prefix="/drugs", tags=["drugs"])

# %% is a literal % (the pg_trgm "similar to" operator); %(name)s are values
SEARCH_SQL = """
    SELECT id, name
    FROM drugs
    WHERE name ILIKE %(contains)s OR name %% %(q)s
    ORDER BY
        (name ILIKE %(starts)s) DESC,
        similarity(name, %(q)s) DESC,
        name
    LIMIT %(limit)s
"""


def _escape_like(text: str) -> str:
    """Treat % and _ typed by the user as normal characters, not wildcards."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/search", response_model=list[DrugOut])
def search_drugs(
    q: str = Query(..., min_length=2, max_length=100, description="Part of a drug name"),
    limit: int = Query(10, ge=1, le=25),
    _user: CurrentUser = Depends(get_current_user),  # must be logged in
    conn: Connection = Depends(get_db),
):
    q = q.strip()
    safe = _escape_like(q)
    rows = conn.execute(
        SEARCH_SQL,
        {"q": q, "contains": f"%{safe}%", "starts": f"{safe}%", "limit": limit},
    ).fetchall()
    return rows