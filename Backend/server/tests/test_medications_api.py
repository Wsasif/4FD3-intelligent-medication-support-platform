from contextlib import nullcontext
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db, pool
from app.main import app


class FakeRow(dict):
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError as error:
            raise AttributeError(name) from error


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeConnection:
    def __init__(self):
        self.medications = {}
        self.schedules = []

    def transaction(self):
        return nullcontext()

    def execute(self, query, params=None):
        query = " ".join(str(query).split())

        if query.startswith("INSERT INTO medications"):
            medication = dict(params)
            medication.update(
                id=uuid4(),
                is_active=True,
                created_at=datetime.now(timezone.utc),
            )
            self.medications[medication["id"]] = medication
            return FakeResult([FakeRow(**medication)])
        if query.startswith("INSERT INTO medication_schedules"):
            user_id, medication_id, intake_time = params
            self.schedules.append((user_id, medication_id, intake_time))
            return FakeResult([])
        if query.startswith("DELETE FROM medication_schedules"):
            medication_id, user_id = params
            self.schedules = [
                schedule
                for schedule in self.schedules
                if schedule[0] != user_id or schedule[1] != medication_id
            ]
            return FakeResult([])
        if "FROM medication_schedules" in query:
            user_id, medication_ids = params
            rows = [
                FakeRow(medication_id=medication_id, intake_time=intake_time)
                for schedule_user_id, medication_id, intake_time in self.schedules
                if schedule_user_id == user_id and medication_id in medication_ids
            ]
            return FakeResult(rows)
        if query.startswith("SELECT") and "FROM medications" in query:
            if "WHERE user_id = %s AND (is_active OR %s)" in query:
                user_id, include_inactive = params
                rows = [
                    FakeRow(**medication)
                    for medication in self.medications.values()
                    if medication["user_id"] == user_id
                    and (medication["is_active"] or include_inactive)
                ]
                return FakeResult(rows)
            medication_id, user_id = params
            medication = self.medications.get(medication_id)
            if medication is None or medication["user_id"] != user_id:
                return FakeResult([])
            return FakeResult([FakeRow(**medication)])
        if query.startswith("UPDATE medications"):
            medication = self.medications.get(params["id"])
            if medication is None or medication["user_id"] != params["user_id"]:
                return FakeResult([])
            medication.update(
                {key: value for key, value in params.items() if key not in {"id", "user_id"}}
            )
            return FakeResult([FakeRow(**medication)])
        if query.startswith("DELETE FROM medications"):
            medication_id, user_id = params
            medication = self.medications.get(medication_id)
            if medication is None or medication["user_id"] != user_id:
                return FakeResult([])
            del self.medications[medication_id]
            return FakeResult([FakeRow(id=medication_id)])
        if query.startswith("SELECT 1 FROM drugs"):
            return FakeResult([FakeRow(value=1)])
        return FakeResult([])


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


def test_medication_requires_intake_time_or_as_needed(client):
    response = client.post(
        "/api/v1/medications",
        json={"name": "Metformin", "dosage": "500 mg"},
    )

    assert response.status_code == 422


def test_medication_create_list_update_delete_flow(client):
    create_response = client.post(
        "/api/v1/medications",
        json={
            "name": "Metformin",
            "dosage": "500 mg",
            "intake_times": ["08:00", "20:00"],
        },
    )

    assert create_response.status_code == 201
    medication = create_response.json()
    medication_id = medication["id"]
    assert medication["name"] == "Metformin"
    assert medication["intake_times"] == ["08:00:00", "20:00:00"]

    list_response = client.get("/api/v1/medications")
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [medication_id]

    get_response = client.get(f"/api/v1/medications/{medication_id}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Metformin"

    update_response = client.patch(
        f"/api/v1/medications/{medication_id}",
        json={"name": "Metformin XR"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Metformin XR"

    delete_response = client.delete(f"/api/v1/medications/{medication_id}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/api/v1/medications/{medication_id}")
    assert missing_response.status_code == 404


def test_get_unknown_medication_returns_404(client):
    response = client.get(f"/api/v1/medications/{uuid4()}")

    assert response.status_code == 404
