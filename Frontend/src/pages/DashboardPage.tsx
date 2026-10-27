// Dashboard page: a quick summary of today. Shows counts (medications, doses taken,
// alerts, refills), the next dose, and a short list of things needing attention.

import { Link } from 'react-router-dom';
import { useMedications } from '../context/MedicationContext';
import { getInteractionAlerts, getRefillAlerts } from '../utils/alerts';
import { formatTime, getNextDose, getTodaysDoses } from '../utils/schedule';

interface StatCardProps {
  label: string;
  value: string | number;
  to: string;
  warn?: boolean;
}

// A clickable summary box with a label and a big number.
// "warn" turns it amber to draw attention to it.
function StatCard({ label, value, to, warn }: StatCardProps) {
  return (
    <Link
      to={to}
      className={`rounded-xl border p-5 hover:shadow ${
        warn ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-blue-900">{value}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { medications, takenDoses } = useMedications();

  // Numbers used by the summary cards
  const doses = getTodaysDoses(medications);
  const doneToday = doses.filter(d => takenDoses.includes(d.key)).length;
  const next = getNextDose(doses, takenDoses);

  const refillAlerts = getRefillAlerts(medications);
  const interactionAlerts = getInteractionAlerts(medications);
  const alertCount = refillAlerts.length + interactionAlerts.length;

  return (
    <div>
      {/* The name is hard-coded for now, it will come from the logged-in user later */}
      <h1 className="mb-1 text-2xl font-bold text-blue-900">Welcome back, Jane</h1>
      <p className="mb-5 text-slate-600">Here is your medication summary for today.</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active medications" value={medications.length} to="/medications" />
        <StatCard label="Doses taken today" value={`${doneToday} / ${doses.length}`} to="/medications" />
        <StatCard label="Active alerts" value={alertCount} to="/alerts" warn={alertCount > 0} />
        <StatCard label="Refills needed" value={refillAlerts.length} to="/pharmacies" warn={refillAlerts.length > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold">Next medication</h2>
          {next ? (
            <>
              <p className="text-2xl font-bold text-blue-900">{formatTime(next.time)}</p>
              <p>
                {next.medication.name} {next.medication.dosage}
              </p>
              <Link to="/alerts" className="mt-3 inline-block font-semibold text-blue-700 underline">
                Go to reminders
              </Link>
            </>
          ) : (
            <p className="text-green-800">Everything is taken for today.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold">Needs attention</h2>
          {alertCount === 0 ? (
            <p className="text-slate-600">No alerts right now.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {[...interactionAlerts, ...refillAlerts].map(a => (
                <li key={a.id}>{a.message}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}