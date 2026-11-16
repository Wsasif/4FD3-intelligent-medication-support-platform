// Logic that decides which alerts to show.
// Alerts are calculated from the current medication list, not stored anywhere.

import type { Medication, AlertItem } from '../types';

// Small sample table of interacting drug pairs (lowercase names).
// A real version would get this from the backend or a drug database.
const interactions = [
  { a: 'lisinopril', b: 'atorvastatin', severity: 'High' as const,
    note: 'May increase the risk of certain side effects. Consult your healthcare provider.' },
];

// Returns one refill alert for every medication whose remaining count
// is below its refill threshold.
export function getRefillAlerts(meds: Medication[]): AlertItem[] {
  return meds
    .filter(m => m.remaining < m.refillThreshold)
    .map(m => ({
      id: `refill-${m.id}`,
      type: 'Refill',
      message: `${m.name} ${m.dosage} has ${m.remaining} tablets remaining (below ${m.refillThreshold}).`,
      severity: 'Medium',
      timestamp: new Date().toISOString(),
    }));
}

// Returns an alert for each known interacting pair where the user
// is taking both medications.
export function getInteractionAlerts(meds: Medication[]): AlertItem[] {
  const names = meds.map(m => m.name.toLowerCase());
  return interactions
    .filter(i => names.includes(i.a) && names.includes(i.b))
    .map(i => ({
      id: `ddi-${i.a}-${i.b}`,
      type: 'DDI',
      message: `${i.a} + ${i.b}: ${i.note}`,
      severity: i.severity,
      timestamp: new Date().toISOString(),
    }));
}