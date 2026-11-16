import { useContext } from 'react';
import { MedicationContext } from './MedicationContext';

export function useMedications() {
  const context = useContext(MedicationContext);
  if (!context) throw new Error('useMedications must be used inside MedicationProvider');
  return context;
}
