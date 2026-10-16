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


def update_medication(conn: Connection, user_id: str, med_id: UUID, changes: dict) -> dict | None:
    """Apply only the changed fields, then re-check every rule on the result."""
    with conn.transaction():
        current = get_medication(conn, user_id, med_id)
        if current is None:
            return None
        merged = {**current, **changes}
        checked = MedicationCreate.model_validate(merged)  # same rules as create
        _check_references(conn, user_id, checked.drug_id, checked.pharmacy_id)
        is_active = merged["is_active"] if merged["is_active"] is not None else current["is_active"]
        med = conn.execute(
            f"""UPDATE medications SET
                    name = %(name)s, dosage = %(dosage)s, units_per_dose = %(units_per_dose)s,
                    condition = %(condition)s, quantity_remaining = %(quantity_remaining)s,
                    refill_alert_days = %(refill_alert_days)s, is_as_needed = %(is_as_needed)s,
                    low_quantity_alert = %(low_quantity_alert)s, drug_id = %(drug_id)s,
                    pharmacy_id = %(pharmacy_id)s, start_date = %(start_date)s,
                    end_date = %(end_date)s, notes = %(notes)s, is_active = %(is_active)s
                WHERE id = %(id)s AND user_id = %(user_id)s
                RETURNING {MED_COLUMNS}""",
            {**checked.model_dump(exclude={"intake_times"}),
             "is_active": is_active, "id": med_id, "user_id": user_id},
        ).fetchone()
        if "intake_times" in changes:  # replace the whole schedule
            conn.execute(
                "DELETE FROM medication_schedules WHERE medication_id = %s AND user_id = %s",
                (med_id, user_id),
            )
            for t in checked.intake_times:
                conn.execute(
                    """INSERT INTO medication_schedules (user_id, medication_id, intake_time)
                       VALUES (%s, %s, %s)""",
                    (user_id, med_id, t),
                )
    med["intake_times"] = sorted(checked.intake_times)
    return med


def delete_medication(conn: Connection, user_id: str, med_id: UUID) -> bool:
    """Delete for good. Its intake times and dose history go with it (cascade)."""
    with conn.transaction():
        row = conn.execute(
            "DELETE FROM medications WHERE id = %s AND user_id = %s RETURNING id",
            (med_id, user_id),
        ).fetchone()
    return row is not None