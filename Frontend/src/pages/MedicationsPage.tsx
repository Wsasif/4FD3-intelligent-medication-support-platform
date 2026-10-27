// "My Medications" page. Shows a table of every medication (with refill status)
// and a "Today's Schedule" section where doses can be ticked off as taken.

import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Check } from 'lucide-react';
import { useMedications } from '../context/MedicationContext';
import { formatTime, getTodaysDoses } from '../utils/schedule';

export default function MedicationsPage() {
  const { medications, takenDoses, markDoseTaken } = useMedications();
  const doses = getTodaysDoses(medications);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-900">My Medications</h1>
        <Link
          to="/medications/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={20} /> Add Medication
        </Link>
      </div>

      <h2 className="mb-2 text-lg font-semibold">Current Medications</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead className="text-sm text-slate-600">
            <tr>
              <th className="p-3">Medication</th>
              <th>Dosage</th>
              <th>Next Intake</th>
              <th>Remaining</th>
              <th>Refill Status</th>
              <th>Condition</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {medications.map(m => {
              // Values worked out for each row of the table
              const low = m.remaining < m.refillThreshold;
              const perDay = m.tabletsPerIntake * Math.max(1, m.intakeTimes.length);
              const daysLeft = Math.floor(m.remaining / perDay);
              const nextTime = m.intakeTimes.find(t => !takenDoses.includes(`${m.id}|${t}`));
              const frequency = m.intakeTimes.length === 1 ? 'daily' : `${m.intakeTimes.length}x daily`;

              return (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="p-3 font-semibold">
                    {m.name} <span className="font-normal text-slate-500">{m.dosage}</span>
                  </td>
                  <td>
                    {m.tabletsPerIntake} {m.tabletsPerIntake === 1 ? 'tablet' : 'tablets'}
                    <span className="text-slate-500"> ({frequency})</span>
                  </td>
                  <td>{nextTime ? formatTime(nextTime) : 'Done today'}</td>
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
                  <td>
                    <ChevronRight />
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
        {doses.length === 0 ? (
          <p className="text-slate-500">No medications scheduled today.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {doses.map(d => {
              const taken = takenDoses.includes(d.key);
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
                  </div>
                  {taken ? (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white"
                      aria-label="Taken"
                    >
                      <Check size={18} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markDoseTaken(d.medication.id, d.time)}
                      aria-label={`Mark ${d.medication.name} at ${formatTime(d.time)} as taken`}
                      className="h-9 w-9 rounded-full border-2 border-slate-300 hover:border-blue-600"
                    />
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