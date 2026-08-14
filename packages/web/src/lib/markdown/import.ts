import type { SystemDraft } from '$lib/api/ai';

export interface ImportedSystemDraft extends SystemDraft {
  reference_table: string;
  success_metric: string;
}

export interface ImportResult {
  draft?: ImportedSystemDraft;
  error?: string;
}

function normalizeHeading(text: string): string {
  return text.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

const SECTION_MAP: Record<string, keyof ImportedSystemDraft> = {
  purpose: 'purpose',
  philosophy: 'philosophy',
  protocol: 'protocol',
  'floor-action': 'floor_action',
  trigger: 'trigger',
  barriers: 'barrier_list',
  'environment-cue': 'environment_cue',
  'reference-table': 'reference_table',
  'success-metric': 'success_metric',
};

export function parseSystemMarkdown(text: string): ImportResult {
  const lines = text.split(/\r?\n/);

  const title = lines.find((l) => /^#\s+/.test(l.trim()));
  if (!title) {
    return { error: 'No system title found. Start the file with `# System Name`.' };
  }
  const name = title.trim().replace(/^#\s+/, '').trim();

  const sections: { key: keyof ImportedSystemDraft; lines: string[] }[] = [];
  let current: { key: keyof ImportedSystemDraft; lines: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const normalized = normalizeHeading(h2[1]);
      if (normalized in SECTION_MAP) {
        current = { key: SECTION_MAP[normalized], lines: [] };
        sections.push(current);
      } else {
        current = null;
      }
      continue;
    }
    if (current) current.lines.push(raw);
  }

  const content = (key: keyof ImportedSystemDraft): string =>
    sections.find((s) => s.key === key)?.lines.join('\n').trim() ?? '';

  const barrierLines = content('barrier_list')
    .split('\n')
    .filter((l) => /^-\s+/.test(l.trim()))
    .map((l) => l.trim().replace(/^-\s+/, ''));

  return {
    draft: {
      name,
      purpose: content('purpose'),
      philosophy: content('philosophy'),
      protocol: content('protocol'),
      floor_action: content('floor_action'),
      trigger: content('trigger'),
      barrier_list: barrierLines,
      environment_cue: content('environment_cue'),
      reference_table: content('reference_table'),
      success_metric: content('success_metric'),
    },
  };
}