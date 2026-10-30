// Shared state for the medication list and today's taken doses.
// Any page can read or update it with the useMedications() hook, so a change
// on one page (like adding a medication) shows up everywhere else.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Medication } from '../types';
import { MedicationContext } from './MedicationContext';
import type { MedicationContextValue } from './MedicationContext';
import { useAuth } from './useAuth';
import { createMedication as postMedication, getMedications } from '../utils/api';

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
  };
}

// Wraps the app (see main.tsx) and holds the actual data.
export function MedicationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [storedMedications, setStoredMedications] = useState<Medication[]>([]);
  const [takenDoses, setTakenDoses] = useState<string[]>([]);
  const [loadedForToken, setLoadedForToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ token: string; message: string } | null>(null);
  const loadVersion = useRef(0);

  const accessToken = session?.access_token;
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const version = ++loadVersion.current;

    getMedications(accessToken)
      .then(rows => {
        if (!active || version !== loadVersion.current) return;
        setStoredMedications(rows.map(mapMedication));
        setTakenDoses([]);
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

  const medications = loadedForToken === accessToken ? storedMedications : [];
  const loading = Boolean(accessToken) && loadedForToken !== accessToken;
  const error = loadError && loadError.token === accessToken ? loadError.message : '';

  const reloadMedications = useCallback(async () => {
    if (!accessToken) return;
    const version = ++loadVersion.current;
    try {
      const rows = await getMedications(accessToken);
      if (version !== loadVersion.current) return;
      setStoredMedications(rows.map(mapMedication));
      setTakenDoses([]);
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

  async function addMedication(m: Omit<Medication, 'id'>) {
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
      notes: m.notes ?? null,
    });
    await reloadMedications();
  }

  // Records a dose as taken and lowers that medication's remaining tablets.
  // Does nothing if the dose was already marked taken.
  const markDoseTaken = (medicationId: string, time: string) => {
    const key = `${medicationId}|${time}`;
    if (takenDoses.includes(key)) return; // already taken
    setTakenDoses(prev => [...prev, key]);
    setStoredMedications(prev =>
      prev.map(m =>
        m.id === medicationId
          ? { ...m, remaining: Math.max(0, m.remaining - m.tabletsPerIntake) }
          : m
      )
    );
  };

  const contextValue: MedicationContextValue = {
    medications,
    takenDoses,
    loading,
    error,
    reloadMedications,
    addMedication,
    markDoseTaken,
  };

  return (
    <MedicationContext.Provider value={contextValue}>
      {children}
    </MedicationContext.Provider>
  );
}