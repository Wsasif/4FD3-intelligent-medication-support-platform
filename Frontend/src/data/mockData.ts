// Fake sample data so the screens have something to show.
// Will Replace these with real API calls once the backend is ready.

import type { Medication, AlertItem, IntakeRecord } from '../types';

// Starting list of medications when the app loads.
export const initialMedications: Medication[] = [
  { id: 'm1', name: 'Lisinopril', dosage: '10 mg', tabletsPerIntake: 1, condition: 'High Blood Pressure',
    intakeTimes: ['08:00'], remaining: 20, refillThreshold: 5, pharmacyId: 'p1', remindersOn: true },
  { id: 'm2', name: 'Metformin', dosage: '500 mg', tabletsPerIntake: 1, condition: 'Type 2 Diabetes',
    intakeTimes: ['08:00', '20:00'], remaining: 3, refillThreshold: 5, pharmacyId: 'p2', remindersOn: true },
  { id: 'm3', name: 'Atorvastatin', dosage: '20 mg', tabletsPerIntake: 1, condition: 'High Cholesterol',
    intakeTimes: ['21:00'], remaining: 28, refillThreshold: 5, pharmacyId: 'p1', remindersOn: true },
];

// Past alerts shown in the "Recent Alert History" table on the Alerts page.
export const alertHistory: AlertItem[] = [
  { id: 'h1', type: 'Reminder', message: 'Metformin 500 mg (taken now)', severity: 'Low', timestamp: '2026-10-16T10:12:00' },
  { id: 'h2', type: 'Refill', message: 'Atorvastatin 20 mg (3 tablets left)', severity: 'Medium', timestamp: '2026-10-15T18:30:00' },
  { id: 'h3', type: 'DDI', message: 'Lisinopril + Atorvastatin', severity: 'High', timestamp: '2026-10-14T07:45:00' },
];

// Past doses shown on the History page.
export const intakeHistory: IntakeRecord[] = [
  { id: 'r1', date: '2026-10-16', time: '08:00', medicationName: 'Lisinopril', dosage: '10 mg', status: 'Taken' },
  { id: 'r2', date: '2026-10-16', time: '08:00', medicationName: 'Metformin', dosage: '500 mg', status: 'Taken' },
  { id: 'r3', date: '2026-10-16', time: '20:00', medicationName: 'Metformin', dosage: '500 mg', status: 'Missed' },
  { id: 'r4', date: '2026-10-16', time: '21:00', medicationName: 'Atorvastatin', dosage: '20 mg', status: 'Taken' },
  { id: 'r5', date: '2026-10-15', time: '08:00', medicationName: 'Lisinopril', dosage: '10 mg', status: 'Taken' },
  { id: 'r6', date: '2026-10-15', time: '08:00', medicationName: 'Metformin', dosage: '500 mg', status: 'Skipped' },
  { id: 'r7', date: '2026-10-15', time: '20:00', medicationName: 'Metformin', dosage: '500 mg', status: 'Taken' },
  { id: 'r8', date: '2026-10-15', time: '21:00', medicationName: 'Atorvastatin', dosage: '20 mg', status: 'Taken' },
  { id: 'r9', date: '2026-10-14', time: '08:00', medicationName: 'Lisinopril', dosage: '10 mg', status: 'Taken' },
  { id: 'r10', date: '2026-10-14', time: '21:00', medicationName: 'Atorvastatin', dosage: '20 mg', status: 'Missed' },
];