import { apiFetch } from './client';

export interface SystemExport {
    exported_at: string;
    schema_version: number;
    system: Record<string, unknown>;
    schedules: Record<string, unknown>[];
    instances: Record<string, unknown>[];
    reviews: Record<string, unknown>[];
    workspace: Record<string, unknown> | null;
    journal_entries: {
        entry_id: string;
        instance_id: string;
        widget_id: string;
        text: string;
        created_at: string;
    }[];
    attachment_filenames: string[];
}

export async function exportSystem(systemId: string): Promise<SystemExport> {
    return apiFetch<SystemExport>(`/api/systems/${systemId}/export`);
}