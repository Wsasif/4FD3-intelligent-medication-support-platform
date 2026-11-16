// Helpers for working out today's doses and which one is due next.

import type { Medication } from '../types';

// One scheduled dose: a medication at a specific time.
export interface Dose {
  key: string; // unique id for the dose, "medicationId|time"
  medication: Medication;
  time: string; // "08:00"
}

// Builds the list of every dose scheduled for today, sorted by time.
export function getTodaysDoses(meds: Medication[]): Dose[] {
  return meds
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