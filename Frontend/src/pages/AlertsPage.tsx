// "Medication Alerts & Reminders" page. Shows the next dose (with Taken / Snooze),
// the active refill and drug-interaction alerts, and a table of past alerts.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Clock, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useMedications } from '../context/MedicationContext';
import { alertHistory } from '../data/mockData';
import { getInteractionAlerts, getRefillAlerts } from '../utils/alerts';
import { formatTime, getNextDose, getTodaysDoses, timeUntil } from '../utils/schedule';
import type { Severity } from '../types';

// Badge colors for each severity level.
const badgeStyles: Record<Severity, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-red-100 text-red-800',
};

// Background and border colors for the alert cards.
const cardStyles: Record<Severity, string> = {
  Low: 'border-green-200 bg-green-50',
  Medium: 'border-amber-200 bg-amber-50',
  High: 'border-red-200 bg-red-50',
};

// Readable names for the alert types in the history table.
const typeLabels = {
  Reminder: 'Reminder',
  Refill: 'Refill',
  DDI: 'DDI Alert',
};

export default function AlertsPage() {
  const { medications, takenDoses, markDoseTaken } = useMedications();
  const [snoozed, setSnoozed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Work out the next dose and the alerts that are active right now
  const doses = getTodaysDoses(medications);
  const next = getNextDose(doses, takenDoses);
  const alerts = [...getInteractionAlerts(medications), ...getRefillAlerts(medications)];

  // Marks the next dose as taken and clears the snooze message.
  function handleTaken() {
    if (!next) return;
    markDoseTaken(next.medication.id, next.time);
    setSnoozed(false);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-blue-900">Medication Alerts &amp; Reminders</h1>

      {/* Next medication card */}
      <section className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-5">
        {next ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Clock size={40} className="text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Next medication</p>
                <p className="text-3xl font-bold text-blue-900">{formatTime(next.time)}</p>
                <p className="text-sm text-slate-600">{timeUntil(next.time)}</p>
              </div>
              <div className="border-l border-slate-300 pl-4">
                <p className="font-semibold">{next.medication.name}</p>
                <p className="text-sm text-slate-600">{next.medication.dosage}</p>
                <p className="text-sm text-slate-600">
                  {next.medication.tabletsPerIntake}{' '}
                  {next.medication.tabletsPerIntake === 1 ? 'tablet' : 'tablets'}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-64">
              <button
                type="button"
                onClick={handleTaken}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Taken
              </button>
              <button
                type="button"
                onClick={() => setSnoozed(true)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-blue-800 hover:bg-slate-50"
              >
                Snooze
              </button>
              {snoozed && (
                <p role="status" className="text-sm text-slate-600">
                  Reminder snoozed for 10 minutes.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-lg font-semibold text-green-800">
            All medications for today have been taken.
          </p>
        )}
      </section>

      {/* Active alerts: refill warnings and drug interactions */}
      <section className="mb-4 flex flex-col gap-3" aria-label="Active alerts">
        {alerts.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
            No active alerts right now.
          </p>
        )}

        {alerts.map(alert => {
          const isDDI = alert.type === 'DDI';
          const open = expandedId === alert.id;
          return (
            <div key={alert.id} className={`rounded-xl border p-4 ${cardStyles[alert.severity]}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {isDDI ? (
                    <ShieldAlert className="mt-1 text-red-600" />
                  ) : (
                    <TriangleAlert className="mt-1 text-amber-600" />
                  )}
                  <div>
                    <p className={`font-bold ${isDDI ? 'text-red-800' : 'text-amber-900'}`}>
                      {isDDI ? 'Potential drug-to-drug interaction detected' : 'Refill needed soon'}
                    </p>
                    <p className="text-sm text-slate-700">{alert.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-1 text-sm font-medium ${badgeStyles[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  {/* Interaction alerts expand for more info, refill alerts link to pharmacies */}
                  {isDDI ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : alert.id)}
                      aria-expanded={open}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-blue-800 hover:bg-slate-50"
                    >
                      Review interaction {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  ) : (
                    <Link
                      to="/pharmacies"
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-blue-800 hover:bg-slate-50"
                    >
                      Find pharmacy
                    </Link>
                  )}
                </div>
              </div>

              {isDDI && open && (
                <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">
                  This combination may increase the risk of certain side effects. Please talk to your
                  doctor or pharmacist before changing how you take your medications. This alert is
                  assistance only and is not medical advice or diagnosis.
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Table of past alerts */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Recent Alert History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-slate-600">
              <tr>
                <th className="p-2">Date &amp; Time</th>
                <th>Type</th>
                <th>Details</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {alertHistory.map(a => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-2 text-sm">
                    {new Date(a.timestamp).toLocaleString('en-CA', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td>{typeLabels[a.type]}</td>
                  <td>{a.message}</td>
                  <td>
                    <span className={`rounded px-2 py-1 text-sm font-medium ${badgeStyles[a.severity]}`}>
                      {a.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}