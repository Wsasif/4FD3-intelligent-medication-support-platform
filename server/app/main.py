"""Entry point for the FastAPI backend.

Run from the server/ folder with:
    uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg import Connection

from app.core.config import get_settings
from app.db.session import get_db, pool

from app.api.v1.routes import users, drugs

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=True, timeout=10)  # quick timeout if the DB is unreachable
    yield
    pool.close()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/health/db", tags=["health"])
def health_db(conn: Connection = Depends(get_db)):
    row = conn.execute("SELECT count(*) AS drugs FROM drugs").fetchone()
    return {"status": "ok", "drugs": row["drugs"]}


app.include_router(users.router, prefix="/api/v1")
app.include_router(drugs.router, prefix="/api/v1")