export interface SystemDraft {
  name: string;
  purpose: string;
  philosophy: string;
  protocol: string;
  floor_action: string;
  trigger: string;
  barrier_list: string[];
  environment_cue: string;
}

export class AIParseError extends Error {
  constructor(message: string, public readonly rawResponse: string) {
    super(message);
    this.name = 'AIParseError';
  }
}

export function stripThinkTokens(raw: string): string {
  const closeTag = '</think>';
  const idx = raw.indexOf(closeTag);
  if (idx === -1) {
    return raw.trim();
  }
  return raw.slice(idx + closeTag.length).trim();
}

export function parseSystemDraft(raw: string): SystemDraft {
  const cleaned = stripThinkTokens(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AIParseError('AI response was not valid JSON after stripping think tokens', cleaned);
  }

  const required: (keyof SystemDraft)[] = [
    'name', 'purpose', 'philosophy', 'protocol', 'floor_action', 'trigger', 'barrier_list', 'environment_cue'
  ];
  for (const field of required) {
    if (!(field in (parsed as object))) {
      throw new AIParseError(`AI response missing required field: ${field}`, cleaned);
    }
  }

  return parsed as SystemDraft;
}