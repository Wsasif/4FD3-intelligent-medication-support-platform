// Helpers for working out today's doses and which one is due next.

import type { Frequency, Medication } from '../types';

// One scheduled dose: a medication at a specific time.
export interface Dose {
  key: string; // unique id for the dose, "medicationId|time"
  medication: Medication;
  time: string; // "08:00"
}

// Builds the list of every dose scheduled for today, sorted by time.
// Medications that aren't due today (e.g. a weekly one on an off day) are left out.
export function getTodaysDoses(meds: Medication[], today = new Date()): Dose[] {
  return meds
    .filter(m => isDueOn(m, today))
    .flatMap(m =>
      m.intakeTimes.map(t => ({ key: `${m.id}|${t}`, medication: m, time: t }))
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

// Converts "08:30" to minutes after midnight (510) so times can be compared.
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Converts 24-hour time to a friendly 12-hour format, e.g. "20:00" -> "8:00 PM".
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// Finds the next dose that has not been taken yet.
// If all remaining doses are already past, it returns the earliest one (overdue).
// Returns null when everything for today is taken.
export function getNextDose(doses: Dose[], taken: string[], now = new Date()): Dose | null {
  const pending = doses.filter(d => !taken.includes(d.key));
  if (pending.length === 0) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return pending.find(d => toMinutes(d.time) >= nowMinutes) ?? pending[0];
}

// Describes how far away a dose is: "in 25 min", "in 2 h 10 min" or "overdue".
export function timeUntil(time: string, now = new Date()): string {
  const diff = toMinutes(time) - (now.getHours() * 60 + now.getMinutes());
  if (diff < 0) return 'overdue';
  if (diff < 60) return `in ${diff} min`;
  return `in ${Math.floor(diff / 60)} h ${diff % 60} min`;
}

// ---------- How often a medication is taken ----------
// The backend has the same rules in Backend/server/app/services/schedule_rules.py.
// Keep the two in step.

export const WEEKDAYS = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 7, short: 'Sun', long: 'Sunday' },
];

// The schedule fields the frequency picker edits.
export interface FrequencyValue {
  frequency: Frequency;
  repeatEvery: number;
  daysOfWeek: number[];
  startDate: string; // "2026-11-23"
}

// Today's date as "YYYY-MM-DD" in the user's own time zone.
export function toDateString(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

// "2026-11-23" -> a local Date at midnight (new Date("2026-11-23") would be UTC).
function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

// 1 = Monday ... 7 = Sunday (JavaScript's getDay() uses 0 = Sunday).
function isoWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

// The medication fields that decide which days it is due.
export type ScheduleFields = Pick<Medication, 'frequency' | 'repeatEvery' | 'daysOfWeek' | 'startDate'>;

// True if the medication has doses on this day.
export function isDueOn(m: ScheduleFields, day: Date): boolean {
  const start = m.startDate ? parseDate(m.startDate) : null;
  if (start && daysBetween(start, day) < 0) return false;

  const every = m.repeatEvery ?? 1;
  const frequency = m.frequency ?? 'daily';

  if (frequency === 'weekly') {
    if (!(m.daysOfWeek ?? []).includes(isoWeekday(day))) return false;
    if (every === 1 || !start) return true;
    // Whole weeks between the Monday of the start week and the Monday of this week.
    const startMonday = new Date(start.getFullYear(), start.getMonth(), start.getDate() - (isoWeekday(start) - 1));
    const dayMonday = new Date(day.getFullYear(), day.getMonth(), day.getDate() - (isoWeekday(day) - 1));
    return Math.floor(daysBetween(startMonday, dayMonday) / 7) % every === 0;
  }

  if (frequency === 'monthly') {
    if (!start) return day.getDate() === 1;
    const months = (day.getFullYear() - start.getFullYear()) * 12 + (day.getMonth() - start.getMonth());
    if (months % every !== 0) return false;
    // Started on the 31st? In shorter months use the last day of the month.
    const lastDay = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
    return day.getDate() === Math.min(start.getDate(), lastDay);
  }

  // daily
  if (every === 1 || !start) return true;
  return daysBetween(start, day) % every === 0;
}

// The next day (from `from`, inclusive) the medication is due, or null if none within a year.
export function nextDueDate(m: ScheduleFields, from = new Date()): Date | null {
  for (let i = 0; i <= 400; i++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (isDueOn(m, day)) return day;
  }
  return null;
}

// Average share of days with doses: 1 for daily, 3/7 for Mon-Wed-Fri, about 1/30 for monthly.
// Used to work out how many days the remaining tablets will last.
export function dueDaysPerDay(m: ScheduleFields): number {
  const every = m.repeatEvery ?? 1;
  if (m.frequency === 'weekly') return (m.daysOfWeek ?? []).length / (7 * every);
  if (m.frequency === 'monthly') return 1 / (30.44 * every);
  return 1 / every;
}

// Short label such as "Every day", "Mon, Wed, Fri", "Every 2 weeks: Mon" or "Monthly on day 23".
export function describeFrequency(m: ScheduleFields): string {
  const every = m.repeatEvery ?? 1;
  if (m.frequency === 'weekly') {
    const days = WEEKDAYS.filter(d => (m.daysOfWeek ?? []).includes(d.value)).map(d => d.short);
    const list = days.length === 7 ? 'Every day' : days.join(', ');
    return every === 1 ? list : `Every ${every} weeks: ${list}`;
  }
  if (m.frequency === 'monthly') {
    const day = m.startDate ? parseDate(m.startDate).getDate() : 1;
    return every === 1 ? `Monthly on day ${day}` : `Every ${every} months on day ${day}`;
  }
  return every === 1 ? 'Every day' : `Every ${every} days`;
}

// Returns an error message for the picker's values, or '' if they are fine.
export function frequencyError(v: FrequencyValue): string {
  if (!v.startDate) return 'Choose a start date.';
  if (v.frequency === 'weekly' && v.daysOfWeek.length === 0) return 'Pick at least one day of the week.';
  if (!Number.isInteger(v.repeatEvery) || v.repeatEvery < 1 || v.repeatEvery > 12) {
    return 'Repeat every must be a whole number from 1 to 12.';
  }
  return '';
}
