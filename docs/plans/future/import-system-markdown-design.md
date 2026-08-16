# System Content Enrichment: Markdown Fields, Import from Markdown, Visual Aid, Reference Table, Success Metric, Schedule Block — Design

**Date:** 2026-08-14
**Status:** Approved (pending written review)

## Problem

1. Multi-line system fields (`purpose`, `philosophy`, `protocol`, `floor_action`) are plain textareas. Users cannot structure content — headings, subheadings, tables, bullet lists — either while writing or on the detail page.
2. Creating a system from scratch requires typing 8 fields into `SystemForm`. Users who maintain systems outside Polaris (or want to share/reuse systems) have no way to bulk-populate the form. A markdown-based import gives a portable, human-readable input format.
3. Systems lack rich detail-page content: a reference table, a visual aid image, a success metric, and a visual schedule block.

## Scope

- Markdown (Write/Preview) support on all textarea fields in `SystemForm` (create + edit), and Markdown rendering on the system detail page's Overview tab.
- "Import System" file-upload panel on `packages/web/src/routes/(app)/systems/new/+page.svelte`, below the AIDraftPanel. Import fills the existing `SystemForm` via the page's `formDefaults` state (same mechanism the AI draft uses). Nothing is saved until the user confirms/autosaves.
- New fields: `reference_table` (markdown), `success_metric` (plain short text), `visual_aid` (single uploaded image, 10MB limit, stored in R2).
- Schedule Block rendering on the detail page (from existing schedules — no new field).
- Not in scope: markdown in the AI draft contract (`SystemDraft` stays 8 fields, AI drafts leave new fields empty), visual aid in system export, key links/resources field, markdown editing on trigger/environment_cue **inputs** (they stay single-line inputs; detail page still renders them as Markdown).

## Markdown support

- New dependency `marked` (GFM, tables enabled) + `dompurify` for sanitization (AGENTS.md dependency policy — flagged in PR).
- New `MarkdownText.svelte` component: `marked.parse()` → `DOMPurify.sanitize()` → `{@html}`. Styling via `prose` classes from the already-installed `@tailwindcss/typography`.
- New `MarkdownField.svelte` component: textarea + Write/Preview toggle (tab switcher). Preview renders via `MarkdownText` live.
- Fields with the toggle in `SystemForm`: `purpose`, `philosophy`, `protocol`, `floor_action`, `reference_table`.
- `trigger` and `environment_cue` stay single-line `<input>`s in the form.
- Detail page renders ALL of the following as Markdown: `purpose`, `philosophy`, `protocol`, `floor_action`, `trigger`, `environment_cue`, `reference_table`. Empty-value behavior unchanged.

## New fields

| Field | Storage | Form UI | Detail page |
|---|---|---|---|
| `reference_table` | `TEXT NOT NULL DEFAULT ''` | `MarkdownField` | Rendered as GFM table when source is a table, otherwise prose |
| `success_metric` | `TEXT NOT NULL DEFAULT ''` | Single-line input | Highlighted line next to Floor Action |
| `visual_aid` | `TEXT NULL` (R2 key) | Upload button + preview + remove | Auth-gated `<img>` streamed from API |

### Visual aid upload (10MB)

- New endpoint `POST /api/systems/:system_id/visual-aid` — multipart form (`file`), ownership-checked.
  - MIME allowlist: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/avif` (SVG excluded — scriptable).
  - Size limit: 10MB (`file.size > 10_000_000` → `413 file_too_large`).
  - R2 key: `visual-aids/{system_id}/{uuid}.{ext}` in the existing `ATTACHMENTS` bucket.
  - Ordering per ADR 001 S5.7: R2 put first, then update `systems.visual_aid`; on D1 failure log orphaned key and return 500.
  - Replaces any existing visual aid (delete old R2 object on success).
  - Returns `201 { r2_key }`.
- New endpoint `GET /api/systems/:system_id/visual-aid` — ownership-checked, streams R2 object with `Content-Type` + `Cache-Control: public, max-age=31536000`, 404 when none.
- New endpoint `DELETE /api/systems/:system_id/visual-aid` — ownership-checked, deletes R2 object + nulls column.
- The frontend `System` type exposes `visual_aid` as the R2 key (not a URL); images load through `GET /api/systems/:id/visual-aid` (apiFetch for JSON is not used for images — plain `fetch` with credentials, pattern from `attachments.ts`).

## Schedule Block (rendering only)

- Detail page fetches `GET /api/systems/:system_id/schedules` (endpoint exists) and renders a weekly block: one row per schedule, day chips (M T W Th F Sa Su) + `time_window_start – time_window_end`.

## Import format

A `.md` file with a title heading and `##`-level sections mapping to system fields.

```markdown
# Morning Focus System

## Purpose
I want mornings that start with intention.

### What good looks like
Calm, no phone, kitchen table.

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
```

Parsing rules (pure function, `parseSystemMarkdown(text): SystemDraft & { reference_table: string; success_metric: string }`):

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
| `## Reference Table` | `reference_table` (markdown source preserved verbatim) |
| `## Success Metric` | `success_metric` |

