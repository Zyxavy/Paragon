import { apiFetch } from './client';

export interface Template {
    id: string;
    name: string;
    source: 'built_in' | 'user';
    default_purpose: string;
    default_philosophy: string;
    default_protocol: string;
    default_floor_action: string;
    default_trigger_pattern: string;
    default_barrier_list: string[];
    default_environment_cue: string;
    suggested_widgets: string[];
    created_at: string;
    updated_at: string;
}

export interface TemplateListResponse {
    templates: Template[];
    next_cursor: string | null;
}

export async function getTemplates(params?: { source?: string; cursor?: string; limit?: number }): Promise<TemplateListResponse> {
    const search = new URLSearchParams();
    if (params?.source) search.set('source', params.source);
    if (params?.cursor) search.set('cursor', params.cursor);
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return apiFetch<TemplateListResponse>(`/api/templates${qs ? `?${qs}` : ''}`);
}

export async function getTemplate(id: string): Promise<Template> {
    return apiFetch<Template>(`/api/templates/${id}`);
}

export async function saveAsTemplate(systemId: string, name?: string): Promise<Template> {
    return apiFetch<Template>(`/api/systems/${systemId}/save-as-template`, {
        method: 'POST',
        body: JSON.stringify(name ? { name } : {}),
    });
}