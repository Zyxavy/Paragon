import { apiFetch } from './client';

export interface SystemDraft {
  name: string;
  domain: string;
  purpose: string;
  philosophy: string;
  protocol: string;
  floor_action: string;
  trigger: string;
  barrier_list: string[];
  environment_cue: string;
  reference_table: string;
  success_metric: string;
}

export async function draftSystem(prompt: string): Promise<{ draft: SystemDraft }> {
  return apiFetch<{ draft: SystemDraft }>('/api/ai/draft-system', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}