The `## Visual Aid` field is **not** importable — visual aids are file uploads (R2 keys), which a markdown file cannot carry. The user uploads the image after import. Unknown `## Visual Aid` sections are ignored.

- Section headings match case-insensitively, spaces/dashes normalized (`Floor Action`, `floor-action`).
- Section delimiters are `##` (level-2) only. Content runs until the next `##` heading; `###`/`####` headings and deeper nesting inside a section are preserved as content — this is how users write subheadings inside `Purpose` or `Protocol`.
- Missing sections → field left empty (no hard failure).
- Unknown `##` sections are ignored.
- No `#` heading → parse error (shown inline, form untouched).
- Section content is trimmed; blank sections → empty string.
- The `SystemDraft`-shaped import result carries `reference_table` and `success_metric`; `visual_aid` is not part of the import shape.

## Implementation files

### New files
- `packages/api/src/lib/visual-aid.ts` — MIME allowlist + 10MB constant + R2 key helpers.
- `packages/api/src/routes/visual-aid.ts` — upload/serve/delete routes (mounted under `/api/systems/:system_id/visual-aid`).
- `packages/web/src/lib/markdown/import.ts` — `parseSystemMarkdown` (pure, unit-testable).
- `packages/web/src/lib/markdown/markdown.ts` — `renderMarkdown(source): string` (marked + DOMPurify, shared by MarkdownText/MarkdownField).
- `packages/web/src/lib/components/MarkdownText.svelte`
- `packages/web/src/lib/components/MarkdownField.svelte`
- `packages/web/src/lib/components/ImportPanel.svelte` — hidden `<input type="file" accept=".md,text/markdown">` + styled button, `FileReader`, emits `onimport: { draft }`, inline error state.
- `packages/web/src/lib/components/ScheduleBlock.svelte` — weekly schedule visualization.
- `packages/web/src/lib/components/VisualAidUpload.svelte` — upload/preview/remove.
- `packages/api/migrations/0003_visual_aid.sql` — `ALTER TABLE systems ADD COLUMN reference_table TEXT NOT NULL DEFAULT ''; ADD COLUMN success_metric TEXT NOT NULL DEFAULT ''; ADD COLUMN visual_aid TEXT;`

### Changed files
- `packages/api/src/routes/systems.ts` — INSERT/PATCH whitelists + `parseSystemRow` for the 3 new columns; `GET /api/systems` already does `SELECT *`.
- `packages/api/src/index.ts` — mount visual-aid routes (before the systems `/:id` catch-alls if needed).
- `packages/web/src/lib/api/systems.ts` — `System` + `CreateSystemPayload` types.
- `packages/web/src/lib/api/visual-aid.ts` — upload (FormData), remove, image fetch helper.
- `packages/web/src/routes/(app)/systems/new/+page.svelte` — render `<ImportPanel>` below `<AIDraftPanel>`; handler sets `formDefaults` (same shape as `onAIDraft`).
- `packages/web/src/lib/components/SystemForm.svelte` — new fields + MarkdownField swaps; payload includes new fields.
- `packages/web/src/routes/(app)/systems/[id]/+page.svelte` — Markdown rendering, reference table, success metric, schedule block, visual aid image.
- `packages/web/package.json` — `marked`, `dompurify`.
- Docs: `docs/reference/api-routes.md` (visual-aid endpoints + new fields), `docs/ADRs/002-d1-schema.md` (new columns).

## Data flow

`file input change → FileReader.readAsText → parseSystemMarkdown → onimport → formDefaults (page state) → SystemForm $effect fills fields` — identical flow to the existing AI draft (`onAIDraft`).

## Error handling

- Non-`.md` / read failure → inline error "Couldn't read that file. Use a .md file."
- No `#` heading → "No system title found. Start the file with `# System Name`."
- Upload: unsupported type → 400; >10MB → 413; non-owned system → 404.
- Import errors never touch `formDefaults`.
- After successful import, `input.value = ''` so the same file can be re-imported after edits.

## Testing

- **API integration:** visual-aid upload (success, wrong MIME, >10MB, non-owned system), GET serves bytes, DELETE clears + removes R2, systems CRUD round-trips the 3 new columns.
- **Web unit:** `parseSystemMarkdown` (full file, missing sections, unknown headings, bullets → barrier_list, verbatim table source, visual-aid URL validation, no heading → error, blank → error); `MarkdownText` (renders heading/bold/list/table; strips `<script>` and `onclick`); `renderMarkdown` sanitization.
- **Manual:** import → form filled; markdown toggles; detail page renders all markdown fields, table, image, success metric, schedule block.

## Out of scope / non-goals

- No changes to the AI draft contract, `SystemDraft` shape, or AI backend.
- No SVG uploads, no multi-image visual aids in v1.
- Visual aid not included in system export (`docs/plans/future/export.md`) — noted for future work.
- No key links/resources field (declined in brainstorm).
