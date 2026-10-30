import { createContext } from 'react';
import type { Medication } from '../types';

export interface MedicationContextValue {
  medications: Medication[];
  takenDoses: string[];
  loading: boolean;
  error: string;
  reloadMedications: () => Promise<void>;
  addMedication: (m: Omit<Medication, 'id'>) => Promise<void>;
  markDoseTaken: (medicationId: string, time: string) => void;
}

export const MedicationContext = createContext<MedicationContextValue | null>(null);
