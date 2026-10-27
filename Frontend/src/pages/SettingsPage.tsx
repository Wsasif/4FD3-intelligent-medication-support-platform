// Settings page: profile details, notification switches, and the text size option.
// Text size works for real (it scales the whole app). The rest only updates local
// state for now, with TODO notes where teammates will connect the backend.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { applyTextSize, getSavedTextSize } from '../utils/textSize';
import type { TextSize } from '../utils/textSize';

interface ToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

// An on/off switch with a label and a short description.
// role="switch" lets screen readers announce it properly.
function Toggle({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

// A white card with a heading, used to group related settings.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold text-blue-900">{title}</h2>
      {children}
    </section>
  );
}

// The choices shown in the text size section.
const sizeOptions: { value: TextSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200';

export default function SettingsPage() {
  // TODO (team): load these from the backend once user accounts exist
  const [name, setName] = useState('Jane Doe');
  const [email, setEmail] = useState('jane.doe@example.com');

  const [doseReminders, setDoseReminders] = useState(true);
  const [refillAlerts, setRefillAlerts] = useState(true);
  const [interactionAlerts, setInteractionAlerts] = useState(true);

  const [textSize, setTextSize] = useState<TextSize>(getSavedTextSize());
  const [saved, setSaved] = useState(false);

  // Updates the selected option and applies it right away so the user sees the effect.
  function changeTextSize(size: TextSize) {
    setTextSize(size);
    applyTextSize(size);
  }

  // Shows a "saved" message for 3 seconds.
  function handleSave() {
    // TODO (team): send name, email and notification choices to the API
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-blue-900">Settings</h1>

      <Section title="Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              id="fullName"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={inputClass}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Notifications">
        <div className="divide-y divide-slate-100">
          <Toggle
            id="doseReminders"
            label="Medication reminders"
            description="Remind me when it is time to take a dose."
            checked={doseReminders}
            onChange={setDoseReminders}
          />
          <Toggle
            id="refillAlerts"
            label="Refill alerts"
            description="Tell me when a medication is running low."
            checked={refillAlerts}
            onChange={setRefillAlerts}
          />
          <Toggle
            id="interactionAlerts"
            label="Drug interaction alerts"
            description="Warn me if two of my medications may interact."
            checked={interactionAlerts}
            onChange={setInteractionAlerts}
          />
        </div>
      </Section>

      <Section title="Display">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Text size</legend>
          <div className="flex flex-wrap gap-3">
            {sizeOptions.map(opt => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 ${
                  textSize === opt.value
                    ? 'border-blue-600 bg-sky-50 font-semibold'
                    : 'border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="textSize"
                  value={opt.value}
                  checked={textSize === opt.value}
                  onChange={() => changeTextSize(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Account & Security">
        {/* TODO (team): change password, connected accounts (OAuth), delete account */}
        <p className="text-slate-500">More account options will be added here.</p>
      </Section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Save changes
        </button>
        {saved && (
          <p role="status" className="font-medium text-green-700">
            Settings saved.
          </p>
        )}
      </div>
    </div>
  );
}