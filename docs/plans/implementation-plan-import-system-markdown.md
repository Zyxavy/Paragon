# System Content Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Markdown support to system fields (Write/Preview in the form, rendered on the detail page), a Markdown-file import that fills the create form, and three new system fields (Reference Table, Success Metric, Visual Aid upload) plus a weekly Schedule Block on the detail page.

**Architecture:** Backend first: a D1 migration adds `reference_table`, `success_metric`, `visual_aid` columns; a new routes file adds system-scoped visual-aid upload/serve/delete backed by the existing R2 bucket. Frontend: a `marked`+`dompurify` markdown core (`renderMarkdown`, `MarkdownText`, `MarkdownField`), a pure `parseSystemMarkdown` importer, an `ImportPanel` wired into `/systems/new`'s existing `formDefaults` flow, then `SystemForm`/detail-page upgrades. API contract, AI draft contract, and existing system flows are unchanged.

**Tech Stack:** Hono (API), D1 + R2 (Cloudflare), Svelte 5 runes (web), vitest + cloudflare:test (API), vitest-browser-svelte (web), `marked`, `dompurify`, Tailwind `prose`.

**Spec:** `docs/plans/future/import-system-markdown-design.md`

---

## File map

**API (packages/api):**
- Create: `migrations/0019_system_content.sql`
- Create: `src/lib/visual-aid.ts`
- Create: `src/routes/visual-aid.ts`
- Modify: `src/routes/systems.ts` (INSERT + PATCH whitelists)
- Modify: `src/index.ts` (mount visual-aid routes)
- Create: `src/__tests__/system-content.spec.ts`

**Web (packages/web):**
- Modify: `package.json` (add `marked`, `dompurify`)
- Create: `src/lib/markdown/markdown.ts`, `src/lib/markdown/markdown.spec.ts`
- Create: `src/lib/markdown/import.ts`, `src/lib/markdown/import.spec.ts`
- Create: `src/lib/components/MarkdownText.svelte`
- Create: `src/lib/components/MarkdownField.svelte`
- Create: `src/lib/components/ImportPanel.svelte`
- Create: `src/lib/components/VisualAidUpload.svelte`
- Create: `src/lib/components/ScheduleBlock.svelte`
- Create: `src/lib/api/visual-aid.ts`
- Modify: `src/lib/api/systems.ts` (types)
- Modify: `src/lib/components/SystemForm.svelte`
- Modify: `src/routes/(app)/systems/new/+page.svelte`
- Modify: `src/routes/(app)/systems/[id]/+page.svelte`

**Docs:**
- Modify: `docs/reference/api-routes.md`, `docs/ADRs/002-d1-schema.md`

---

## Task 1: Migration + systems API columns

**Files:**
- Create: `packages/api/migrations/0019_system_content.sql`
- Modify: `packages/api/src/routes/systems.ts`
- Test: `packages/api/src/__tests__/system-content.spec.ts`

- [ ] **Step 1: Write the migration**

Create `packages/api/migrations/0019_system_content.sql`:

```sql
ALTER TABLE systems ADD COLUMN reference_table TEXT NOT NULL DEFAULT '';
ALTER TABLE systems ADD COLUMN success_metric TEXT NOT NULL DEFAULT '';
ALTER TABLE systems ADD COLUMN visual_aid TEXT;
```

- [ ] **Step 2: Write the failing integration tests**

Create `packages/api/src/__tests__/system-content.spec.ts`:

