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

export function stripMarkdownFences(raw: string): string {
  const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return raw.trim();
}

export function parseSystemDraft(raw: string): SystemDraft {
  const stripped = stripMarkdownFences(stripThinkTokens(raw));

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new AIParseError('AI response was not valid JSON after stripping think tokens and markdown fences', stripped);
  }

  const required: (keyof SystemDraft)[] = [
    'name', 'purpose', 'philosophy', 'protocol', 'floor_action', 'trigger', 'barrier_list', 'environment_cue'
  ];
  for (const field of required) {
    if (!(field in (parsed as object))) {
      throw new AIParseError(`AI response missing required field: ${field}`, stripped);
    }
  }

  return parsed as SystemDraft;
}