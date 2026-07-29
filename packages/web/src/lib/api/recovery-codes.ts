import { apiFetch } from './client';

export interface RecoveryCode {
  id: string;
  code: string;
  created_at: string;
}

export interface GetRecoveryCodesResponse {
  codes: RecoveryCode[];
}

export async function getRecoveryCodes(): Promise<GetRecoveryCodesResponse> {
  return apiFetch<GetRecoveryCodesResponse>('/api/recovery-codes');
}

export async function regenerateRecoveryCodes(): Promise<{ codes: string[] }> {
  return apiFetch<{ codes: string[] }>('/api/recovery-codes/generate', { method: 'POST' });
}

/** Masks a `PARAGON-XXXX-XXXX` code to `PARAGON-****-****` */
export function maskCode(code: string): string {
  const parts = code.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-****-****`;
  }
  return '****-****';
}