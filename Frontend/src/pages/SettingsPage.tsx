  // Settings page: profile details, notification switches, and the text size option.
// Text size works for real (it scales the whole app). The rest only updates local
// state for now, with TODO notes where teammates will connect the backend.

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { applyTextSize, getSavedTextSize } from '../utils/textSize';
import type { TextSize } from '../utils/textSize';
import { useAuth } from '../context/useAuth';
import { getProfile, updateProfile } from '../utils/api';

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
        <span id={`${id}-label`} className="font-medium">
          {label}
        </span>
        <p id={`${id}-description`} className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
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
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [doseReminders, setDoseReminders] = useState(true);
  const [refillAlerts, setRefillAlerts] = useState(true);
  const [interactionAlerts, setInteractionAlerts] = useState(true);

  const [textSize, setTextSize] = useState<TextSize>(getSavedTextSize());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    getProfile(session.access_token)
      .then(profile => {
        if (!active) return;
        setName(profile.full_name);
        setEmail(profile.email ?? session.user.email ?? '');
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : 'Could not load your profile.');
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const isProfileLoading = Boolean(session?.access_token) && profileLoading;

  // Updates the selected option and applies it right away so the user sees the effect.
  function changeTextSize(size: TextSize) {
    setTextSize(size);
    applyTextSize(size);
  }

  // Shows a "saved" message for 3 seconds.
  async function handleSave() {
    if (!session?.access_token) return;
    if (!name.trim()) {
      setProfileError('Full name is required.');
      return;
    }
    setSaving(true);
    setProfileError('');
    try {
      const profile = await updateProfile(session.access_token, name);
      setName(profile.full_name);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: unknown) {
      setProfileError(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-blue-900">Settings</h1>

      <Section title="Profile">
        {isProfileLoading && <p role="status" className="mb-3 text-sm text-slate-500">Loading profile…</p>}
        {profileError && <p role="alert" className="mb-3 text-sm text-red-700">{profileError}</p>}
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
              readOnly
              disabled
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
          onClick={() => void handleSave()}
          disabled={saving || isProfileLoading}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {saving ? 'Saving…' : 'Save changes'}
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
