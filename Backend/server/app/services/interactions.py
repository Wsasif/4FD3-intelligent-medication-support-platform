"""Drug-drug interaction (DDI) checks using the DDInter 2.0 tables.

drug_interactions stores each pair once with drug_a_id < drug_b_id,
so a lookup always uses LEAST(...) and GREATEST(...) of the two ids.
"""
from uuid import UUID

from psycopg import Connection

# Most serious first. "unknown" sits above "minor": a documented interaction
# with no rating must never look safer than a known minor one.
SEVERITY_ORDER = {"major": 0, "moderate": 1, "unknown": 2, "minor": 3}

SEVERITY_LABELS = {
    "major": "Major",
    "moderate": "Moderate",
    "minor": "Minor",
    "unknown": "Unspecified / Exercise Caution",
}

SEVERITY_MESSAGES = {
    "major": (
        "These medications can interact in a serious way. Do not take them together "
        "unless your doctor or pharmacist has told you it is safe."
    ),
    "moderate": (
        "These medications can interact. Check with your doctor or pharmacist before "
        "taking them together; they may change a dose or monitor you."
    ),
    "minor": (
        "A minor interaction is documented. It is usually low risk, but let your "
        "pharmacist know you take both."
    ),
    # As per Team's final decision on 2026-10-17. Never hidden, never shown as safe.
    "unknown": (
        "An interaction is documented between these two medications, but the official "
        "clinical severity rating is currently unclassified in our database. Consult a "
        "pharmacist or physician before combining."
    ),
}

UNCHECKED_MESSAGE = (
    "{name} is not linked to a drug in our database, so we could not check it for "
    "interactions. Please contact your doctor or pharmacist to verify it is safe with "
    "your other medications."
)

SAME_DRUG_MESSAGE = (
    "You already have {name} in your list, which is the same drug. Taking it twice "
    "could mean a double dose. Please contact your doctor or pharmacist to verify."
)

DISCLAIMER = (
    "Interaction checks use the DDInter 2.0 database and are assistance only, not "
    "medical advice. No warning does not mean a combination is safe. Always confirm "
    "with your doctor or pharmacist."
)


class DrugNotFound(Exception):
    """The drug_id to check does not exist in the drugs table."""


class MajorInteraction(Exception):
    """Saving would combine drugs with a major interaction and the user has not acknowledged it."""

    def __init__(self, interactions: list[dict]):
        super().__init__("major interaction found")
        self.interactions = interactions


def _describe(severity: str) -> dict:
    return {"severity_label": SEVERITY_LABELS[severity], "message": SEVERITY_MESSAGES[severity]}


def _unchecked(conn: Connection, user_id: str, exclude_id: UUID | None) -> list[dict]:
    rows = conn.execute(
        """SELECT id AS medication_id, name AS medication_name FROM medications
           WHERE user_id = %(user_id)s AND is_active AND drug_id IS NULL
             AND (%(exclude)s::uuid IS NULL OR id <> %(exclude)s::uuid)
           ORDER BY name""",
        {"user_id": user_id, "exclude": exclude_id},
    ).fetchall()
    return [
        {**r, "message": UNCHECKED_MESSAGE.format(name=r["medication_name"])} for r in rows
    ]


def check_drug(
    conn: Connection, user_id: str, drug_id: int, exclude_id: UUID | None = None
) -> dict:
    """Compare one drug with every active medication of this user."""
    drug = conn.execute("SELECT id, name FROM drugs WHERE id = %s", (drug_id,)).fetchone()
    if drug is None:
        raise DrugNotFound("drug_id does not exist")

    params = {"user_id": user_id, "drug_id": drug_id, "exclude": exclude_id}
    rows = conn.execute(
        """SELECT m.id AS medication_id, m.name AS medication_name,
                  d.name AS drug_name, di.severity
           FROM medications m
           JOIN drugs d ON d.id = m.drug_id
           JOIN drug_interactions di
             ON di.drug_a_id = LEAST(m.drug_id, %(drug_id)s)
            AND di.drug_b_id = GREATEST(m.drug_id, %(drug_id)s)
           WHERE m.user_id = %(user_id)s AND m.is_active
             AND m.drug_id <> %(drug_id)s
             AND (%(exclude)s::uuid IS NULL OR m.id <> %(exclude)s::uuid)""",
        params,
    ).fetchall()
    interactions = sorted(
        ({**r, **_describe(r["severity"])} for r in rows),
        key=lambda i: (SEVERITY_ORDER[i["severity"]], i["medication_name"].lower()),
    )

    same = conn.execute(
        """SELECT id AS medication_id, name AS medication_name FROM medications
           WHERE user_id = %(user_id)s AND is_active AND drug_id = %(drug_id)s
             AND (%(exclude)s::uuid IS NULL OR id <> %(exclude)s::uuid)
           ORDER BY name""",
        params,
    ).fetchall()

    return {
        "drug_id": drug["id"],
        "drug_name": drug["name"],
        "interactions": interactions,
        "has_major": any(i["severity"] == "major" for i in interactions),
        "same_drug": [
            {**r, "message": SAME_DRUG_MESSAGE.format(name=r["medication_name"])} for r in same
        ],
        "unchecked": _unchecked(conn, user_id, exclude_id),
        "disclaimer": DISCLAIMER,
    }


def list_interactions(conn: Connection, user_id: str) -> dict:
    """Every interacting pair among the user's active medications (for the Alerts page)."""
    rows = conn.execute(
        """SELECT a.id AS medication_a_id, a.name AS medication_a_name,
                  b.id AS medication_b_id, b.name AS medication_b_name, di.severity
           FROM medications a
           JOIN medications b
             ON b.user_id = a.user_id AND b.is_active AND a.drug_id < b.drug_id
           JOIN drug_interactions di
             ON di.drug_a_id = a.drug_id AND di.drug_b_id = b.drug_id
           WHERE a.user_id = %s AND a.is_active""",
        (user_id,),
    ).fetchall()
    pairs = sorted(
        ({**r, **_describe(r["severity"])} for r in rows),
        key=lambda p: (SEVERITY_ORDER[p["severity"]], p["medication_a_name"].lower()),
    )
    return {
        "interactions": pairs,
        "unchecked": _unchecked(conn, user_id, None),
        "disclaimer": DISCLAIMER,
    }


def guard_major(
    conn: Connection, user_id: str, drug_id: int | None, exclude_id: UUID | None, acknowledged: bool
) -> None:
    """Called before saving. Raises MajorInteraction unless the user acknowledged it."""
    if drug_id is None or acknowledged:
        return
    result = check_drug(conn, user_id, drug_id, exclude_id)
    majors = [i for i in result["interactions"] if i["severity"] == "major"]
    if majors:
        raise MajorInteraction(majors)
