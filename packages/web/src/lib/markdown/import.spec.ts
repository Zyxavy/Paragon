import { describe, it, expect } from 'vitest';
import { EXAMPLE_MARKDOWN, parseSystemMarkdown } from './import';

const FULL_FILE = `# Morning Focus System

## Purpose
I want mornings that start with intention.

### What good looks like
Calm, no phone.

## Philosophy
Small wins compound. *Don't* rely on willpower.

## Protocol
1. Wake up, no phone.
2. 10 min reflection.

## Floor Action
Stand up and walk to the kitchen.

## Trigger
Alarm goes off

## Barriers
- Phone on nightstand
- Groggy state

## Environment Cue
Nightstand lamp timer

## Reference Table
| Trigger | Action |
|---|---|
| Alarm | Stand up |

## Success Metric
2 hours of deep reading
`;

describe('parseSystemMarkdown', () => {
  it('maps every section of a full file', () => {
    const { draft, error } = parseSystemMarkdown(FULL_FILE);
    expect(error).toBeUndefined();
    expect(draft!.name).toBe('Morning Focus System');
    expect(draft!.purpose).toContain('I want mornings');
    expect(draft!.philosophy).toContain("Don't");
    expect(draft!.protocol).toBe('1. Wake up, no phone.\n2. 10 min reflection.');
    expect(draft!.floor_action).toBe('Stand up and walk to the kitchen.');
    expect(draft!.trigger).toBe('Alarm goes off');
    expect(draft!.barrier_list).toEqual(['Phone on nightstand', 'Groggy state']);
    expect(draft!.environment_cue).toBe('Nightstand lamp timer');
    expect(draft!.reference_table).toContain('| Trigger | Action |');
    expect(draft!.success_metric).toBe('2 hours of deep reading');
  });

  it('EXAMPLE_MARKDOWN fills every supported field and its sub-fields', () => {
    const { draft, error } = parseSystemMarkdown(EXAMPLE_MARKDOWN);
    expect(error).toBeUndefined();
    expect(draft!.name).toBe('Daily Reading System');
    expect(draft!.domain).toBe('Learning');
    expect(draft!.purpose).toContain('reading habit');
    expect(draft!.philosophy).toContain('identity');
    expect(draft!.protocol).toContain('1. **Turn off** my phone');
    expect(draft!.protocol).toContain('2. **Pick up** the book');
    expect(draft!.protocol).toContain('3. **Read** 10 pages');
    expect(draft!.floor_action).toBe('Open the book and read one paragraph.');
    expect(draft!.trigger).toBe('After I brush my teeth, I will open my book.');
    expect(draft!.barrier_list).toEqual([
      'Phone on the nightstand is easier to reach than the book',
      'Falling asleep before starting',
      'No specific book chosen',
    ]);
    expect(draft!.environment_cue).toContain('pillow');
    expect(draft!.reference_table).toContain('| Rule | Value |');
    expect(draft!.reference_table).toContain('| Weekly target | 3 nights minimum |');
    expect(draft!.success_metric).toBe('I read at least 3 nights a week and finish one book every month.');
  });

  it('preserves ### subheadings inside a section', () => {
    const { draft } = parseSystemMarkdown('# X\n\n## Purpose\nIntro.\n\n### Deep dive\nDetails.\n');
    expect(draft!.purpose).toBe('Intro.\n\n### Deep dive\nDetails.');
  });

  it('leaves missing sections empty', () => {
    const { draft } = parseSystemMarkdown('# X\n\n## Purpose\nOnly purpose.\n');
    expect(draft!.philosophy).toBe('');
    expect(draft!.protocol).toBe('');
    expect(draft!.floor_action).toBe('');
    expect(draft!.trigger).toBe('');
    expect(draft!.barrier_list).toEqual([]);
    expect(draft!.environment_cue).toBe('');
    expect(draft!.reference_table).toBe('');
    expect(draft!.success_metric).toBe('');
  });

  it('ignores unknown sections and treats their content as excluded', () => {
    const { draft } = parseSystemMarkdown('# X\n\n## Purpose\nReal purpose.\n\n## Misc\nIgnored.\n\n## Protocol\nStep one.\n');
    expect(draft!.purpose).toBe('Real purpose.');
    expect(draft!.protocol).toBe('Step one.');
  });

  it('takes only bullet lines for barriers', () => {
    const { draft } = parseSystemMarkdown('# X\n\n## Barriers\n- One\nplain line\n- Two\n');
    expect(draft!.barrier_list).toEqual(['One', 'Two']);
  });

  it('matches headings case- and dash-insensitively', () => {
    const { draft } = parseSystemMarkdown('# X\n\n## floor-action\nAct!\n');
    expect(draft!.floor_action).toBe('Act!');
  });

  it('returns an error when there is no title heading', () => {
    const result = parseSystemMarkdown('## Purpose\nNo title here.\n');
    expect(result.error).toBe('No system title found. Start the file with `# System Name`.');
    expect(result.draft).toBeUndefined();
  });

  it('returns an error for blank content', () => {
    const result = parseSystemMarkdown('   \n\n');
    expect(result.error).toBeDefined();
  });
});