```ts
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll, inject } from 'vitest';
import { Hono } from 'hono';
import systemsRoutes from '../routes/systems';

const migrations = inject('migrations');

async function seedUser(db: D1Database, userId: string) {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).bind(userId, 'Test User', `${userId}@test.com`, now, now).run();
}

async function seedSystem(db: D1Database, userId: string): Promise<string> {
  const systemId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO systems (id, user_id, name, domain, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(systemId, userId, 'Content Test', 'health', 'active', now, now).run();
  return systemId;
}

function getAuthedApp(userId: string) {
  const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
  app.use('/api/*', async (c, next) => {
    c.set('user', { id: userId, email: 'test@test.com' });
    c.set('session', { id: crypto.randomUUID(), userId });
    await next();
  });
  app.route('/api/systems', systemsRoutes);
  return app;
}

describe('systems content columns', () => {
  let userId: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);
    app = getAuthedApp(userId);
  });

  it('POST creates a system with reference_table and success_metric', async () => {
    const res = await app.fetch(new Request('http://localhost/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Reading System',
        reference_table: '| Trigger | Action |\n|---|---|\n| Alarm | Stand up |',
        success_metric: '2 hours of deep reading',
      }),
    }), env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.reference_table).toBe('| Trigger | Action |\n|---|---|\n| Alarm | Stand up |');
    expect(body.success_metric).toBe('2 hours of deep reading');
    expect(body.visual_aid).toBeNull();
  });

  it('POST defaults new columns to empty when absent', async () => {
    const res = await app.fetch(new Request('http://localhost/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Minimal System' }),
    }), env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.reference_table).toBe('');
    expect(body.success_metric).toBe('');
    expect(body.visual_aid).toBeNull();
  });

  it('PATCH updates reference_table and success_metric', async () => {
    const created = await (await app.fetch(new Request('http://localhost/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Patch Me' }),
    }), env)).json() as any;

    const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_table: '| A | B |\n|---|---|', success_metric: 'one rep' }),
    }), env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.reference_table).toBe('| A | B |\n|---|---|');
    expect(body.success_metric).toBe('one rep');

    const fetched = await (await app.fetch(new Request(`http://localhost/api/systems/${created.id}`), env)).json() as any;
    expect(fetched.reference_table).toBe('| A | B |\n|---|---|');
    expect(fetched.success_metric).toBe('one rep');
  });

  it('GET /api/systems returns the new columns', async () => {
    const res = await app.fetch(new Request('http://localhost/api/systems'), env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body.systems)).toBe(true);
    expect(body.systems[0]).toHaveProperty('reference_table');
    expect(body.systems[0]).toHaveProperty('success_metric');
    expect(body.systems[0]).toHaveProperty('visual_aid');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/__tests__/system-content.spec.ts` (workdir `packages/api`)
Expected: tests error/fail — the migration file does not exist yet (migrations not applied) and the API does not return the new fields.

- [ ] **Step 4: Implement the API changes**

Modify `packages/api/src/routes/systems.ts`:

1. In the `POST /` INSERT (lines 98–116), add the two new columns to the column list and bind values:

```ts
    await db.prepare(`
        INSERT INTO systems (id, user_id, name, domain, purpose, philosophy, protocol, floor_action, trigger, barrier_list, environment_cue, template_origin, reference_table, success_metric, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
        id,
        userId,
        body.name.trim(),
        body.domain ?? null,
        toStr(body.purpose),
        toStr(body.philosophy),
        toStr(body.protocol),
        toStr(body.floor_action),
        toStr(body.trigger),
        body.barrier_list ? JSON.stringify(body.barrier_list) : '[]',
        toStr(body.environment_cue),
        body.template_origin ?? null,
        toStr(body.reference_table),
        toStr(body.success_metric),
        now,
        now,
    ).run();
```

2. In `PATCH /:id` (lines 150–161), extend the updatable fields:

```ts
    const updatableFields = ['name', 'domain', 'purpose', 'philosophy', 'protocol', 'floor_action', 'trigger', 'environment_cue', 'template_origin', 'reference_table', 'success_metric', 'status'];
```

(`visual_aid` is intentionally NOT in the PATCH whitelist — it is managed exclusively by the visual-aid upload/delete endpoints in Task 2. `parseSystemRow` needs no change; it spreads the row.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/__tests__/system-content.spec.ts` (workdir `packages/api`)
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/api/migrations/0019_system_content.sql packages/api/src/routes/systems.ts packages/api/src/__tests__/system-content.spec.ts
git commit -m "feat(api): add reference_table and success_metric system columns"
```

---

## Task 2: Visual aid upload/serve/delete routes

**Files:**
- Create: `packages/api/src/lib/visual-aid.ts`
- Create: `packages/api/src/routes/visual-aid.ts`
- Modify: `packages/api/src/index.ts`
- Test: `packages/api/src/__tests__/system-content.spec.ts` (extend)

- [ ] **Step 1: Write the failing tests (extend the spec)**

Append to `packages/api/src/__tests__/system-content.spec.ts` — first add the imports at the top of the file:

```ts
import visualAidRoutes from '../routes/visual-aid';
```

Then change `getAuthedApp` so it also mounts the visual-aid routes (the visual-aid routes must exist for the import to compile):

```ts
  app.route('/api/systems', systemsRoutes);
  app.route('/api/systems', visualAidRoutes);
```

Then append the tests:

```ts
function createMockFile(content: Buffer, filename: string, contentType: string): File {
  return new File([content], filename, { type: contentType });
}

async function uploadVisualAid(app: ReturnType<typeof getAuthedApp>, systemId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return app.fetch(new Request(`http://localhost/api/systems/${systemId}/visual-aid`, {
    method: 'POST',
    body: formData,
  }), env);
}

