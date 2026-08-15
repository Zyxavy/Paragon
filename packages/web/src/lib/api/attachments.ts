import { apiFetch } from './client';

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

    return apiFetch<AttachmentMetadata>('/api/attachments', {
        method: 'POST',
        body: formData,
    });
}

export function getAttachments(workspaceId: string, widgetId: string): Promise<AttachmentListResponse> {
    return apiFetch<AttachmentListResponse>(
        `/api/attachments?workspace_id=${encodeURIComponent(workspaceId)}&widget_id=${encodeURIComponent(widgetId)}`,
    );
}

export function deleteAttachment(id: string): Promise<void> {
    return apiFetch<void>(`/api/attachments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
}

export function getAttachmentUrl(id: string): string {
    const BASE = import.meta.env.VITE_API_BASE_URL || '';
    return `${BASE}/api/attachments/${encodeURIComponent(id)}`;
}