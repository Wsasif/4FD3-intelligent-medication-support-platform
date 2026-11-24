// "How often?" part of the Add and Edit medication forms.
// Lets the user choose every day, every few days, chosen days of the week,
// every 2 weeks, or once a month, plus the start date the pattern counts from.

import { WEEKDAYS } from '../utils/schedule';
import type { FrequencyValue } from '../utils/schedule';

type Preset = 'daily' | 'every_n_days' | 'weekly' | 'biweekly' | 'monthly';

const presets: { value: Preset; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Specific days of the week' },
  { value: 'biweekly', label: 'Every 2 weeks (bi-weekly)' },
  { value: 'monthly', label: 'Once a month' },
  { value: 'every_n_days', label: 'Every few days (e.g. every other day)' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200';

// Which dropdown option matches the saved values.
function presetOf(v: FrequencyValue): Preset {
  if (v.frequency === 'weekly') return v.repeatEvery === 1 ? 'weekly' : 'biweekly';
  if (v.frequency === 'monthly') return 'monthly';
  return v.repeatEvery === 1 ? 'daily' : 'every_n_days';
}

// Weekday (1 = Mon ... 7 = Sun) of a "YYYY-MM-DD" date, used as a default day.
function weekdayOf(dateString: string): number {
  const [y, m, d] = dateString.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 ? 7 : day;
}

interface Props {
  value: FrequencyValue;
  onChange: (value: FrequencyValue) => void;
  error?: string;
}

export default function FrequencyPicker({ value, onChange, error }: Props) {
  const preset = presetOf(value);

  function choosePreset(next: Preset) {
    // Weekly with no days picked yet: start with the start date's weekday.
    const days = value.daysOfWeek.length > 0 ? value.daysOfWeek : value.startDate ? [weekdayOf(value.startDate)] : [];
    switch (next) {
      case 'daily':
        return onChange({ ...value, frequency: 'daily', repeatEvery: 1, daysOfWeek: [] });
      case 'every_n_days':
        return onChange({ ...value, frequency: 'daily', repeatEvery: value.repeatEvery > 1 ? value.repeatEvery : 2, daysOfWeek: [] });
      case 'weekly':
        return onChange({ ...value, frequency: 'weekly', repeatEvery: 1, daysOfWeek: days });
      case 'biweekly':
        return onChange({ ...value, frequency: 'weekly', repeatEvery: 2, daysOfWeek: days });
      case 'monthly':
        return onChange({ ...value, frequency: 'monthly', repeatEvery: 1, daysOfWeek: [] });
    }
  }

  function toggleDay(day: number) {
    const days = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter(d => d !== day)
      : [...value.daysOfWeek, day].sort();
    onChange({ ...value, daysOfWeek: days });
  }

  const startDay = value.startDate ? Number(value.startDate.split('-')[2]) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="frequency" className="mb-1 block text-sm font-semibold text-slate-700">
          How often? <span className="text-red-600">*</span>
        </label>
        <select
          id="frequency"
          className={inputClass}
          value={preset}
          onChange={e => choosePreset(e.target.value as Preset)}
        >
          {presets.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="startDate" className="mb-1 block text-sm font-semibold text-slate-700">
          Start date <span className="text-red-600">*</span>
        </label>
        <input
          id="startDate"
          type="date"
          className={inputClass}
          value={value.startDate}
          onChange={e => onChange({ ...value, startDate: e.target.value })}
        />
      </div>

      {preset === 'every_n_days' && (
        <div>
          <label htmlFor="repeatEvery" className="mb-1 block text-sm font-semibold text-slate-700">
            Take it every … days
          </label>
          <input
            id="repeatEvery"
            type="number"
            min={2}
            max={12}
            className={inputClass}
            value={value.repeatEvery}
            onChange={e => onChange({ ...value, repeatEvery: Number(e.target.value) })}
          />
          <p className="mt-1 text-sm text-slate-500">2 = every other day, counted from the start date.</p>
        </div>
      )}

      {(preset === 'weekly' || preset === 'biweekly') && (
        <fieldset className="md:col-span-2">
          <legend className="mb-1 text-sm font-semibold text-slate-700">
            On which days? <span className="text-red-600">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(d => {
              const checked = value.daysOfWeek.includes(d.value);
              return (
                <label
                  key={d.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-blue-200 ${
                    checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleDay(d.value)}
                    aria-label={d.long}
                  />
                  {d.short}
                </label>
              );
            })}
          </div>
          {preset === 'biweekly' && (
            <p className="mt-1 text-sm text-slate-500">Every other week, starting with the week of the start date.</p>
          )}
        </fieldset>
      )}

      {preset === 'monthly' && startDay !== null && (
        <p className="text-sm text-slate-500 md:col-span-2">
          Taken on day {startDay} of each month (the last day in shorter months). Change the start date to pick another day.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 md:col-span-2">{error}</p>
      )}
    </div>
  );
}
