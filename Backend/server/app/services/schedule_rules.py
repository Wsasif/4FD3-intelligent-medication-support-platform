"""Which days a medication is due on (daily, every N days, weekly on chosen days, monthly).

The frontend has the same rules in Frontend/src/utils/schedule.ts (isDueOn).
Keep the two in step.
"""

import calendar
from datetime import date, timedelta


def is_due_on(med: dict, day: date) -> bool:
    """True if the medication has doses scheduled on this day.

    med needs: frequency, repeat_every, days_of_week, start_date, end_date.
    """
    start = med.get("start_date")
    end = med.get("end_date")
    if start and day < start:
        return False
    if end and day > end:
        return False

    every = med.get("repeat_every") or 1
    frequency = med.get("frequency") or "daily"

    if frequency == "weekly":
        if day.isoweekday() not in (med.get("days_of_week") or []):
            return False
        if every == 1 or start is None:
            return True
        # Count whole weeks between the Monday of start_date's week and this day's week.
        weeks = ((day - timedelta(days=day.weekday())) - (start - timedelta(days=start.weekday()))).days // 7
        return weeks % every == 0

    if frequency == "monthly":
        if start is None:
            return day.day == 1
        months = (day.year - start.year) * 12 + (day.month - start.month)
        if months % every != 0:
            return False
        # Started on the 31st? In shorter months use the last day of the month.
        last_day = calendar.monthrange(day.year, day.month)[1]
        return day.day == min(start.day, last_day)

    # daily
    if every == 1 or start is None:
        return True
    return (day - start).days % every == 0
