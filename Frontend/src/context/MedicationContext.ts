import { createContext } from 'react';
import type { AlertItem, Medication } from '../types';

export interface MedicationContextValue {
  medications: Medication[];
  takenDoses: string[];
  missedDoses: string[];
  skippedDoses: string[];
  loading: boolean;
  error: string;
  interactionAlerts: AlertItem[];   // from GET /interactions (DDInter)
  reloadMedications: () => Promise<void>;
  addMedication: (m: Omit<Medication, 'id'>, acknowledgeInteractions?: boolean) => Promise<void>;
  updateMedication: (
    medicationId: string,
    m: Omit<Medication, 'id'>,
    acknowledgeInteractions?: boolean,
  ) => Promise<void>;
  markDoseTaken: (medicationId: string, time: string) => Promise<void>;
  markDoseSkipped: (medicationId: string, time: string) => Promise<void>;
}

export const MedicationContext = createContext<MedicationContextValue | null>(null);
