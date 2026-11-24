// Shared state for the medication list and today's taken doses.
// Any page can read or update it with the useMedications() hook, so a change
// on one page (like adding a medication) shows up everywhere else.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AlertItem, Medication } from '../types';
import { MedicationContext } from './MedicationContext';
import type { MedicationContextValue } from './MedicationContext';
import { useAuth } from './useAuth';
import {
  createDoseLog,
  createMedication as postMedication,
  getDoseLogs,
  getInteractions,
  getMedications,
  undoDoseLog,
  updateMedication as patchMedication,
} from '../utils/api';
import { toInteractionAlerts } from '../utils/alerts';

function mapMedication(row: Awaited<ReturnType<typeof getMedications>>[number]): Medication {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    tabletsPerIntake: row.units_per_dose,
    condition: row.condition ?? '',
    intakeTimes: row.intake_times.map(time => time.slice(0, 5)),
    remaining: row.quantity_remaining,
    refillThreshold: row.low_quantity_alert,
    pharmacyId: '',
    remindersOn: true,
    notes: row.notes ?? undefined,
    drugId: row.drug_id,
    drugName: row.drug_name,
    frequency: row.frequency ?? 'daily',
    repeatEvery: row.repeat_every ?? 1,
    daysOfWeek: row.days_of_week ?? [],
    startDate: row.start_date,
  };
}

