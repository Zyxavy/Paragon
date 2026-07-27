import { apiFetch } from './client';

export interface NotesEntry {
    id: string;
    workspace_id: string;
    widget_id: string;
    entry_type: string;
    data: { text: string };
    created_at: string;
}

export interface NotesResponse {
    text: string;
}

export function putNotes(workspaceId: string, widgetId: string, text: string): Promise<NotesEntry> {
    return apiFetch<NotesEntry>(`/api/workspaces/${workspaceId}/notes/${widgetId}`, {
        method: 'PUT',
        body: JSON.stringify({ text }),
    });
}

export function getNotes(workspaceId: string, widgetId: string): Promise<NotesResponse> {
    return apiFetch<NotesResponse>(`/api/workspaces/${workspaceId}/notes/${widgetId}`);
}