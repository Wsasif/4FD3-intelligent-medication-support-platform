// "Medication History" page. Past doses are loaded from persisted dose logs.

import { useEffect, useState } from 'react';
import type { IntakeRecord } from '../types';
import { useMedications } from '../context/useMedications';
import { useAuth } from '../context/useAuth';
import { getDoseLogs } from '../utils/api';
import type { ApiDoseLog } from '../utils/api';
import { formatTime } from '../utils/schedule';

// Badge colors for each status.
const statusColors: Record<IntakeRecord['status'], string> = {
  Taken: 'bg-green-100 text-green-800',
  Missed: 'bg-red-100 text-red-800',
  Skipped: 'bg-amber-100 text-amber-800',
};

export default function HistoryPage() {
  const { medications } = useMedications();
  const { session } = useAuth();
  const [medFilter, setMedFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rows, setRows] = useState<IntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;

    getDoseLogs(session.access_token)
      .then((logs: ApiDoseLog[]) => {
        if (!active) return;
        setRows(logs.map(log => {
          const scheduled = new Date(log.scheduled_for);
          const date = [
            scheduled.getFullYear(),
            String(scheduled.getMonth() + 1).padStart(2, '0'),
            String(scheduled.getDate()).padStart(2, '0'),
          ].join('-');
          return {
            id: log.id,
            date,
            time: `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`,
            medicationName: log.medication_name,
            dosage: log.dosage,
            status: log.status === 'taken' ? 'Taken' : log.status === 'missed' ? 'Missed' : 'Skipped',
          };
        }));
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load medication history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  const isLoading = Boolean(session?.access_token) && loading;

  // Apply both filters, then sort with the newest records first
  const filteredRows = rows
    .filter(r => medFilter === 'all' || r.medicationName === medFilter)
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  // Adherence = share of the shown rows that were taken
  const takenCount = filteredRows.filter(r => r.status === 'Taken').length;
  const adherence = filteredRows.length === 0 ? 0 : Math.round((takenCount / filteredRows.length) * 100);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-blue-900">Medication History</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter medication history by medication"
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
          aria-label="Filter medication history by status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-3"
        >
          <option value="all">All statuses</option>
          <option value="Taken">Taken</option>
          <option value="Missed">Missed</option>
          <option value="Skipped">Skipped</option>
        </select>

        <p role="status" aria-live="polite" className="ml-auto rounded-lg bg-sky-100 px-4 py-2 font-semibold text-blue-900">
          Adherence: {adherence}% ({takenCount} of {filteredRows.length})
        </p>
      </div>

      {isLoading && <p role="status" className="mb-4 text-slate-600">Loading medication history…</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <caption className="sr-only">Medication dose history and adherence records</caption>
          <thead className="text-sm text-slate-600">
            <tr>
              <th scope="col" className="p-3">Date</th>
              <th scope="col">Time</th>
              <th scope="col">Medication</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  No records match these filters.
                </td>
              </tr>
            )}
            {filteredRows.map(r => (
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
