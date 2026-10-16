from collections.abc import Iterator

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings

# Opened when the app starts and closed when it stops (see main.py)
pool = ConnectionPool(
    conninfo=get_settings().database_url,
    min_size=1,
    max_size=5,
    kwargs={"row_factory": dict_row},  # rows come back as dicts: row["name"]
    open=False,
)


def get_db() -> Iterator[Connection]:
    """Lend one connection to a request, then give it back to the pool."""
    with pool.connection() as conn:
        yield conn