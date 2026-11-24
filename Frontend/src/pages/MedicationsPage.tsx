// "My Medications" page. Shows a table of every medication (with refill status)
// and a "Today's Schedule" section where doses can be ticked off as taken.

import { Link } from 'react-router-dom';
import { Plus, Check, X } from 'lucide-react';
import { useMedications } from '../context/useMedications';
import { describeFrequency, dueDaysPerDay, formatTime, getTodaysDoses, isDueOn, nextDueDate } from '../utils/schedule';

export default function MedicationsPage() {
  const {
    medications,
    takenDoses,
    missedDoses,
    skippedDoses,
    markDoseTaken,
    markDoseSkipped,
    undoDose,
    loading,
    error,
    reloadMedications,
  } = useMedications();
  const doses = getTodaysDoses(medications);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-900">My Medications</h1>
        <Link
          to="/medications/new"
          aria-label="Add a medication"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={20} aria-hidden="true" /> Add Medication
        </Link>
      </div>

      {loading && <p role="status" className="mb-4 text-slate-600">Loading medications…</p>}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between rounded-lg bg-red-50 p-3 text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void reloadMedications()}
            className="rounded bg-white px-3 py-1 font-medium text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold">Current Medications</h2>
      <div
        role="region"
        aria-label="Scrollable current medications table"
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
      >
        <table className="w-full text-left">
          <caption className="sr-only">Current medications and refill status</caption>
          <thead className="text-sm text-slate-600">
            <tr>
              <th scope="col" className="p-3">Medication</th>
              <th scope="col">Tablets</th>
              <th scope="col">Next Intake</th>
              <th scope="col">Remaining</th>
              <th scope="col">Refill Status</th>
              <th scope="col">Condition</th>
              <th scope="col">Notes</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {!loading && medications.length === 0 && (
              <tr className="border-t border-slate-100">
                <td colSpan={8} className="p-4 text-slate-600">No medications have been added to your account yet.</td>
              </tr>
            )}
            {medications.map(m => {
              // Values worked out for each row of the table
              const low = m.remaining < m.refillThreshold;
              // Average tablets per day, e.g. 1 tablet on Mon/Wed/Fri = 3/7 a day.
              const perDay = m.tabletsPerIntake * Math.max(1, m.intakeTimes.length) * dueDaysPerDay(m);
              const daysLeft = perDay > 0 ? Math.floor(m.remaining / perDay) : 0;
              const today = new Date();
              const dueToday = isDueOn(m, today);
              const nextTime = dueToday
                ? m.intakeTimes.find(t => !takenDoses.includes(`${m.id}|${t}`))
                : undefined;
              // Not due today, or done for today: show the next day it is due.
              const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
              const nextDay = nextTime ? null : nextDueDate(m, tomorrow);
              const nextLabel = nextTime
                ? formatTime(nextTime)
                : nextDay
                  ? `${dueToday ? 'Done today · ' : ''}${nextDay.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}${m.intakeTimes[0] ? `, ${formatTime(m.intakeTimes[0])}` : ''}`
                  : 'Done today';

              return (
                <tr key={m.id} className="border-t border-slate-100">
                  <th scope="row" className="p-3 font-semibold">
                    {m.name} <span className="font-normal text-slate-500">{m.dosage}</span>
                    <span className="block text-sm font-normal text-slate-500">{describeFrequency(m)}</span>
                  </th>
                  <td>
                    {m.tabletsPerIntake} {m.tabletsPerIntake === 1 ? 'tablet' : 'tablets'}
                  </td>
                  <td>{nextLabel}</td>
                  <td>{m.remaining} tablets</td>
                  <td>
                    <span
                      className={`rounded px-2 py-1 text-sm font-medium ${
                        low ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {low ? 'Low (refill soon)' : `Good (${daysLeft} days)`}
                    </span>
                  </td>
                  <td>{m.condition}</td>
                  <td className="max-w-48 text-sm text-slate-600">
                    {m.notes || '—'}
                  </td>
                  <td>
                    <Link
                      to={`/medications/${m.id}/edit`}
                      className="mr-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Today's Schedule: one card per dose, with a circle to mark it taken */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-blue-900">Today's Schedule</h2>
        <p className="mb-3 text-sm text-slate-500">
          If you took a medication, check it off within 1 hour of its scheduled time.
          Otherwise, it will be recorded as missed in your history.
        </p>
        {doses.length === 0 ? (
          <p className="text-slate-500">No medications scheduled today.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {doses.map(d => {
              const taken = takenDoses.includes(d.key);
              const skipped = skippedDoses.includes(d.key);
              const persistedMissed = missedDoses.includes(d.key);
              const [hours, minutes] = d.time.split(':').map(Number);
              const scheduledMinutes = hours * 60 + minutes;
              const now = new Date();
              const nowMinutes = now.getHours() * 60 + now.getMinutes();
              const missed = persistedMissed || (
                !taken && !skipped && nowMinutes > scheduledMinutes + 60
              );
              // Same 1-hour window as checking off: after that the dose is final.
              const canUndo = (taken || skipped) && nowMinutes <= scheduledMinutes + 60;
              const undoButton = canUndo && (
                <button
                  type="button"
                  onClick={() => void undoDose(d.medication.id, d.time)}
                  aria-label={`Undo ${taken ? 'taken' : 'skipped'} for ${d.medication.name} at ${formatTime(d.time)}`}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Undo
                </button>
              );
              return (
                <li
                  key={d.key}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-semibold">{formatTime(d.time)}</p>
                    <p className="text-sm text-slate-600">
                      {d.medication.name} {d.medication.dosage}
                    </p>
                    {missed && <p className="mt-1 text-xs font-semibold text-red-700">Missed</p>}
                    {skipped && <p className="mt-1 text-xs font-semibold text-amber-700">Skipped</p>}
                  </div>
                  {taken ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white"
                        aria-label="Taken"
                      >
                        <Check size={18} />
                      </span>
                      {undoButton}
                    </div>
                  ) : missed ? (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white"
                      aria-label="Missed"
                      title="Recorded as missed"
                    >
                      <X size={18} />
                    </span>
                  ) : skipped ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white"
                        aria-label="Skipped"
                        title="Recorded as skipped"
                      >
                        <X size={18} />
                      </span>
                      {undoButton}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void markDoseTaken(d.medication.id, d.time)}
                        aria-label={`Mark ${d.medication.name} at ${formatTime(d.time)} as taken`}
                        className="h-9 w-9 rounded-full border-2 border-slate-300 hover:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => void markDoseSkipped(d.medication.id, d.time)}
                        aria-label={`Mark ${d.medication.name} at ${formatTime(d.time)} as skipped`}
                        className="text-xs font-medium text-amber-700 hover:underline"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}