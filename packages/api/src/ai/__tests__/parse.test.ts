import { describe, it, expect } from 'vitest';
import { stripThinkTokens, stripMarkdownFences, parseSystemDraft, AIParseError } from '../parse';

describe('stripThinkTokens', () => {
  it('strips content before and including </think>', () => {
    const input = '<think>Let me reason about this...</think>{"name":"Reading System"}';
    expect(stripThinkTokens(input)).toBe('{"name":"Reading System"}');
  });

  it('returns full string when no </think> tag is present', () => {
    const input = '{"name":"Reading System"}';
    expect(stripThinkTokens(input)).toBe('{"name":"Reading System"}');
  });

  it('handles opening <think> with no closing tag', () => {
    const input = '<think>unfinished reasoning{"name":"Reading System"}';
    expect(stripThinkTokens(input)).toBe('<think>unfinished reasoning{"name":"Reading System"}');
  });

  it('trims whitespace after stripping', () => {
    const input = '<think>reasoning</think>  \n  {"name":"Reading System"}';
    expect(stripThinkTokens(input)).toBe('{"name":"Reading System"}');
  });

  it('handles empty string', () => {
    expect(stripThinkTokens('')).toBe('');
  });
});

describe('stripMarkdownFences', () => {
  it('strips ```json fences with newlines', () => {
    const input = '```json\n{"name":"Reading System"}\n```';
    expect(stripMarkdownFences(input)).toBe('{"name":"Reading System"}');
  });

  it('strips ``` fences without language tag', () => {
    const input = '```\n{"name":"Reading System"}\n```';
    expect(stripMarkdownFences(input)).toBe('{"name":"Reading System"}');
  });

  it('strips inline fences without newlines', () => {
    const input = '```json{"name":"Reading System"}```';
    expect(stripMarkdownFences(input)).toBe('{"name":"Reading System"}');
  });

  it('returns full string when no fences are present', () => {
    const input = '{"name":"Reading System"}';
    expect(stripMarkdownFences(input)).toBe('{"name":"Reading System"}');
  });

  it('handles fences with leading whitespace after think block', () => {
    const input = '\n\n```json\n{"name":"Reading System"}\n```';
    expect(stripMarkdownFences(input)).toBe('{"name":"Reading System"}');
  });

  it('handles empty string', () => {
    expect(stripMarkdownFences('')).toBe('');
  });
});

describe('parseSystemDraft', () => {
  const validDraft = {
    name: 'Reading System',
    purpose: 'Build a consistent reading habit',
    philosophy: 'Every reader is a leader',
    protocol: '1. Pick a book\n2. Read 10 pages\n3. Note takeaways',
    floor_action: 'Read one paragraph',
    trigger: 'After I brush my teeth, I will open my book',
    barrier_list: ['Phone notifications', 'Too tired'],
    environment_cue: 'Book on the nightstand'
  };

  it('parses valid JSON with think block', () => {
    const raw = `<think>User wants to read more</think>\n${JSON.stringify(validDraft)}`;
    const result = parseSystemDraft(raw);
    expect(result).toEqual(validDraft);
  });

  it('parses valid JSON without think block', () => {
    const result = parseSystemDraft(JSON.stringify(validDraft));
    expect(result).toEqual(validDraft);
  });

  it('throws AIParseError for non-JSON garbage', () => {
    expect(() => parseSystemDraft('Just some text without JSON'))
      .toThrow(AIParseError);
  });

  it('throws AIParseError with the raw response attached', () => {
    const garbage = 'Not JSON at all';
    try {
      parseSystemDraft(garbage);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AIParseError);
      expect((e as AIParseError).rawResponse).toBe(garbage);
    }
  });

  it('throws AIParseError when required field is missing', () => {
    const missingField = { name: 'Reading System' };
    expect(() => parseSystemDraft(JSON.stringify(missingField)))
      .toThrow(AIParseError);
    expect(() => parseSystemDraft(JSON.stringify(missingField)))
      .toThrow(/missing required field/);
  });

  it('parses JSON wrapped in markdown fences with think block', () => {
    const raw = `<think>User wants to read more</think>\n\`\`\`json\n${JSON.stringify(validDraft)}\n\`\`\``;
    const result = parseSystemDraft(raw);
    expect(result).toEqual(validDraft);
  });

  it('parses JSON wrapped in markdown fences without language tag', () => {
    const raw = `\`\`\`\n${JSON.stringify(validDraft)}\n\`\`\``;
    const result = parseSystemDraft(raw);
    expect(result).toEqual(validDraft);
  });

  it('parses JSON wrapped in inline fences', () => {
    const raw = '```json' + JSON.stringify(validDraft) + '```';
    const result = parseSystemDraft(raw);
    expect(result).toEqual(validDraft);
  });
});
