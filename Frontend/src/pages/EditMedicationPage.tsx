import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMedications } from '../context/useMedications';
import DrugPicker from '../components/DrugPicker';
import InteractionReview from '../components/InteractionReview';
import type { InteractionStatus } from '../components/InteractionReview';
import type { ApiDrug } from '../utils/api';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200';

export default function EditMedicationPage() {
  const navigate = useNavigate();
  const { medicationId } = useParams();
  const { medications, updateMedication } = useMedications();
  const medication = medications.find(item => item.id === medicationId);

  const [name, setName] = useState(medication?.name ?? '');
  const [dosage, setDosage] = useState(medication?.dosage ?? '');
  const [condition, setCondition] = useState(medication?.condition ?? '');
  const [remaining, setRemaining] = useState(String(medication?.remaining ?? 0));
  const [tabletsPerIntake, setTabletsPerIntake] = useState(String(medication?.tabletsPerIntake ?? 1));
  const [refillThreshold, setRefillThreshold] = useState(String(medication?.refillThreshold ?? 5));
  const [intakeTimes, setIntakeTimes] = useState<string[]>(medication?.intakeTimes ?? []);
  const [newTime, setNewTime] = useState('');
  const [notes, setNotes] = useState(medication?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [drug, setDrug] = useState<ApiDrug | null>(
    medication?.drugId != null
      ? { id: medication.drugId, name: medication.drugName ?? `Drug #${medication.drugId}` }
      : null,
  );
  const [interactionStatus, setInteractionStatus] = useState<InteractionStatus>({
    ready: true, hasMajor: false, acknowledged: false,
  });

  if (!medication) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Medication not found</h1>
        <button type="button" onClick={() => navigate('/medications')} className="mt-4 text-blue-700 underline">
          Back to medications
        </button>
      </div>
    );
  }

  // Only a newly linked drug is re-checked (the backend does the same).
  const drugChanged = (drug?.id ?? null) !== (medication.drugId ?? null);
  const checkNeeded = drugChanged && drug !== null;
  const blockedByMajor = checkNeeded && interactionStatus.hasMajor && !interactionStatus.acknowledged;
  const waitingForCheck = checkNeeded && !interactionStatus.ready;

  function addTime() {
    if (!newTime || intakeTimes.includes(newTime)) return;
    setIntakeTimes(prev => [...prev, newTime].sort());
    setNewTime('');
  }

  async function save() {
    if (!medication) return;
    if (!name.trim() || !dosage.trim()) {
      setError('Medication name and dosage are required.');
      return;
    }
    if (!/^\d+$/.test(remaining.trim()) || Number(remaining) < 0) {
      setError('Quantity remaining must be a whole number of 0 or more.');
      return;
    }
    if (intakeTimes.length === 0) {
      setError('Add at least one intake time.');
      return;
    }
    if (!/^[1-9]\d*$/.test(tabletsPerIntake)) {
      setError('Tablets per intake must be 1 or more.');
      return;
    }

    if (waitingForCheck || blockedByMajor) return;

    setSaving(true);
    setError('');
    try {
      await updateMedication(medication.id, {
        name: name.trim(),
        dosage: dosage.trim(),
        condition: condition.trim(),
        remaining: Number(remaining),
        tabletsPerIntake: Number(tabletsPerIntake),
        refillThreshold: Number(refillThreshold),
        intakeTimes,
        pharmacyId: medication.pharmacyId,
        remindersOn: medication.remindersOn,
        notes: notes.trim() || undefined,
        drugId: drug?.id ?? null,
      }, checkNeeded && interactionStatus.acknowledged);
      navigate('/medications');
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update the medication.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/medications')} aria-label="Back to medications" className="rounded-lg p-2 hover:bg-slate-100">
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-bold text-blue-900">Edit Medication</h1>
      </div>

      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-5">
          <label htmlFor="drugSearch" className="mb-1 block text-sm font-semibold text-slate-700">
            Linked drug (for interaction checks)
          </label>
          <DrugPicker value={drug} onChange={setDrug} initialQuery={name} />
          {checkNeeded && (
            <div className="mt-3">
              <InteractionReview
                key={drug.id}
                drugId={drug.id}
                excludeMedicationId={medication.id}
                onStatusChange={setInteractionStatus}
              />
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Medication name
            <input className={`${inputClass} mt-1`} value={name} onChange={event => setName(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Dosage
            <input className={`${inputClass} mt-1`} value={dosage} onChange={event => setDosage(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Disease / Condition
            <input className={`${inputClass} mt-1`} value={condition} onChange={event => setCondition(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Quantity remaining
            <input className={`${inputClass} mt-1`} type="number" min={0} value={remaining} onChange={event => setRemaining(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Tablets per intake
            <input className={`${inputClass} mt-1`} type="number" min={1} value={tabletsPerIntake} onChange={event => setTabletsPerIntake(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Refill alert threshold
            <select className={`${inputClass} mt-1`} value={refillThreshold} onChange={event => setRefillThreshold(event.target.value)}>
              {[3, 5, 7, 10, 14].map(number => (
                <option key={number} value={number}>Alert below {number} tablets</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">Intake times</p>
          <div className="flex gap-2">
            <input type="time" className={inputClass} value={newTime} onChange={event => setNewTime(event.target.value)} />
            <button type="button" onClick={addTime} className="rounded-lg bg-sky-100 px-4 font-semibold text-blue-800">Add</button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {intakeTimes.map(time => (
              <li key={time} className="flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm">
                {time}
                <button type="button" onClick={() => setIntakeTimes(prev => prev.filter(item => item !== time))} aria-label={`Remove ${time}`}>
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Notes
          <textarea className={`${inputClass} mt-1`} rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
        </label>

        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => navigate('/medications')} className="flex-1 rounded-lg bg-sky-100 px-5 py-3 font-semibold text-blue-800">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={saving || waitingForCheck || blockedByMajor} className="flex-1 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
