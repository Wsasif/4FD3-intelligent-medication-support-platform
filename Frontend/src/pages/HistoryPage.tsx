// "Medication History" page. A table of past doses that can be filtered by
// medication and status, with an adherence percentage for the rows being shown.
// The data is sample data for now.

import { useState } from 'react';
import { intakeHistory } from '../data/mockData';
import type { IntakeRecord } from '../types';
import { useMedications } from '../context/useMedications';
import { formatTime } from '../utils/schedule';

// Badge colors for each status.
const statusColors: Record<IntakeRecord['status'], string> = {
  Taken: 'bg-green-100 text-green-800',
  Missed: 'bg-red-100 text-red-800',
  Skipped: 'bg-amber-100 text-amber-800',
};

export default function HistoryPage() {
  const { medications } = useMedications();
  const [medFilter, setMedFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Apply both filters, then sort with the newest records first
  const rows = intakeHistory
    .filter(r => medFilter === 'all' || r.medicationName === medFilter)
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  // Adherence = share of the shown rows that were taken
  const takenCount = rows.filter(r => r.status === 'Taken').length;
  const adherence = rows.length === 0 ? 0 : Math.round((takenCount / rows.length) * 100);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-blue-900">Medication History</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by medication"
          value={medFilter}
          onChange={e => setMedFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-3"
        >
          <option value="all">All medications</option>
          {medications.map(m => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-3"
        >
          <option value="all">All statuses</option>
          <option value="Taken">Taken</option>
          <option value="Missed">Missed</option>
          <option value="Skipped">Skipped</option>
        </select>

        <p className="ml-auto rounded-lg bg-sky-100 px-4 py-2 font-semibold text-blue-900">
          Adherence: {adherence}% ({takenCount} of {rows.length})
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead className="text-sm text-slate-600">
            <tr>
              <th className="p-3">Date</th>
              <th>Time</th>
              <th>Medication</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  No records match these filters.
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">{r.date}</td>
                <td>{formatTime(r.time)}</td>
                <td>
                  {r.medicationName} <span className="text-slate-500">{r.dosage}</span>
                </td>
                <td>
                  <span className={`rounded px-2 py-1 text-sm font-medium ${statusColors[r.status]}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}