describe('visual aid routes', () => {
  let userId: string;
  let systemId: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);
    systemId = await seedSystem(env.DB, userId);
    app = getAuthedApp(userId);
  });

  it('uploads a PNG, stores R2 key on the system, and serves it back', async () => {
    const file = createMockFile(Buffer.from('fake-png-bytes'), 'aid.png', 'image/png');
    const res = await uploadVisualAid(app, systemId, file);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.r2_key).toContain('visual-aids/');

    const row = await env.DB.prepare('SELECT visual_aid FROM systems WHERE id = ?').bind(systemId).first<any>();
    expect(row!.visual_aid).toBe(body.r2_key);

    const r2Object = await env.ATTACHMENTS.get(body.r2_key);
    expect(r2Object).toBeDefined();
    expect(await r2Object!.text()).toBe('fake-png-bytes');

    const getRes = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/visual-aid`), env);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get('Content-Type')).toBe('image/png');
    expect(await getRes.text()).toBe('fake-png-bytes');
  });

  it('replaces an existing visual aid and deletes the old R2 object', async () => {
    const file1 = createMockFile(Buffer.from('first'), 'a.png', 'image/png');
    const res1 = await uploadVisualAid(app, systemId, file1);
    const oldKey = (await res1.json() as any).r2_key;

    const file2 = createMockFile(Buffer.from('second'), 'b.png', 'image/png');
    const res2 = await uploadVisualAid(app, systemId, file2);
    expect(res2.status).toBe(201);
    const newKey = (await res2.json() as any).r2_key;
    expect(newKey).not.toBe(oldKey);

    expect(await env.ATTACHMENTS.get(oldKey)).toBeNull();
    const row = await env.DB.prepare('SELECT visual_aid FROM systems WHERE id = ?').bind(systemId).first<any>();
    expect(row!.visual_aid).toBe(newKey);
  });

  it('rejects non-image MIME types with 400', async () => {
    const file = createMockFile(Buffer.from('x'), 'evil.exe', 'application/x-msdownload');
    const res = await uploadVisualAid(app, systemId, file);
    expect(res.status).toBe(400);
    expect((await res.json() as any).error).toBe('unsupported_file_type');
  });

  it('rejects files over 10 MB with 413', async () => {
    const file = createMockFile(Buffer.alloc(10 * 1024 * 1024 + 1), 'big.png', 'image/png');
    const res = await uploadVisualAid(app, systemId, file);
    expect(res.status).toBe(413);
    expect((await res.json() as any).error).toBe('file_too_large');
  });

  it('rejects uploads for systems the user does not own with 404', async () => {
    const otherUserId = crypto.randomUUID();
    await seedUser(env.DB, otherUserId);
    const otherSystemId = await seedSystem(env.DB, otherUserId);
    const file = createMockFile(Buffer.from('x'), 'a.png', 'image/png');
    const res = await uploadVisualAid(app, otherSystemId, file);
    expect(res.status).toBe(404);
  });

  it('DELETE removes the R2 object and clears the column', async () => {
    const file = createMockFile(Buffer.from('to-delete'), 'a.png', 'image/png');
    const key = (await (await uploadVisualAid(app, systemId, file)).json() as any).r2_key;

    const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/visual-aid`, {
      method: 'DELETE',
    }), env);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare('SELECT visual_aid FROM systems WHERE id = ?').bind(systemId).first<any>();
    expect(row!.visual_aid).toBeNull();
    expect(await env.ATTACHMENTS.get(key)).toBeNull();
  });

  it('GET returns 404 when no visual aid is uploaded', async () => {
    const freshSystemId = await seedSystem(env.DB, userId);
    const res = await app.fetch(new Request(`http://localhost/api/systems/${freshSystemId}/visual-aid`), env);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/__tests__/system-content.spec.ts` (workdir `packages/api`)
Expected: the new visual-aid tests fail (import of `../routes/visual-aid` fails — file does not exist).

- [ ] **Step 3: Implement**

Create `packages/api/src/lib/visual-aid.ts`:

```ts
export const VISUAL_AID_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
];

export const MAX_VISUAL_AID_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const VISUAL_AID_KEY_PREFIX = 'visual-aids/';
```

Create `packages/api/src/routes/visual-aid.ts`:

```ts
import { Hono } from 'hono';
import type { User, Session } from 'better-auth/types';
import { requireAuth } from '../middleware/require-auth';
import { getOwnedSystem } from '../lib/ownership';
import { VISUAL_AID_MIME_TYPES, MAX_VISUAL_AID_SIZE_BYTES, VISUAL_AID_KEY_PREFIX } from '../lib/visual-aid';

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

// POST /api/systems/:system_id/visual-aid (multipart, field "file")
app.post('/:system_id/visual-aid', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const r2 = c.env.ATTACHMENTS;
    const systemId = c.req.param('system_id');

    const system = await getOwnedSystem(db, systemId, userId);
    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    const formData = await c.req.parseBody();
    const file = formData['file'] as File | null;

    if (!file) {
        return c.json({ error: 'invalid_input', message: 'file is required.' }, 400);
    }
    if (!VISUAL_AID_MIME_TYPES.includes(file.type)) {
        return c.json({ error: 'unsupported_file_type', message: `File type '${file.type}' is not supported.` }, 400);
    }
    if (file.size > MAX_VISUAL_AID_SIZE_BYTES) {
        return c.json({ error: 'file_too_large', message: 'File exceeds the 10 MB size limit.' }, 413);
    }

    const ext = file.name.split('.').pop() || 'bin';
    const uuid = crypto.randomUUID();
    const r2Key = `${VISUAL_AID_KEY_PREFIX}${systemId}/${uuid}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    // R2 first, then D1 pointer (ADR 001 S5.7 ordering)
    await r2.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: file.type },
        customMetadata: { filename: file.name },
    });

    try {
        await db.prepare('UPDATE systems SET visual_aid = ? WHERE id = ?').bind(r2Key, systemId).run();
    } catch (err) {
        console.error(`[visual-aid] D1 write failed after R2 put, orphaned key: ${r2Key}`, err);
        return c.json({ error: 'internal_error', message: 'Upload confirmed to storage but metadata write failed. Please retry.' }, 500);
    }

    // Swap: delete the previous object only after the pointer moved
    const oldKey = system.visual_aid;
    if (oldKey && oldKey.startsWith(VISUAL_AID_KEY_PREFIX)) {
        await r2.delete(oldKey).catch(() => {});
    }

    return c.json({ r2_key: r2Key, content_type: file.type, size_bytes: file.size }, 201);
});

// GET /api/systems/:system_id/visual-aid (streams the stored image)
app.get('/:system_id/visual-aid', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const r2 = c.env.ATTACHMENTS;

    const system = await getOwnedSystem(db, c.req.param('system_id'), userId);
    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }
    if (!system.visual_aid) {
        return c.json({ error: 'not_found', message: 'No visual aid uploaded.' }, 404);
    }

    const r2Object = await r2.get(system.visual_aid);
    if (!r2Object) {
        return c.json({ error: 'not_found', message: 'Visual aid data not found in storage.' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', r2Object.httpMetadata?.contentType ?? 'application/octet-stream');
    headers.set('Content-Disposition', 'inline');
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(r2Object.body, { status: 200, headers });
});

// DELETE /api/systems/:system_id/visual-aid
app.delete('/:system_id/visual-aid', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const r2 = c.env.ATTACHMENTS;

    const system = await getOwnedSystem(db, c.req.param('system_id'), userId);
    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    if (system.visual_aid) {
        await r2.delete(system.visual_aid).catch(() => {});
        await db.prepare('UPDATE systems SET visual_aid = NULL WHERE id = ?').bind(system.id).run();
    }

    return c.json({ ok: true });
});

export default app;
```

Modify `packages/api/src/index.ts` — add the import next to the other route imports and mount after the systems routes (line ~69):

```ts
import visualAidRoutes from './routes/visual-aid';
```

```ts
// Systems route
app.route('/api/systems', systemsRoutes);

// Visual aid (upload/serve/delete)
app.route('/api/systems', visualAidRoutes);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/__tests__/system-content.spec.ts` (workdir `packages/api`)
Expected: all 12 tests pass (5 systems columns + 7 visual aid).

- [ ] **Step 5: Run the full API suite + lint**

Run: `pnpm exec vitest run` (workdir `packages/api`) — expected: all suites pass, including the pre-existing `attachments.spec.ts` (it uses the same R2 bucket binding).
Run: `pnpm exec eslint src/` (workdir `packages/api`) — expected: no output.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/lib/visual-aid.ts packages/api/src/routes/visual-aid.ts packages/api/src/index.ts packages/api/src/__tests__/system-content.spec.ts
git commit -m "feat(api): add system visual aid upload, serve, and delete routes"
```

---

## Task 3: Web markdown core (`marked` + DOMPurify)

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/src/lib/markdown/markdown.ts`
- Create: `packages/web/src/lib/markdown/markdown.spec.ts`
- Create: `packages/web/src/lib/components/MarkdownText.svelte`

- [ ] **Step 1: Add the dependencies**

Run: `pnpm --filter web add marked dompurify` (workdir `D:\PROGRAMS\Websites\Polaris`)
Both ship their own TypeScript types. This is the dependency addition flagged in the PR per AGENTS.md.

- [ ] **Step 2: Write the failing tests**

Create `packages/web/src/lib/markdown/markdown.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings, bold, lists, and GFM tables', () => {
    const html = renderMarkdown('# Title\n\n**bold**\n\n- a\n- b\n\n| A | B |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<table>');
  });

  it('strips script tags', () => {
    expect(renderMarkdown('<script>alert(1)</script>x')).not.toContain('script');
  });

  it('strips event handler attributes', () => {
    expect(renderMarkdown('<p onclick="x()">hi</p>')).not.toContain('onclick');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
```

Create `packages/web/src/lib/components/MarkdownText.svelte.spec.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownText from './MarkdownText.svelte';

describe('MarkdownText', () => {
  it('renders formatted markdown', async () => {
    render(MarkdownText, { props: { content: '# Heading\n\nSome **bold** text.\n\n- one\n- two' } });
    await expect.element(page.getByRole('heading', { name: 'Heading' })).toBeVisible();
    await expect.element(page.getByText('bold')).toBeVisible();
    await expect.element(page.getByRole('list')).toBeVisible();
  });

  it('does not execute script tags', async () => {
    const { container } = render(MarkdownText, { props: { content: '<script>window.pwned = 1</script>hello' } });
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('renders nothing for empty content', async () => {
    const { container } = render(MarkdownText, { props: { content: '' } });
    expect(container.textContent).toBe('');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter web test:unit -- --run src/lib/markdown/markdown.spec.ts src/lib/components/MarkdownText.svelte.spec.ts` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: FAIL — `./markdown` module does not exist (import error).

- [ ] **Step 4: Implement**

Create `packages/web/src/lib/markdown/markdown.ts`:

```ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true });

export function renderMarkdown(source: string): string {
  if (!source.trim()) return '';
  const raw = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}
```

Create `packages/web/src/lib/components/MarkdownText.svelte`:

```svelte
<script lang="ts">
  import { renderMarkdown } from '$lib/markdown/markdown';

  let { content }: { content: string } = $props();

  const html = $derived(renderMarkdown(content));
</script>

<div
  class="prose prose-sm max-w-none text-on-surface prose-headings:font-display prose-p:font-body prose-li:font-body prose-strong:font-semibold prose-table:text-sm prose-th:text-left"
  data-markdown
>
  {@html html}
</div>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter web test:unit -- --run src/lib/markdown/markdown.spec.ts src/lib/components/MarkdownText.svelte.spec.ts` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: 7 passed (4 + 3).

- [ ] **Step 6: Commit**

```bash
git add packages/web/package.json packages/web/pnpm-lock.yaml packages/web/src/lib/markdown packages/web/src/lib/components/MarkdownText.svelte.spec.ts packages/web/src/lib/components/MarkdownText.svelte
git commit -m "feat(web): add markdown rendering core with sanitization"
```

(If the lockfile lives at the repo root, stage the actual path — `git add packages/web/package.json pnpm-lock.yaml ...`.)

---

## Task 4: `parseSystemMarkdown` importer

**Files:**
- Create: `packages/web/src/lib/markdown/import.ts`
- Create: `packages/web/src/lib/markdown/import.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/lib/markdown/import.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSystemMarkdown } from './import';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web test:unit -- --run src/lib/markdown/import.spec.ts` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: FAIL — `./import` module does not exist.

- [ ] **Step 3: Implement**

Create `packages/web/src/lib/markdown/import.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web test:unit -- --run src/lib/markdown/import.spec.ts` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/markdown/import.ts packages/web/src/lib/markdown/import.spec.ts
git commit -m "feat(web): add markdown system importer parser"
```

---

## Task 5: ImportPanel + `/systems/new` wiring

**Files:**
- Create: `packages/web/src/lib/components/ImportPanel.svelte`
- Modify: `packages/web/src/routes/(app)/systems/new/+page.svelte`

- [ ] **Step 1: Write the component**

Create `packages/web/src/lib/components/ImportPanel.svelte`:

```svelte
<script lang="ts">
  import { parseSystemMarkdown } from '$lib/markdown/import';
  import type { ImportedSystemDraft } from '$lib/markdown/import';

  let { onimport }: { onimport: (draft: ImportedSystemDraft) => void } = $props();

  let error = $state<string | null>(null);
  let importing = $state(false);

  function handleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    error = null;
    importing = true;

    const reader = new FileReader();
    reader.onload = () => {
      importing = false;
      const result = parseSystemMarkdown(String(reader.result ?? ''));
      if (result.error) {
        error = result.error;
      } else if (result.draft) {
        onimport(result.draft);
      }
      input.value = '';
    };
    reader.onerror = () => {
      importing = false;
      error = "Couldn't read that file. Use a .md file.";
      input.value = '';
    };
    reader.readAsText(file);
  }
</script>

<div class="rounded-xl border border-border bg-surface-container-lowest p-5">
  <h3 class="font-body text-sm font-semibold text-on-surface">Import System</h3>
  <p class="font-body text-xs text-muted-foreground mt-1 mb-3">
    Upload a Markdown file with a <code class="text-primary"># Title</code> and
    <code class="text-primary">##</code> sections (Purpose, Philosophy, Protocol, Floor Action, Trigger,
    Barriers, Environment Cue, Reference Table, Success Metric) to fill the form.
  </p>

  <label
    class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-body font-medium text-on-surface hover:bg-surface/60 cursor-pointer disabled:opacity-50 transition-all duration-200"
    class:opacity-50={importing}
  >
    {importing ? 'Importing...' : 'Choose .md file'}
    <input type="file" accept=".md,text/markdown" class="hidden" onchange={handleFile} disabled={importing} />
  </label>

  {#if error}
    <p class="mt-2 text-sm text-destructive font-body">{error}</p>
  {/if}
</div>
```

- [ ] **Step 2: Wire it into the page**

Modify `packages/web/src/routes/(app)/systems/new/+page.svelte`:

1. Add the import after the `AIDraftPanel` import (line 4):

```ts
  import ImportPanel from '$lib/components/ImportPanel.svelte';
```

2. Add a handler after `onAIDraft` (lines 22–24):

```ts
  function onImport(draft: SystemDraft & { reference_table: string; success_metric: string }) {
    formDefaults = { ...draft };
  }
```

3. Render the panel between `AIDraftPanel` and `SystemForm` (between lines 37 and 38):

```svelte
  <ImportPanel onimport={onImport} />
```

- [ ] **Step 3: Verify with a build + type check**

Run: `pnpm --filter web check` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/components/ImportPanel.svelte packages/web/src/routes/\(app\)/systems/new/+page.svelte
git commit -m "feat(web): add import system panel on the new system page"
```

---

## Task 6: MarkdownField + SystemForm upgrade (new fields, types, visual aid upload)

**Files:**
- Create: `packages/web/src/lib/components/MarkdownField.svelte`
- Create: `packages/web/src/lib/components/VisualAidUpload.svelte`
- Create: `packages/web/src/lib/api/visual-aid.ts`
- Modify: `packages/web/src/lib/api/systems.ts`
- Modify: `packages/web/src/lib/components/SystemForm.svelte`

- [ ] **Step 1: Write the API module**

Create `packages/web/src/lib/api/visual-aid.ts`:

```ts
import { apiFetch, ApiError } from './client';

export interface VisualAidUploadResponse {
  r2_key: string;
  content_type: string;
  size_bytes: number;
}

export function uploadVisualAid(systemId: string, file: File): Promise<VisualAidUploadResponse> {
  const BASE = import.meta.env.VITE_API_BASE_URL || '';
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${BASE}/api/systems/${systemId}/visual-aid`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'unknown', message: 'Something went wrong.' }));
      throw new ApiError(res.status, body.error, body.message);
    }
    return res.json();
  });
}

