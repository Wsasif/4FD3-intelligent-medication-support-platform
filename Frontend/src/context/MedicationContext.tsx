// Shared state for the medication list and today's taken doses.
// Any page can read or update it with the useMedications() hook, so a change
// on one page (like adding a medication) shows up everywhere else.

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Medication } from '../types';
import { initialMedications } from '../data/mockData';

// What the context gives to the pages.
interface Ctx {
  medications: Medication[];
  takenDoses: string[]; // keys like "m1|08:00"
  addMedication: (m: Medication) => void;
  markDoseTaken: (medicationId: string, time: string) => void;
}

const MedicationContext = createContext<Ctx | null>(null);

// Wraps the app (see main.tsx) and holds the actual data.
// Everything here lives in memory, so it resets when the page is refreshed.
export function MedicationProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>(initialMedications);
  const [takenDoses, setTakenDoses] = useState<string[]>([]);

  // Adds a new medication to the end of the list.
  const addMedication = (m: Medication) => setMedications(prev => [...prev, m]);

  // Records a dose as taken and lowers that medication's remaining tablets.
  // Does nothing if the dose was already marked taken.
  const markDoseTaken = (medicationId: string, time: string) => {
    const key = `${medicationId}|${time}`;
    if (takenDoses.includes(key)) return; // already taken
    setTakenDoses(prev => [...prev, key]);
    setMedications(prev =>
      prev.map(m =>
        m.id === medicationId
          ? { ...m, remaining: Math.max(0, m.remaining - m.tabletsPerIntake) }
          : m
      )
    );
  };

  return (
    <MedicationContext.Provider value={{ medications, takenDoses, addMedication, markDoseTaken }}>
      {children}
    </MedicationContext.Provider>
  );
}

// Hook the pages use to get the shared data.
// Throws a clear error if it is used outside of MedicationProvider.
export function useMedications() {
  const ctx = useContext(MedicationContext);
  if (!ctx) throw new Error('useMedications must be used inside MedicationProvider');
  return ctx;
}