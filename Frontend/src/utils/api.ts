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
  notes: string | null;
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
    if (body) {
      try {
        const parsed: unknown = JSON.parse(body);
        if (typeof parsed === 'object' && parsed !== null && 'detail' in parsed) {
          const detail = parsed.detail;
          message = typeof detail === 'string' ? detail : JSON.stringify(detail);
        } else {
          message = body;
        }
      } catch {
        message = body;
      }
    }
    throw new Error(message);
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

export function createMedication(
  accessToken: string,
  medication: CreateMedicationRequest,
): Promise<ApiMedication> {
  return requestApi<ApiMedication>('/api/v1/medications', accessToken, {
    method: 'POST',
    body: JSON.stringify(medication),
  });
}

export { API_BASE_URL };