export function deleteVisualAid(systemId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/systems/${systemId}/visual-aid`, { method: 'DELETE' });
}

export function visualAidSrc(systemId: string): string {
  const BASE = import.meta.env.VITE_API_BASE_URL || '';
  return `${BASE}/api/systems/${systemId}/visual-aid`;
}
```

- [ ] **Step 2: Extend the system types**

Modify `packages/web/src/lib/api/systems.ts`:

1. Add to the `System` interface (after `environment_cue`, line 14):

```ts
    reference_table: string;
    success_metric: string;
    visual_aid: string | null;
```

2. Add to `CreateSystemPayload` (after `environment_cue`, line 35):

```ts
    reference_table?: string;
    success_metric?: string;
```

- [ ] **Step 3: Write the MarkdownField component**

Create `packages/web/src/lib/components/MarkdownField.svelte`:

```svelte
<script lang="ts">
  import MarkdownText from './MarkdownText.svelte';

  let { id, label, value, placeholder = '', rows = 4, hint, onchange }: {
    id: string;
    label: string;
    value: string;
    placeholder?: string;
    rows?: number;
    hint?: string;
    onchange: (v: string) => void;
  } = $props();

  let mode = $state<'write' | 'preview'>('write');

  function toggleMode(next: 'write' | 'preview') {
    mode = next;
  }
</script>

<div>
  <div class="flex items-center justify-between mb-1">
    <label for={id} class="font-body text-sm font-medium text-on-surface">{label}</label>
    <div class="flex rounded-lg border border-border overflow-hidden text-xs font-body">
      <button
        type="button"
        onclick={() => toggleMode('write')}
        class="px-2.5 py-1 cursor-pointer transition-colors duration-150
               {mode === 'write' ? 'bg-primary text-white' : 'bg-surface text-on-surface-muted hover:text-on-surface'}"
      >
        Write
      </button>
      <button
        type="button"
        onclick={() => toggleMode('preview')}
        class="px-2.5 py-1 cursor-pointer transition-colors duration-150
               {mode === 'preview' ? 'bg-primary text-white' : 'bg-surface text-on-surface-muted hover:text-on-surface'}"
      >
        Preview
      </button>
    </div>
  </div>

  {#if mode === 'write'}
    <textarea
      id={id}
      value={value}
      rows={rows}
      placeholder={placeholder}
      oninput={(e) => onchange((e.currentTarget as HTMLTextAreaElement).value)}
      class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
             focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
             placeholder:text-muted-foreground transition-all duration-200"
    ></textarea>
  {:else}
    <div class="mt-1 rounded-xl border border-border bg-surface px-4 py-3 min-h-[80px]">
      {#if value.trim()}
        <MarkdownText content={value} />
      {:else}
        <p class="font-body text-sm text-muted-foreground">Nothing to preview yet.</p>
      {/if}
    </div>
  {/if}

  {#if hint}
    <p class="mt-1 font-body text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>
```

- [ ] **Step 4: Write the VisualAidUpload component**

Create `packages/web/src/lib/components/VisualAidUpload.svelte`:

```svelte
<script lang="ts">
  import { uploadVisualAid, deleteVisualAid, visualAidSrc } from '$lib/api/visual-aid';
  import { ApiError } from '$lib/api/client';

  let { systemId, value, onchange }: {
    systemId: string;
    value: string | null;
    onchange: (key: string | null) => void;
  } = $props();

  let uploading = $state(false);
  let error = $state<string | null>(null);

  async function handleUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    error = null;
    try {
      const res = await uploadVisualAid(systemId, file);
      onchange(res.r2_key);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Upload failed.';
    } finally {
      uploading = false;
      input.value = '';
    }
  }

  async function handleRemove() {
    error = null;
    try {
      await deleteVisualAid(systemId);
      onchange(null);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Remove failed.';
    }
  }
</script>

<div>
  {#if value}
    <div class="mt-2 rounded-xl border border-border overflow-hidden inline-block">
      <img src={visualAidSrc(systemId)} crossorigin="use-credentials" alt="Visual aid"
           class="max-h-64 w-auto object-contain bg-surface" />
    </div>
    <div class="mt-2 flex items-center gap-2">
      <label class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-body font-medium text-on-surface hover:bg-surface/60 cursor-pointer transition-colors duration-150">
        Replace image
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" class="hidden" onchange={handleUpload} disabled={uploading} />
      </label>
      <button type="button" onclick={handleRemove}
              class="rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-body font-medium hover:bg-destructive/20 cursor-pointer transition-colors duration-150">
        Remove
      </button>
    </div>
  {:else}
    <label class="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-body font-medium text-on-surface hover:bg-surface/60 cursor-pointer transition-colors duration-150 disabled:opacity-50">
      {uploading ? 'Uploading...' : 'Upload image (max 10 MB)'}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" class="hidden" onchange={handleUpload} disabled={uploading} />
    </label>
  {/if}
  {#if error}
    <p class="mt-2 text-xs text-destructive font-body">{error}</p>
  {/if}
</div>
```

- [ ] **Step 5: Upgrade SystemForm**

Modify `packages/web/src/lib/components/SystemForm.svelte`:

1. Imports — add after line 7 (`Check` import):

```ts
  import MarkdownField from './MarkdownField.svelte';
  import VisualAidUpload from './VisualAidUpload.svelte';
```

2. `defaults` prop type — add the new keys (inside the `defaults` object type, after `environment_cue?`):

```ts
      reference_table?: string;
      success_metric?: string;
```

3. State — add after `environment_cue` (line 36):

```ts
  let reference_table = $state(snap?.reference_table ?? '');
  let success_metric = $state(snap?.success_metric ?? '');
  let visual_aid = $state<string | null>(snap?.visual_aid ?? null);
```

4. `$effect` (lines 38–54) — add after the `environment_cue` assignment:

```ts
        reference_table = defaultsProp.reference_table ?? '';
        success_metric = defaultsProp.success_metric ?? '';
```

5. `dirty` (lines 61–74) — add to the `systemId` branch:

```ts
        || reference_table !== (snap?.reference_table ?? '')
        || success_metric !== (snap?.success_metric ?? '')
```

6. `doAutosave` payload (after line 94) — add:

```ts
      if (reference_table !== (snap?.reference_table ?? '')) payload.reference_table = reference_table;
      if (success_metric !== (snap?.success_metric ?? '')) payload.success_metric = success_metric;
```

7. Swap the four plain textareas for `MarkdownField` (keeping the same fields, ids, placeholders, and `scheduleAutosave` wiring):

- `purpose` (lines 171–178):

```svelte
      <div class="field-group">
        <MarkdownField
          id="purpose"
          label="Purpose"
          value={purpose}
          onchange={(v) => { purpose = v; scheduleAutosave(); }}
          rows={3}
          placeholder="Why does this system exist?"
        />
      </div>
```

- `philosophy` (lines 180–187):

```svelte
      <div class="field-group">
        <MarkdownField
          id="philosophy"
          label="Philosophy"
          value={philosophy}
          onchange={(v) => { philosophy = v; scheduleAutosave(); }}
          rows={3}
          placeholder="What principles guide this system?"
        />
      </div>
```

- `floor_action` (lines 202–213) — keep the confirm-error paragraph after the field:

```svelte
      <div class="field-group">
        <MarkdownField
          id="floor_action"
          label="What's the smallest version?"
          value={floor_action}
          onchange={(v) => { floor_action = v; scheduleAutosave(); }}
          rows={2}
          placeholder="e.g. Read one page"
        />
        <p class="mt-1 font-body text-xs text-muted-foreground">What would count as a win on your worst day?</p>
        {#if confirmError}
          <p class="mt-1 text-sm text-destructive font-body">{confirmError}</p>
        {/if}
      </div>
```

- `protocol` (lines 226–232):

```svelte
      <div class="field-group">
        <MarkdownField
          id="protocol"
          label="Protocol"
          value={protocol}
          onchange={(v) => { protocol = v; scheduleAutosave(); }}
          rows={4}
          placeholder="What are the steps or rules?"
        />
      </div>
```

8. Renumber Section 4 (Schedule) to 5 and insert a new Section 4 between the Barriers & Environment section and the Schedule section (replace the `<!-- Section 4: Schedule -->` block opening with):

```svelte
  <!-- Section 4: Reference & Visual Aid -->
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-semibold">4</span>
      <h2 class="font-body text-base font-semibold text-on-surface">Reference & Visual Aid</h2>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm space-y-4">
      <div class="field-group">
        <MarkdownField
          id="reference_table"
          label="Reference Table"
          value={reference_table}
          onchange={(v) => { reference_table = v; scheduleAutosave(); }}
          rows={4}
          placeholder="| Trigger | Action |\n|---|---|\n| Alarm | Stand up |"
          hint="A Markdown table is rendered as a table on the detail page; other content renders as prose."
        />
      </div>

      <div class="field-group">
        <label for="success_metric" class="font-body text-sm font-medium text-on-surface">Success Metric</label>
        <input id="success_metric" type="text" bind:value={success_metric} oninput={scheduleAutosave}
               class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                      focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                      placeholder:text-muted-foreground transition-all duration-200"
               placeholder="e.g. 2 hours of deep reading" />
        <p class="mt-1 font-body text-xs text-muted-foreground">What does 'full' look like? Shown next to the floor action.</p>
      </div>

      <div class="field-group">
        <p class="font-body text-sm font-medium text-on-surface">Visual Aid</p>
        {#if !systemId}
          <p class="mt-1 text-sm font-body text-on-surface-muted">Save the system first to upload a visual aid.</p>
        {:else}
          <VisualAidUpload systemId={systemId} value={visual_aid} onchange={(key) => (visual_aid = key)} />
        {/if}
      </div>
    </div>
  </section>

  <!-- Section 5: Schedule -->
```

- [ ] **Step 6: Verify**

Run: `pnpm --filter web check` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: no type errors.

Run: `pnpm --filter web test:unit -- --run` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: all existing web unit tests still pass.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/lib/api/visual-aid.ts packages/web/src/lib/api/systems.ts packages/web/src/lib/components/MarkdownField.svelte packages/web/src/lib/components/VisualAidUpload.svelte packages/web/src/lib/components/SystemForm.svelte
git commit -m "feat(web): add markdown fields, reference table, success metric, visual aid upload to system form"
```

---

## Task 7: Detail page — markdown rendering, Schedule Block, visual aid

**Files:**
- Create: `packages/web/src/lib/components/ScheduleBlock.svelte`
- Modify: `packages/web/src/routes/(app)/systems/[id]/+page.svelte`

- [ ] **Step 1: Write the ScheduleBlock component**

Create `packages/web/src/lib/components/ScheduleBlock.svelte`:

```svelte
<script lang="ts">
  import { getSchedules } from '$lib/api/schedules';
  import type { Schedule } from '$lib/api/schedules';

  let { systemId }: { systemId: string } = $props();

  let schedules = $state<Schedule[]>([]);
  let loaded = $state(false);

  const DAY_LABELS = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  $effect(() => {
    if (loaded) return;
    getSchedules(systemId)
      .then((res) => {
        schedules = res.schedules;
        loaded = true;
      })
      .catch(() => {
        loaded = true;
      });
  });
</script>

{#if schedules.length > 0}
  <div class="flex flex-col gap-2">
    {#each schedules as schedule (schedule.id)}
      <div class="flex items-center gap-3 rounded-lg border border-border bg-surface/50 px-3 py-2">
        <div class="flex gap-1">
          {#each DAY_LABELS as label, i}
            <span
              class="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-body
                     {schedule.days_of_week & (1 << i) ? 'bg-primary/15 text-primary font-semibold' : 'bg-surface text-on-surface-muted'}"
            >
              {label}
            </span>
          {/each}
        </div>
        <span class="text-sm font-body text-on-surface tabular-nums">
          {schedule.time_window_start} – {schedule.time_window_end}
        </span>
      </div>
    {/each}
  </div>
{:else if loaded}
  <p class="font-body text-sm text-muted-foreground">No schedule configured.</p>
{/if}
```

- [ ] **Step 2: Upgrade the detail page**

Modify `packages/web/src/routes/(app)/systems/[id]/+page.svelte`:

1. Imports — add after line 7 (`Modal` import):

```ts
    import MarkdownText from '$lib/components/MarkdownText.svelte';
    import ScheduleBlock from '$lib/components/ScheduleBlock.svelte';
    import { visualAidSrc } from '$lib/api/visual-aid';
```

2. The `fields` derived (lines 96–103) — render markdown for every text field. Replace the whole `fields` array with a plain array and let the template use `MarkdownText`:

```ts
    const fields = $derived([
        { label: 'Purpose', value: system.purpose },
        { label: 'Philosophy', value: system.philosophy },
        { label: 'Protocol', value: system.protocol },
        { label: 'Floor Action', value: system.floor_action },
        { label: 'Trigger', value: system.trigger },
        { label: 'Environment Cue', value: system.environment_cue },
    ].filter(f => f.value));
```

3. Replace the `<dd>` (line 113) with:

```svelte
          <dd class="font-body text-sm text-on-surface leading-relaxed">
            <MarkdownText content={field.value} />
          </dd>
```

4. After the Blueprint `<section>` (after line 117), insert three new sections:

```svelte
  {#if system.success_metric}
    <section class="bg-primary/10 rounded-xl p-5">
      <h2 class="font-body text-xs font-semibold text-primary uppercase tracking-wide mb-2">Success Metric</h2>
      <p class="font-body text-sm text-on-surface font-medium">{system.success_metric}</p>
    </section>
  {/if}

  {#if system.reference_table}
    <section class="bg-surface-container-low rounded-xl p-6">
      <h2 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Reference</h2>
      <MarkdownText content={system.reference_table} />
    </section>
  {/if}

  {#if system.visual_aid}
    <section class="bg-surface-container-low rounded-xl p-6">
      <h2 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Visual Aid</h2>
      <img src={visualAidSrc(system.id)} crossorigin="use-credentials" alt="Visual aid"
           class="max-h-96 w-auto rounded-xl object-contain" />
    </section>
  {/if}
```

5. Add the Schedule Block section after the Known Barriers section (after the `{/if}` on line 128):

```svelte
  <section class="bg-surface-container-low rounded-xl p-6">
    <h2 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Schedule</h2>
    <ScheduleBlock systemId={system.id} />
  </section>
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter web check` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: no type errors.

Run: `pnpm --filter web test:unit -- --run` (workdir `D:\PROGRAMS\Websites\Polaris`)
Expected: all web unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/components/ScheduleBlock.svelte packages/web/src/routes/\(app\)/systems/\[id\]/+page.svelte
git commit -m "feat(web): render markdown, schedule block, and visual aid on system detail page"
```

---

## Task 8: Docs + full verification

**Files:**
- Modify: `docs/reference/api-routes.md`
- Modify: `docs/ADRs/002-d1-schema.md`

- [ ] **Step 1: Update api-routes.md**

Modify `docs/reference/api-routes.md`:

1. In the `GET /api/systems` response example (S2.x area) and the `POST /api/systems` payload section, add the three fields (`reference_table`, `success_metric`, `visual_aid`). Find the systems payload block (around lines 100–130) and add:

```
  "reference_table": "",          // Markdown source, rendered on the detail page
  "success_metric": "",           // Short plain text, shown next to the floor action
  "visual_aid": null              // R2 key of the uploaded image (managed via /visual-aid endpoints)
```

2. Add a new subsection `4.3 GET /api/systems/:system_id/visual-aid` (after S4.2 `GET /api/instances/:id` ends, before whatever follows) documenting all three visual-aid endpoints:

```markdown
### 4.3 Visual aid (`/api/systems/:system_id/visual-aid`)

- `POST` (multipart, field `file`): upload or replace the system's visual aid image.
  - Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/avif` (SVG excluded).
  - Size limit: 10 MB. Responses: `201 { r2_key, content_type, size_bytes }`, `400 unsupported_file_type`, `413 file_too_large`, `404` (not owned).
- `GET`: streams the stored image (`Content-Type` from the object, `Cache-Control: public, max-age=31536000`). `404` when none uploaded.
- `DELETE`: removes the R2 object and clears the column. `200 { ok: true }`.
```

3. Update the auth-gated route table at the end of the file (around line 655) to add the three rows:

```
| `POST` | `/api/systems/:system_id/visual-aid` | `user_id` | R2 put + D1 pointer update |
| `GET` | `/api/systems/:system_id/visual-aid` | `user_id` | R2 stream |
| `DELETE` | `/api/systems/:system_id/visual-aid` | `user_id` | R2 delete + column clear |
```

- [ ] **Step 2: Update ADR 002**

Modify `docs/ADRs/002-d1-schema.md` — in the `systems` table definition section, add after the `environment_cue` column line:

```
  reference_table  TEXT NOT NULL DEFAULT '',   -- Markdown source; rendered as a table or prose on the detail page
  success_metric   TEXT NOT NULL DEFAULT '',   -- Short plain text; what 'full' looks like, shown next to the floor action
  visual_aid       TEXT,                        -- R2 key in the ATTACHMENTS bucket under visual-aids/<system_id>/<uuid>.<ext>; managed by the /visual-aid routes, not PATCH
```

- [ ] **Step 3: Full verification**

Run (workdir `D:\PROGRAMS\Websites\Polaris\packages\api`):
`pnpm exec vitest run` — expected: all suites pass (215+ existing + 12 new).
`pnpm exec eslint src/` — expected: no output.

Run (workdir `D:\PROGRAMS\Websites\Polaris`):
`pnpm --filter web check` — expected: no errors.
`pnpm --filter web test:unit -- --run` — expected: all pass.
`pnpm --filter web build` — expected: builds clean.

Grep `docs/` for stale references to the old behavior (`window-gated`, `time_window_start <=`) and any new mention of the visual-aid routes — fix leftovers.

- [ ] **Step 4: Manual smoke (optional, needs local dev)**

Run `pnpm --filter api dev:e2e` and `pnpm --filter web dev` (workdir `D:\PROGRAMS\Websites\Polaris`), then:
1. Create a system with markdown in Purpose/Protocol (heading, table, bullets); confirm Write/Preview toggles work and autosave persists.
2. Upload a visual aid image; confirm preview shows and the detail page displays it.
3. On `/systems/new`, import a `.md` file; confirm the form fills; confirm sections with `###` subheadings keep them.
4. Confirm the detail page shows the Success Metric highlight, Reference table, and Schedule Block.

- [ ] **Step 5: Commit**

```bash
git add docs/reference/api-routes.md docs/ADRs/002-d1-schema.md
git commit -m "docs: document system content fields and visual aid endpoints"
```

---

## Self-review notes (resolved during planning)

- **Visual aid vs import:** the `## Visual Aid` import section was dropped (spec updated) — an import cannot carry a file upload; the R2-key column would have been type-inconsistent with URLs.
- **Section delimiters vs in-content subheadings:** `##` splits sections; `###`+ are preserved as content (spec updated, parser test `preserves ### subheadings` covers it).
- **PATCH whitelist excludes `visual_aid`** — only the upload/delete endpoints mutate it, so a stale client can never clobber an image with a string.
- **Cross-origin image in dev:** `<img crossorigin="use-credentials">` + the app-wide CORS middleware (`credentials: true`, `localhost:5173` allowed) makes dev images work; production is same-origin via the Pages proxy.
