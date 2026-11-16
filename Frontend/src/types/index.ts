// Shared TypeScript definitions used across the whole app.
// Keeping them in one file means the backend team can match their API to these shapes.

// How serious an alert is. Controls badge and card colors.
export type Severity = 'Low' | 'Medium' | 'High';

// One medication the user is taking.
export interface Medication {
  id: string;
  name: string;
  dosage: string;          // e.g. "10 mg"
  tabletsPerIntake: number;
  condition: string;
  intakeTimes: string[];   // 24-hour times, e.g. ["08:00", "21:00"]
  remaining: number;
  refillThreshold: number; // alert when remaining drops below this (spec says 5)
  pharmacyId: string;
  remindersOn: boolean;
  notes?: string;
}

// A single alert: a dose reminder, a refill warning, or a drug interaction (DDI).
export interface AlertItem {
  id: string;
  type: 'Reminder' | 'Refill' | 'DDI';
  message: string;
  severity: Severity;
  timestamp: string;
}

// One past dose in the History page (taken, missed or skipped).
export interface IntakeRecord {
  id: string;
  date: string; // "2026-10-16"
  time: string; // "08:00"
  medicationName: string;
  dosage: string;
  status: 'Taken' | 'Missed' | 'Skipped';
}