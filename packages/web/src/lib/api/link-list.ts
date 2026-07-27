import { apiFetch } from './client';

export interface LinkEntry {
    label: string;
    url: string;
}

export interface LinkListEntry {
    id: string;
    workspace_id: string;
    widget_id: string;
    entry_type: string;
    data: { links: LinkEntry[] };
    created_at: string;
}

export interface LinkListResponse {
    links: LinkEntry[];
}

export function putLinkList(workspaceId: string, widgetId: string, links: LinkEntry[]): Promise<LinkListEntry> {
    return apiFetch<LinkListEntry>(`/api/workspaces/${workspaceId}/link-list/${widgetId}`, {
        method: 'PUT',
        body: JSON.stringify({ links }),
    });
}

export function getLinkList(workspaceId: string, widgetId: string): Promise<LinkListResponse> {
    return apiFetch<LinkListResponse>(`/api/workspaces/${workspaceId}/link-list/${widgetId}`);
}