function localDoseKey(row: { medication_id: string; scheduled_for: string }): string | null {
  const date = new Date(row.scheduled_for);
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const today = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, '0'),
    String(new Date().getDate()).padStart(2, '0'),
  ].join('-');
  if (localDate !== today) return null;
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${row.medication_id}|${time}`;
}

function syncDoseStates(
  doseRows: Awaited<ReturnType<typeof getDoseLogs>>,
  setTakenDoses: (keys: string[]) => void,
  setMissedDoses: (keys: string[]) => void,
  setSkippedDoses: (keys: string[]) => void,
  setDoseLogIds: (ids: Record<string, string>) => void,
) {
  // Remember which dose log belongs to each "<medId>|HH:MM" key so a dose can be undone.
  const ids: Record<string, string> = {};
  for (const row of doseRows) {
    const key = localDoseKey(row);
    if (key) ids[key] = row.id;
  }
  setDoseLogIds(ids);
  setTakenDoses(doseRows
    .filter(row => row.status === 'taken')
    .map(row => localDoseKey(row))
    .filter((key): key is string => key !== null));
  setMissedDoses(doseRows
    .filter(row => row.status === 'missed')
    .map(row => localDoseKey(row))
    .filter((key): key is string => key !== null));
  setSkippedDoses(doseRows
    .filter(row => row.status === 'skipped')
    .map(row => localDoseKey(row))
    .filter((key): key is string => key !== null));
}

// Interaction alerts are extra: if that request fails, the rest of the app still loads,
// and the user sees one alert telling them the check couldn't run.
async function loadInteractionAlerts(accessToken: string): Promise<AlertItem[]> {
  try {
    return toInteractionAlerts(await getInteractions(accessToken));
  } catch {
    return [{
      id: 'ddi-check-failed',
      type: 'DDI',
      title: 'Interaction check unavailable',
      message: "We couldn't check your medications for interactions right now. "
        + 'Please contact your doctor or pharmacist to verify your combinations.',
      severity: 'Medium',
      timestamp: new Date().toISOString(),
    }];
  }
}

// Wraps the app (see main.tsx) and holds the actual data.
export function MedicationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [storedMedications, setStoredMedications] = useState<Medication[]>([]);
  const [takenDoses, setTakenDoses] = useState<string[]>([]);
  const [missedDoses, setMissedDoses] = useState<string[]>([]);
  const [skippedDoses, setSkippedDoses] = useState<string[]>([]);
  const [doseLogIds, setDoseLogIds] = useState<Record<string, string>>({});
  const [loadedForToken, setLoadedForToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ token: string; message: string } | null>(null);
  const [storedInteractionAlerts, setStoredInteractionAlerts] = useState<AlertItem[]>([]);
  const loadVersion = useRef(0);

  const accessToken = session?.access_token;
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const version = ++loadVersion.current;

    Promise.all([getMedications(accessToken), getDoseLogs(accessToken), loadInteractionAlerts(accessToken)])
      .then(([medicationRows, doseRows, interactionAlerts]) => {
        if (!active || version !== loadVersion.current) return;
        setStoredMedications(medicationRows.map(mapMedication));
        setStoredInteractionAlerts(interactionAlerts);
        syncDoseStates(doseRows, setTakenDoses, setMissedDoses, setSkippedDoses, setDoseLogIds);
        setLoadError(null);
        setLoadedForToken(accessToken);
      })
      .catch((requestError: unknown) => {
        if (!active || version !== loadVersion.current) return;
        setLoadError({
          token: accessToken,
          message: requestError instanceof Error ? requestError.message : 'Could not load medications.',
        });
        setLoadedForToken(accessToken);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const interval = window.setInterval(() => {
      void getDoseLogs(accessToken).then(doseRows => {
        syncDoseStates(doseRows, setTakenDoses, setMissedDoses, setSkippedDoses, setDoseLogIds);
      }).catch(() => {
        // The next reconciliation attempt will retry automatically.
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [accessToken]);

  const medications = loadedForToken === accessToken ? storedMedications : [];
  const interactionAlerts = loadedForToken === accessToken ? storedInteractionAlerts : [];
  const loading = Boolean(accessToken) && loadedForToken !== accessToken;
  const error = loadError && loadError.token === accessToken ? loadError.message : '';

  const reloadMedications = useCallback(async () => {
    if (!accessToken) return;
    const version = ++loadVersion.current;
    try {
      const [rows, doseRows, interactionRows] = await Promise.all([
        getMedications(accessToken),
        getDoseLogs(accessToken),
        loadInteractionAlerts(accessToken),
      ]);
      if (version !== loadVersion.current) return;
      setStoredMedications(rows.map(mapMedication));
      setStoredInteractionAlerts(interactionRows);
      syncDoseStates(doseRows, setTakenDoses, setMissedDoses, setSkippedDoses, setDoseLogIds);
      setLoadError(null);
      setLoadedForToken(accessToken);
    } catch (requestError: unknown) {
      if (version !== loadVersion.current) return;
      setLoadError({
        token: accessToken,
        message: requestError instanceof Error ? requestError.message : 'Could not load medications.',
      });
      setLoadedForToken(accessToken);
    }
  }, [accessToken]);

  async function addMedication(m: Omit<Medication, 'id'>, acknowledgeInteractions = false) {
    if (!accessToken) throw new Error('Sign in before adding a medication.');
    await postMedication(accessToken, {
      name: m.name,
      dosage: m.dosage,
      units_per_dose: m.tabletsPerIntake,
      condition: m.condition,
      quantity_remaining: m.remaining,
      refill_alert_days: 7,
      low_quantity_alert: m.refillThreshold,
      intake_times: m.intakeTimes,
      pharmacy_id: null,
      drug_id: m.drugId ?? null,
      notes: m.notes ?? null,
      frequency: m.frequency ?? 'daily',
      repeat_every: m.repeatEvery ?? 1,
      days_of_week: m.daysOfWeek ?? [],
      start_date: m.startDate ?? null,
    }, acknowledgeInteractions);
    await reloadMedications();
  }

  async function updateMedication(
    medicationId: string,
    m: Omit<Medication, 'id'>,
    acknowledgeInteractions = false,
  ) {
    if (!accessToken) throw new Error('Sign in before updating a medication.');
    await patchMedication(accessToken, medicationId, {
      name: m.name,
      dosage: m.dosage,
      units_per_dose: m.tabletsPerIntake,
      condition: m.condition,
      quantity_remaining: m.remaining,
      low_quantity_alert: m.refillThreshold,
      intake_times: m.intakeTimes,
      drug_id: m.drugId ?? null,
      notes: m.notes ?? null,
      frequency: m.frequency ?? 'daily',
      repeat_every: m.repeatEvery ?? 1,
      days_of_week: m.daysOfWeek ?? [],
      start_date: m.startDate ?? null,
    }, acknowledgeInteractions);
    await reloadMedications();
  }

  // Records a dose as taken and lowers that medication's remaining tablets.
  // Does nothing if the dose was already marked taken.
  const markDoseTaken = async (medicationId: string, time: string) => {
    const key = `${medicationId}|${time}`;
    if (!accessToken || takenDoses.includes(key) || missedDoses.includes(key) || skippedDoses.includes(key)) return;

    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledFor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    try {
      await createDoseLog(accessToken, {
        medication_id: medicationId,
        scheduled_for: scheduledFor.toISOString(),
        status: 'taken',
      });
      await reloadMedications();
      const doseRows = await getDoseLogs(accessToken);
      syncDoseStates(doseRows, setTakenDoses, setMissedDoses, setSkippedDoses, setDoseLogIds);
    } catch (requestError: unknown) {
      setLoadError({
        token: accessToken,
        message: requestError instanceof Error ? requestError.message : 'Could not record this dose.',
      });
    }
  };

  const markDoseSkipped = async (medicationId: string, time: string) => {
    const key = `${medicationId}|${time}`;
    if (!accessToken || takenDoses.includes(key) || skippedDoses.includes(key) || missedDoses.includes(key)) return;

    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledFor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    try {
      await createDoseLog(accessToken, {
        medication_id: medicationId,
        scheduled_for: scheduledFor.toISOString(),
        status: 'skipped',
      });
      const doseRows = await getDoseLogs(accessToken);
      syncDoseStates(doseRows, setTakenDoses, setMissedDoses, setSkippedDoses, setDoseLogIds);
    } catch (requestError: unknown) {
      setLoadError({
        token: accessToken,
        message: requestError instanceof Error ? requestError.message : 'Could not skip this dose.',
      });
    }
  };

  // Undo a dose marked Taken or Skipped by mistake, then reload so the
  // tablet count and the check-off state both update.
  const undoDose = async (medicationId: string, time: string) => {
    const doseLogId = doseLogIds[`${medicationId}|${time}`];
    if (!accessToken || !doseLogId) return;

    try {
      await undoDoseLog(accessToken, doseLogId);
      await reloadMedications();
    } catch (requestError: unknown) {
      setLoadError({
        token: accessToken,
        message: requestError instanceof Error ? requestError.message : 'Could not undo this dose.',
      });
    }
  };

  const contextValue: MedicationContextValue = {
    medications,
    takenDoses,
    missedDoses,
    skippedDoses,
    loading,
    error,
    interactionAlerts,
    reloadMedications,
    addMedication,
    updateMedication,
    markDoseTaken,
    markDoseSkipped,
    undoDose,
  };

  return (
    <MedicationContext.Provider value={contextValue}>
      {children}
    </MedicationContext.Provider>
  );
}
