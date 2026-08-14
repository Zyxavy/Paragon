# Import System from Markdown + Markdown Overview — Design

**Date:** 2026-08-14
**Status:** Approved (pending written review)

## Problem

1. Creating a system from scratch requires typing 8 fields into `SystemForm`. Users who maintain systems outside Polaris (or want to share/reuse systems) have no way to bulk-populate the form. A markdown-based import gives a portable, human-readable input format.
2. The system detail page's Overview tab renders multi-line fields (`purpose`, `philosophy`, `protocol`, `floor_action`) as plain text. Long, structured content (numbered protocols, emphasis, lists) is hard to read. The Overview tab should render these fields as Markdown.

## Scope

- Add an "Import System" file-upload panel on `packages/web/src/routes/(app)/systems/new/+page.svelte`, below the AIDraftPanel.
- Import fills the existing `SystemForm` via the page's `formDefaults` state (same mechanism the AI draft uses). Nothing is saved until the user confirms/autosaves.
- Client-side only: no API routes, no backend changes, no D1 changes.
- Render `purpose`, `philosophy`, `protocol`, `floor_action` as Markdown on the system detail page's Overview tab (`packages/web/src/routes/(app)/systems/[id]/+page.svelte`).
- Not in scope: import on the edit page, export-to-markdown, markdown editing UI, preview toggles in the form.

## Import format

A `.md` file with a title heading and `##`-level sections mapping to system fields.

```markdown
# Morning Focus System

## Purpose
I want mornings that start with intention instead of doomscrolling.

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
```

Parsing rules (pure function, `parseSystemMarkdown(text): SystemDraft`):

| Source | Target field |
|---|---|
| First `# ` (level-1) heading | `name` |
| `## Purpose` | `purpose` |
| `## Philosophy` | `philosophy` |
| `## Protocol` | `protocol` (lines preserved) |
| `## Floor Action` | `floor_action` |
| `## Trigger` | `trigger` |
| `## Barriers` | `barrier_list` (each `- ` bullet → array item; non-bullet lines ignored) |
| `## Environment Cue` | `environment_cue` |

- Section headings match case-insensitively, spaces/dashes normalized (e.g. `Floor Action`, `floor-action`).
- Content of a section is everything until the next heading (any level).
- Missing sections → field left empty (no hard failure).
- Unknown `##` sections are ignored.
- No `#` heading → parse error (shown inline, form untouched).
- Section content is trimmed; blank sections → empty string.

## Implementation

### New files

- `packages/web/src/lib/markdown/import.ts` — `parseSystemMarkdown(text: string): { draft: SystemDraft; error?: string }` (pure, unit-testable). Reuses the `SystemDraft` interface from `packages/web/src/lib/api/ai.ts` (or moves it to a shared location if cleaner).
- `packages/web/src/lib/components/ImportPanel.svelte` — hidden `<input type="file" accept=".md,text/markdown">` triggered by a styled button, reads via `FileReader` (pattern already used by `AttachmentUpload.svelte`), parses, emits `onimport: { draft }`; inline error state on parse failure.
- `packages/web/src/lib/components/MarkdownText.svelte` — wraps `marked.parse()` + `DOMPurify.sanitize()`, renders with `{@html}`. Props: `content: string`.

### Changed files

- `packages/web/src/routes/(app)/systems/new/+page.svelte` — render `<ImportPanel onimport={...}>` below `<AIDraftPanel>`, handler sets `formDefaults` (same shape as `onAIDraft`).
- `packages/web/src/routes/(app)/systems/[id]/+page.svelte` — Blueprint section: render `purpose`, `philosophy`, `protocol`, `floor_action` through `MarkdownText`. `trigger`, `environment_cue`, `barrier_list` stay plain (short fields / chips). Empty-value state behavior unchanged.
- `packages/web/package.json` — add `marked` and `dompurify` dependencies (flagged for review in the PR; AGENTS.md dependency policy). Both ship their own TypeScript types.

### Data flow

`file input change → FileReader.readAsText → parseSystemMarkdown → onimport → formDefaults (page state) → SystemForm $effect fills fields` — identical flow to the existing AI draft (`onAIDraft`).

## Markdown rendering details

- `MarkdownText.svelte` sanitizes ALL rendered output (content is user-authored; sanitize by default).
- Styling uses Tailwind typography classes (`prose` from the already-installed `@tailwindcss/typography` dev dependency) on a wrapper element, sized to match surrounding UI text.

## Error handling

- Non-`.md` file / read failure → inline error "Couldn't read that file. Use a .md file."
- No `#` heading → inline error "No system title found. Start the file with `# System Name`."
- Import errors never touch `formDefaults` — the form keeps whatever it had.
- After successful import, `input.value = ''` so the same file can be re-imported after edits.

## Testing

- **Unit (web):** `parseSystemMarkdown` — full valid file; missing sections → empty fields; unknown headings ignored; bullet list → `barrier_list`; plain-line Protocol preserved; case/dash-insensitive headings; no heading → error; blank content → error.
- **Unit (web):** `MarkdownText` — renders heading/bold/list; strips `<script>`; strips `onclick` attributes; empty content renders nothing.
- **Manual:** import → form filled; autosave creates system; detail page shows formatted markdown.

## Out of scope / non-goals

- No new `overview` field on the system model.
- No markdown support in the edit form (textareas stay plain).
- No export-to-markdown counterpart.
- No changes to the AI draft contract, `SystemDraft` shape, or backend.
