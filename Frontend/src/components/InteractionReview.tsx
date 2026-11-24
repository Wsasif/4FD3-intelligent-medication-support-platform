// Shows the result of the interaction check for one drug before the user saves.
// - Major interactions need a tick ("I have talked to my doctor...") before saving.
// - Unknown severity is shown as "Unspecified / Exercise Caution", never as safe.
// - Medications that aren't linked to a drug are listed as "not checked".

import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { checkInteractions } from '../utils/api';
import type { ApiInteractionCheck, InteractionSeverity } from '../utils/api';

export interface InteractionStatus {
  ready: boolean;          // check finished (or nothing to check)
  hasMajor: boolean;
  acknowledged: boolean;
}

interface InteractionReviewProps {
  drugId: number | null | undefined;
  excludeMedicationId?: string;          // when editing, don't compare with itself
  onStatusChange: (status: InteractionStatus) => void;
}

const severityStyles: Record<InteractionSeverity, string> = {
  major: 'border-red-300 bg-red-50 text-red-900',
  moderate: 'border-amber-300 bg-amber-50 text-amber-900',
  unknown: 'border-amber-300 bg-amber-50 text-amber-900',
  minor: 'border-slate-300 bg-slate-50 text-slate-900',
};

export default function InteractionReview({ drugId, excludeMedicationId, onStatusChange }: InteractionReviewProps) {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [result, setResult] = useState<{ key: string; data: ApiInteractionCheck } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const key = `${drugId ?? ''}|${excludeMedicationId ?? ''}`;

  useEffect(() => {
    if (drugId == null || !accessToken) return;
    let active = true;
    checkInteractions(accessToken, drugId, excludeMedicationId)
      .then(data => {
        if (active) setResult({ key, data });
      })
      .catch((e: unknown) => {
        if (active) setError({ key, message: e instanceof Error ? e.message : 'Interaction check failed.' });
      });
    return () => {
      active = false;
    };
  }, [drugId, excludeMedicationId, accessToken, key]);

  const data = result?.key === key ? result.data : null;
  const failed = error?.key === key ? error.message : '';
  const hasMajor = Boolean(data?.has_major);
  const ready = drugId == null || data !== null || failed !== '';

  // Tell the parent page whether saving is allowed yet.
  useEffect(() => {
    onStatusChange({ ready, hasMajor, acknowledged: hasMajor && acknowledged });
  }, [ready, hasMajor, acknowledged, onStatusChange]);

  if (drugId == null) {
    return (
      <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          This medication is not linked to a drug in our database, so it can't be checked for
          interactions. Please contact your doctor or pharmacist to verify it is safe with your
          other medications.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        We couldn't run the interaction check ({failed}). Please contact your doctor or pharmacist
        to verify this medication is safe with your other medications.
      </p>
    );
  }

  if (!data) {
    return <p role="status" className="text-sm text-slate-600">Checking for interactions…</p>;
  }

  const nothingFound = data.interactions.length === 0 && data.same_drug.length === 0;

  return (
    <section aria-label="Interaction check" className="space-y-3">
      <h3 className="font-semibold">Interaction check for {data.drug_name}</h3>

      {nothingFound && (
        <div className="flex gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>No interactions found with your linked medications.</p>
        </div>
      )}

      {data.interactions.map(i => (
        <div key={i.medication_id} className={`rounded-lg border p-3 text-sm ${severityStyles[i.severity]}`}>
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert size={18} aria-hidden="true" />
            With {i.medication_name} — Severity: {i.severity_label}
          </p>
          <p className="mt-1">{i.message}</p>
        </div>
      ))}

      {data.same_drug.map(m => (
        <div key={m.medication_id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {m.message}
        </div>
      ))}

      {data.unchecked.length > 0 && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800">
          <p className="font-semibold">Not checked (not linked to a drug in our database):</p>
          <ul className="mt-1 list-disc pl-5">
            {data.unchecked.map(m => <li key={m.medication_id}>{m.medication_name}</li>)}
          </ul>
          <p className="mt-1">Please contact your doctor or pharmacist to verify these combinations.</p>
        </div>
      )}

      {hasMajor && (
        <label className="flex items-start gap-2 rounded-lg border border-red-300 bg-white p-3 text-sm font-medium text-red-900">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
          />
          I understand this is a major interaction, and my doctor or pharmacist has approved taking
          these together.
        </label>
      )}

      <p className="text-xs text-slate-500">{data.disclaimer}</p>
    </section>
  );
}
