import { apiFetch, ApiError } from './client';

export interface VisualAidUploadResponse {
  r2_key: string;
  content_type: string;
  size_bytes: number;
}

export function uploadVisualAid(systemId: string, file: File): Promise<VisualAidUploadResponse> {
  const BASE = import.meta.env.VITE_API_BASE_URL || '';
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${BASE}/api/systems/${systemId}/visual-aid`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'unknown', message: 'Something went wrong.' }));
      throw new ApiError(res.status, body.error, body.message);
    }
    return res.json();
  });
}

export function deleteVisualAid(systemId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/systems/${systemId}/visual-aid`, { method: 'DELETE' });
}

export function visualAidSrc(systemId: string, ver?: string | null): string {
  const BASE = import.meta.env.VITE_API_BASE_URL || '';
  const base = `${BASE}/api/systems/${systemId}/visual-aid`;
  return ver ? `${base}?v=${encodeURIComponent(ver)}` : base;
}
