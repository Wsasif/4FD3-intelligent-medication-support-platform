from uuid import UUID

from psycopg import Connection

from app.schemas.medication import MedicationCreate

MED_COLUMNS = """id, name, dosage, units_per_dose, condition, quantity_remaining,
    refill_alert_days, is_as_needed, low_quantity_alert, drug_id, pharmacy_id,
    start_date, end_date, notes, is_active, created_at"""


class InvalidReference(Exception):
    """drug_id or pharmacy_id points to something that doesn't exist (or isn't yours)."""


def _check_references(conn: Connection, user_id: str, drug_id, pharmacy_id) -> None:
    if drug_id is not None:
        if conn.execute("SELECT 1 FROM drugs WHERE id = %s", (drug_id,)).fetchone() is None:
            raise InvalidReference("drug_id does not exist")
    if pharmacy_id is not None:
        found = conn.execute(
            "SELECT 1 FROM pharmacies WHERE id = %s AND user_id = %s",
            (pharmacy_id, user_id),
        ).fetchone()
        if found is None:
            raise InvalidReference("pharmacy_id not found")


def _intake_times(conn: Connection, user_id: str, med_ids: list[UUID]) -> dict:
    """Return {medication_id: [times...]} for the given medications."""
    times: dict = {med_id: [] for med_id in med_ids}
    if not med_ids:
        return times
    rows = conn.execute(
        """SELECT medication_id, intake_time FROM medication_schedules
           WHERE user_id = %s AND medication_id = ANY(%s)
           ORDER BY intake_time""",
        (user_id, med_ids),
    ).fetchall()
    for row in rows:
        times[row["medication_id"]].append(row["intake_time"])
    return times


def create_medication(conn: Connection, user_id: str, data: MedicationCreate) -> dict:
    with conn.transaction():  # all or nothing
        _check_references(conn, user_id, data.drug_id, data.pharmacy_id)
        med = conn.execute(
            f"""INSERT INTO medications (user_id, name, dosage, units_per_dose, condition,
                    quantity_remaining, refill_alert_days, is_as_needed, low_quantity_alert,
                    drug_id, pharmacy_id, start_date, end_date, notes)
                VALUES (%(user_id)s, %(name)s, %(dosage)s, %(units_per_dose)s, %(condition)s,
                    %(quantity_remaining)s, %(refill_alert_days)s, %(is_as_needed)s,
                    %(low_quantity_alert)s, %(drug_id)s, %(pharmacy_id)s, %(start_date)s,
                    %(end_date)s, %(notes)s)
                RETURNING {MED_COLUMNS}""",
            {**data.model_dump(exclude={"intake_times"}), "user_id": user_id},
        ).fetchone()
        for t in data.intake_times:
            conn.execute(
                """INSERT INTO medication_schedules (user_id, medication_id, intake_time)
                   VALUES (%s, %s, %s)""",
                (user_id, med["id"], t),
            )
    med["intake_times"] = sorted(data.intake_times)
    return med


def list_medications(conn: Connection, user_id: str, include_inactive: bool) -> list[dict]:
    meds = conn.execute(
        f"""SELECT {MED_COLUMNS} FROM medications
            WHERE user_id = %s AND (is_active OR %s)
            ORDER BY is_active DESC, name""",
        (user_id, include_inactive),
    ).fetchall()
    times = _intake_times(conn, user_id, [m["id"] for m in meds])
    for m in meds:
        m["intake_times"] = times[m["id"]]
    return meds


def get_medication(conn: Connection, user_id: str, med_id: UUID) -> dict | None:
    med = conn.execute(
        f"SELECT {MED_COLUMNS} FROM medications WHERE id = %s AND user_id = %s",
        (med_id, user_id),
    ).fetchone()
    if med is None:
        return None
    med["intake_times"] = _intake_times(conn, user_id, [med_id])[med_id]
    return med