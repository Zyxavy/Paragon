import { apiFetch } from './client';

export interface VisualAidUploadResponse {
    r2_key: string;
    content_type: string;
    size_bytes: number;
}

export function uploadVisualAid(systemId: string, file: File): Promise<VisualAidUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<VisualAidUploadResponse>(`/api/systems/${systemId}/visual-aid`, {
        method: 'POST',
        body: formData,
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
