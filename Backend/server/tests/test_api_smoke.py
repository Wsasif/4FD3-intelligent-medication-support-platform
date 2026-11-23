import os
from pathlib import Path
from unittest.mock import MagicMock

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
SUPABASE_CONFIGURED = bool(os.getenv("DATABASE_URL") and os.getenv("SUPABASE_URL"))

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/postgres?sslmode=require")
os.environ.setdefault("SUPABASE_URL", "https://example-project.supabase.co")

import pytest
from fastapi.testclient import TestClient

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db, pool
from app.main import app


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeConnection:
    def execute(self, query, params=None):
        if "count(*) AS drugs" in str(query):
            return FakeResult([{"drugs": 42}])
        return FakeResult([{"id": 1, "name": "Ibuprofen"}])


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(pool, "open", MagicMock())
    monkeypatch.setattr(pool, "close", MagicMock())
    fake_connection = FakeConnection()

    def override_get_db():
        return fake_connection

    def override_get_current_user():
        return CurrentUser(id="test-user-id", email="test@example.com")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def anonymous_client(monkeypatch):
    monkeypatch.setattr(pool, "open", MagicMock())
    monkeypatch.setattr(pool, "close", MagicMock())

    def override_get_db():
        return FakeConnection()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_db_endpoint(client):
    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "drugs": 42}


def test_drugs_search_smoke(client):
    response = client.get("/api/v1/drugs/search", params={"q": "ibuprofen", "limit": 5})

    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "Ibuprofen"}]


def test_protected_route_requires_login(anonymous_client):
    response = anonymous_client.get("/api/v1/users/me")

    assert response.status_code == 401


def test_cors_allows_frontend_on_port_5174(client):
    response = client.options(
        "/api/v1/medications",
        headers={
            "Origin": "http://localhost:5174",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5174"


def test_supabase_database_connection():
    if os.getenv("RUN_SUPABASE_TESTS") != "1":
        pytest.skip("Set RUN_SUPABASE_TESTS=1 to run the Supabase smoke test")
    if not SUPABASE_CONFIGURED:
        pytest.skip("Add real DATABASE_URL and SUPABASE_URL values to server/.env")

    with TestClient(app) as live_client:
        response = live_client.get("/health/db")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["drugs"] > 0
