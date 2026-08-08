const BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface AttachmentMetadata {
  id: string;
  workspace_id: string;
  widget_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface AttachmentListResponse {
  attachments: AttachmentMetadata[];
}

export function uploadAttachment(file: File, workspaceId: string, widgetId: string): Promise<AttachmentMetadata> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  formData.append('widget_id', widgetId);

  return fetch(`${BASE}/api/attachments`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'unknown', message: 'Upload failed.' }));
      throw Object.assign(new Error(body.message), { status: res.status, code: body.error });
    }
    return res.json();
  });
}

export function getAttachments(workspaceId: string, widgetId: string): Promise<AttachmentListResponse> {
  return fetch(
    `${BASE}/api/attachments?workspace_id=${encodeURIComponent(workspaceId)}&widget_id=${encodeURIComponent(widgetId)}`,
    { credentials: 'include' },
  ).then((res) => res.json());
}

export function deleteAttachment(id: string): Promise<void> {
  return fetch(`${BASE}/api/attachments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'unknown', message: 'Delete failed.' }));
      throw Object.assign(new Error(body.message), { status: res.status, code: body.error });
    }
  });
}

export function getAttachmentUrl(id: string): string {
  return `${BASE}/api/attachments/${encodeURIComponent(id)}`;
}