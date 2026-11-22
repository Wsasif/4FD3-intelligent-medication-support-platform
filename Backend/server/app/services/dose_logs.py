from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from uuid import UUID

from psycopg import Connection


class MedicationNotFound(Exception):
    pass


class DoseAlreadyLogged(Exception):
    pass


def create_dose_log(
    conn: Connection,
    user_id: str,
    medication_id: UUID,
    scheduled_for: datetime,
    dose_status: str,
) -> dict:
    with conn.transaction():
        medication = conn.execute(
            """SELECT id, name, dosage, units_per_dose
               FROM medications
               WHERE id = %s AND user_id = %s""",
            (medication_id, user_id),
        ).fetchone()
        if medication is None:
            raise MedicationNotFound

        existing = conn.execute(
            """SELECT id FROM dose_logs
               WHERE user_id = %s AND medication_id = %s
                 AND scheduled_for = %s""",
            (user_id, medication_id, scheduled_for),
        ).fetchone()
        if existing is not None:
            raise DoseAlreadyLogged

        if dose_status == "taken" and datetime.now(scheduled_for.tzinfo) > scheduled_for + timedelta(hours=1):
            dose_status = "missed"

        taken_at = datetime.now(scheduled_for.tzinfo) if dose_status == "taken" else None
        log = conn.execute(
            """INSERT INTO dose_logs
                   (user_id, medication_id, scheduled_for, taken_at, status)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING id, medication_id, scheduled_for, taken_at, status""",
            (user_id, medication_id, scheduled_for, taken_at, dose_status),
        ).fetchone()

        if dose_status == "taken":
            conn.execute(
                """UPDATE medications
                   SET quantity_remaining =
                       GREATEST(quantity_remaining - units_per_dose, 0)
                   WHERE id = %s AND user_id = %s""",
                (medication_id, user_id),
            )

    log["medication_name"] = medication["name"]
    log["dosage"] = medication["dosage"]
    return log


def list_dose_logs(conn: Connection, user_id: str) -> list[dict]:
    return conn.execute(
        """SELECT dl.id, dl.medication_id, dl.scheduled_for,
                  dl.taken_at, dl.status,
                  m.name AS medication_name, m.dosage
           FROM dose_logs dl
           JOIN medications m ON m.id = dl.medication_id
           WHERE dl.user_id = %s
           ORDER BY dl.scheduled_for DESC, dl.created_at DESC""",
        (user_id,),
    ).fetchall()


def reconcile_today(
    conn: Connection,
    user_id: str,
    time_zone: str,
) -> list[dict]:
    """Mark today's overdue doses as missed after the 1-hour check-off window."""
    try:
        zone = ZoneInfo(time_zone)
    except Exception:
        zone = ZoneInfo("UTC")

    now = datetime.now(zone)
    today = now.date()
    cutoff = now - timedelta(hours=1)

    schedules = conn.execute(
        """SELECT ms.medication_id, ms.intake_time,
                  m.name AS medication_name, m.dosage
           FROM medication_schedules ms
           JOIN medications m ON m.id = ms.medication_id
           WHERE ms.user_id = %s
             AND m.is_active
             AND (m.start_date IS NULL OR m.start_date <= %s)
             AND (m.end_date IS NULL OR m.end_date >= %s)
           ORDER BY ms.intake_time""",
        (user_id, today, today),
    ).fetchall()

    for schedule in schedules:
        scheduled_for = datetime.combine(today, schedule["intake_time"], tzinfo=zone)
        if scheduled_for > cutoff:
            continue

        existing = conn.execute(
            """SELECT id FROM dose_logs
               WHERE user_id = %s AND medication_id = %s
                 AND scheduled_for = %s""",
            (user_id, schedule["medication_id"], scheduled_for),
        ).fetchone()
        if existing is not None:
            continue

        conn.execute(
            """INSERT INTO dose_logs
                   (user_id, medication_id, scheduled_for, taken_at, status)
               VALUES (%s, %s, %s, NULL, 'missed')""",
            (user_id, schedule["medication_id"], scheduled_for),
        )

    return list_dose_logs(conn, user_id)
