"""Tests for the drug-drug interaction check (no real database needed).

The fake database knows three drugs:
  1 Iron, 2 Dolutegravir (major with Iron), 3 Mysteryzol (unknown severity with Iron).
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db, pool
from app.main import app
from tests.test_medications_api import FakeConnection, FakeResult, FakeRow

DRUGS = {1: "Iron", 2: "Dolutegravir", 3: "Mysteryzol"}
PAIRS = {(1, 2): "major", (1, 3): "unknown"}
USER = "test-user-id"


class FakeInteractionConnection(FakeConnection):
    def _active(self, user_id, exclude=None):
        return [
            m for m in self.medications.values()
            if m["user_id"] == user_id and m["is_active"] and m["id"] != exclude
        ]

    def execute(self, query, params=None):
        q = " ".join(str(query).split())

        if q.startswith("SELECT id, name FROM drugs WHERE id = ANY"):  # drug names for a list
            (ids,) = params
            return FakeResult([FakeRow(id=i, name=DRUGS[i]) for i in ids if i in DRUGS])

        if q.startswith("SELECT id, name FROM drugs"):
            (drug_id,) = params
            if drug_id not in DRUGS:
                return FakeResult([])
            return FakeResult([FakeRow(id=drug_id, name=DRUGS[drug_id])])

        if "LEAST(m.drug_id" in q:  # check one drug against active meds
            rows = []
            for m in self._active(params["user_id"], params["exclude"]):
                if m["drug_id"] is None or m["drug_id"] == params["drug_id"]:
                    continue
                pair = tuple(sorted((m["drug_id"], params["drug_id"])))
                if pair in PAIRS:
                    rows.append(FakeRow(
                        medication_id=m["id"], medication_name=m["name"],
                        drug_name=DRUGS[m["drug_id"]], severity=PAIRS[pair],
                    ))
            return FakeResult(rows)

        if "AND drug_id = %(drug_id)s" in q:  # same drug already in the list
            return FakeResult([
                FakeRow(medication_id=m["id"], medication_name=m["name"])
                for m in self._active(params["user_id"], params["exclude"])
                if m["drug_id"] == params["drug_id"]
            ])

        if "drug_id IS NULL" in q:  # medications we cannot check
            return FakeResult([
                FakeRow(medication_id=m["id"], medication_name=m["name"])
                for m in self._active(params["user_id"], params["exclude"])
                if m["drug_id"] is None
            ])

        if "JOIN medications b" in q:  # all pairs among active meds
            (user_id,) = params
            meds = [m for m in self._active(user_id) if m["drug_id"] is not None]
            rows = []
            for a in meds:
                for b in meds:
                    if a["drug_id"] < b["drug_id"] and (a["drug_id"], b["drug_id"]) in PAIRS:
                        rows.append(FakeRow(
                            medication_a_id=a["id"], medication_a_name=a["name"],
                            medication_b_id=b["id"], medication_b_name=b["name"],
                            severity=PAIRS[(a["drug_id"], b["drug_id"])],
                        ))
            return FakeResult(rows)

        return super().execute(query, params)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(pool, "open", MagicMock())
    monkeypatch.setattr(pool, "close", MagicMock())
    fake = FakeInteractionConnection()
    app.dependency_overrides[get_db] = lambda: fake
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER, email=None)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def add_med(client, name, drug_id, ack=False):
    url = "/api/v1/medications" + ("?acknowledge_interactions=true" if ack else "")
    return client.post(url, json={
        "name": name, "dosage": "10 mg", "intake_times": ["08:00"], "drug_id": drug_id,
    })


def test_check_finds_major_interaction(client):
    assert add_med(client, "Iron", 1).status_code == 201

    response = client.post("/api/v1/interactions/check", json={"drug_id": 2})

    assert response.status_code == 200
    body = response.json()
    assert body["has_major"] is True
    assert body["interactions"][0]["severity"] == "major"
    assert body["interactions"][0]["medication_name"] == "Iron"


def test_unknown_severity_is_shown_with_caution(client):
    assert add_med(client, "Iron", 1).status_code == 201

    body = client.post("/api/v1/interactions/check", json={"drug_id": 3}).json()

    assert body["has_major"] is False
    item = body["interactions"][0]
    assert item["severity"] == "unknown"
    assert item["severity_label"] == "Unspecified / Exercise Caution"
    assert "pharmacist or physician" in item["message"]


def test_medication_without_drug_is_listed_as_unchecked(client):
    assert add_med(client, "Grandma's tea", None).status_code == 201

    body = client.post("/api/v1/interactions/check", json={"drug_id": 2}).json()

    assert body["interactions"] == []
    assert body["unchecked"][0]["medication_name"] == "Grandma's tea"
    assert "contact your doctor or pharmacist" in body["unchecked"][0]["message"]


def test_check_unknown_drug_returns_422(client):
    response = client.post("/api/v1/interactions/check", json={"drug_id": 999})

    assert response.status_code == 422


def test_major_interaction_blocks_save_until_acknowledged(client):
    assert add_med(client, "Iron", 1).status_code == 201

    blocked = add_med(client, "Dolutegravir", 2)
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["interactions"][0]["severity"] == "major"

    allowed = add_med(client, "Dolutegravir", 2, ack=True)
    assert allowed.status_code == 201


def test_unknown_severity_does_not_block_save(client):
    assert add_med(client, "Iron", 1).status_code == 201

    assert add_med(client, "Mysteryzol", 3).status_code == 201


def test_list_returns_pairs_among_active_medications(client):
    add_med(client, "Iron", 1)
    add_med(client, "Dolutegravir", 2, ack=True)

    body = client.get("/api/v1/interactions").json()

    assert len(body["interactions"]) == 1
    pair = body["interactions"][0]
    assert {pair["medication_a_name"], pair["medication_b_name"]} == {"Iron", "Dolutegravir"}
    assert pair["severity_label"] == "Major"
