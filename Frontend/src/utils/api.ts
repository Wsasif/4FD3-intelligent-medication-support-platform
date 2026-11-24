const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

export interface ApiMedication {
  id: string;
  name: string;
  dosage: string;
  units_per_dose: number;
  condition: string | null;
  quantity_remaining: number;
  low_quantity_alert: number;
  intake_times: string[];
  notes: string | null;
  drug_id: number | null;
  drug_name: string | null;
}

export interface CreateMedicationRequest {
  name: string;
  dosage: string;
  units_per_dose: number;
  condition: string;
  quantity_remaining: number;
  refill_alert_days: number;
  low_quantity_alert: number;
  intake_times: string[];
  pharmacy_id: null;
  drug_id: number | null;
  notes: string | null;
}

export interface ApiDoseLog {
  id: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  scheduled_for: string;
  taken_at: string | null;
  status: 'taken' | 'skipped' | 'missed';
}

export interface CreateDoseLogRequest {
  medication_id: string;
  scheduled_for: string;
  status: 'taken' | 'skipped' | 'missed';
}

export interface ApiProfile {
  id: string;
  email: string | null;
  full_name: string;
}

export interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  units_per_dose?: number;
  condition?: string;
  quantity_remaining?: number;
  low_quantity_alert?: number;
  intake_times?: string[];
  drug_id?: number | null;
  notes?: string | null;
}

// ---------- Drug search and interaction checks (DDInter 2.0) ----------

export interface ApiDrug {
  id: number;
  name: string;
}

export type InteractionSeverity = 'major' | 'moderate' | 'minor' | 'unknown';

export interface ApiInteraction {
  medication_id: string;
  medication_name: string;
  drug_name: string;
  severity: InteractionSeverity;
  severity_label: string;
  message: string;
}

export interface ApiUncheckedMedication {
  medication_id: string;
  medication_name: string;
  message: string;
}

export interface ApiInteractionCheck {
  drug_id: number;
  drug_name: string;
  interactions: ApiInteraction[];
  has_major: boolean;
  same_drug: ApiUncheckedMedication[];
  unchecked: ApiUncheckedMedication[];
  disclaimer: string;
}

export interface ApiInteractionPair {
  medication_a_id: string;
  medication_a_name: string;
  medication_b_id: string;
  medication_b_name: string;
  severity: InteractionSeverity;
  severity_label: string;
  message: string;
}

export interface ApiInteractionList {
  interactions: ApiInteractionPair[];
  unchecked: ApiUncheckedMedication[];
  disclaimer: string;
}

// Thrown for any failed request. status lets pages react to codes like 409.
export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function requestApi<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = `Backend request failed (HTTP ${response.status}).`;
    let detail: unknown = null;
    if (body) {
      try {
        const parsed: unknown = JSON.parse(body);
        if (typeof parsed === 'object' && parsed !== null && 'detail' in parsed) {
          detail = parsed.detail;
          if (typeof detail === 'string') {
            message = detail;
          } else if (typeof detail === 'object' && detail !== null && 'message' in detail) {
            message = String(detail.message);
          } else {
            message = JSON.stringify(detail);
          }
        } else {
          message = body;
        }
      } catch {
        message = body;
      }
    }
    throw new ApiError(message, response.status, detail);
  }

  return response.json() as Promise<T>;
}

export async function checkApiHealth(signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal });
  if (!response.ok) {
    throw new Error(`Backend health check returned HTTP ${response.status}.`);
  }

  const body: unknown = await response.json();
  if (
    typeof body !== 'object' ||
    body === null ||
    !('status' in body) ||
    body.status !== 'ok'
  ) {
    throw new Error('Backend health check returned an unexpected response.');
  }
}

export function getMedications(accessToken: string): Promise<ApiMedication[]> {
  return requestApi<ApiMedication[]>('/api/v1/medications', accessToken);
}

// acknowledgeInteractions: the user has seen a major interaction warning and still wants to save.
function ackQuery(acknowledgeInteractions?: boolean): string {
  return acknowledgeInteractions ? '?acknowledge_interactions=true' : '';
}

export function createMedication(
  accessToken: string,
  medication: CreateMedicationRequest,
  acknowledgeInteractions?: boolean,
): Promise<ApiMedication> {
  return requestApi<ApiMedication>(`/api/v1/medications${ackQuery(acknowledgeInteractions)}`, accessToken, {
    method: 'POST',
    body: JSON.stringify(medication),
  });
}

export function updateMedication(
  accessToken: string,
  medicationId: string,
  medication: UpdateMedicationRequest,
  acknowledgeInteractions?: boolean,
): Promise<ApiMedication> {
  const path = `/api/v1/medications/${medicationId}${ackQuery(acknowledgeInteractions)}`;
  return requestApi<ApiMedication>(path, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(medication),
  });
}

export function searchDrugs(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<ApiDrug[]> {
  const q = encodeURIComponent(query.trim());
  return requestApi<ApiDrug[]>(`/api/v1/drugs/search?q=${q}&limit=8`, accessToken, { signal });
}

// Preview: does this drug interact with the user's active medications? Saves nothing.
export function checkInteractions(
  accessToken: string,
  drugId: number,
  excludeMedicationId?: string,
): Promise<ApiInteractionCheck> {
  return requestApi<ApiInteractionCheck>('/api/v1/interactions/check', accessToken, {
    method: 'POST',
    body: JSON.stringify({ drug_id: drugId, exclude_medication_id: excludeMedicationId ?? null }),
  });
}

// All interacting pairs among the user's active medications (for alerts).
export function getInteractions(accessToken: string): Promise<ApiInteractionList> {
  return requestApi<ApiInteractionList>('/api/v1/interactions', accessToken);
}

export function getDoseLogs(accessToken: string): Promise<ApiDoseLog[]> {
  const timeZone = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return requestApi<ApiDoseLog[]>(
    `/api/v1/dose-logs?time_zone=${timeZone}`,
    accessToken,
  );
}

export function createDoseLog(
  accessToken: string,
  dose: CreateDoseLogRequest,
): Promise<ApiDoseLog> {
  return requestApi<ApiDoseLog>('/api/v1/dose-logs', accessToken, {
    method: 'POST',
    body: JSON.stringify(dose),
  });
}

export function getProfile(accessToken: string): Promise<ApiProfile> {
  return requestApi<ApiProfile>('/api/v1/users/me', accessToken);
}

export function updateProfile(accessToken: string, fullName: string): Promise<ApiProfile> {
  return requestApi<ApiProfile>('/api/v1/users/me', accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ full_name: fullName }),
  });
}

export { API_BASE_URL };
