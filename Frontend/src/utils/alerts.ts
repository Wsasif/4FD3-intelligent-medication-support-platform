// Logic that decides which alerts to show.
// Alerts are calculated from current data, not stored anywhere.

import type { Medication, AlertItem, Severity } from '../types';
import type { ApiInteractionList, InteractionSeverity } from './api';

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

// Badge level for each DDInter severity. Unknown is never shown as low/safe.
const severityToBadge: Record<InteractionSeverity, Severity> = {
  major: 'High',
  moderate: 'Medium',
  unknown: 'Medium',
  minor: 'Low',
};

// Turns the backend's interaction list (GET /api/v1/interactions) into alert cards:
// one per interacting pair, plus one per medication we couldn't check.
export function toInteractionAlerts(list: ApiInteractionList): AlertItem[] {
  const now = new Date().toISOString();
  const pairs: AlertItem[] = list.interactions.map(p => ({
    id: `ddi-${p.medication_a_id}-${p.medication_b_id}`,
    type: 'DDI',
    message: `${p.medication_a_name} + ${p.medication_b_name}: Severity ${p.severity_label}.`,
    details: `${p.message} ${list.disclaimer}`,
    severity: severityToBadge[p.severity],
    timestamp: now,
  }));
  const unchecked: AlertItem[] = list.unchecked.map(m => ({
    id: `ddi-unchecked-${m.medication_id}`,
    type: 'DDI',
    title: 'Not checked for interactions',
    message: m.message,
    details: 'Link this medication to a drug on its Edit page so it can be checked. '
      + list.disclaimer,
    severity: 'Low',
    timestamp: now,
  }));
  return [...pairs, ...unchecked];
}
