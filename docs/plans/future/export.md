# System Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-system JSON export route and a download button on the System Detail page.

**Architecture:** A new read-only GET route (`/api/systems/:system_id/export`) that aggregates D1 data (system, schedules, instances, reviews, workspace, attachment filenames) and Mongo data (journal entries) into a single JSON blob. Frontend triggers a Blob download via native browser APIs.

**Tech Stack:** Hono (backend), cloudflare:test + Vitest (integration tests), Svelte 5 + apiFetch (frontend)

---

### Task 1: Create the export route file

**Files:**
- Create: `packages/api/src/routes/export.ts`
- Test: `packages/api/src/__tests__/export.spec.ts` (in Task 3)

- [ ] **Step 1: Write `packages/api/src/routes/export.ts`**

```ts
import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { getOwnedSystem } from "../lib/ownership";
import { getMongoClient } from "../lib/mongo";
import type { User, Session } from "better-auth/types";

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

app.get('/', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('system_id');
    if (!systemId) return c.json({ error: 'not_found', message: 'System not found.' }, 404);

    const system = await getOwnedSystem(db, systemId, userId);
    if (!system) return c.json({ error: 'not_found', message: 'System not found.' }, 404);

    const now = new Date().toISOString();

    // D1 queries — simple SELECTs pushed to SQLite
    const { results: schedules } = await db.prepare(
        'SELECT * FROM schedules WHERE system_id = ? ORDER BY created_at DESC'
    ).bind(systemId).all<any>();

    const { results: instances } = await db.prepare(
        'SELECT * FROM instances WHERE system_id = ? ORDER BY date ASC, created_at ASC'
    ).bind(systemId).all<any>();

    const { results: reviews } = await db.prepare(
        'SELECT * FROM reviews WHERE system_id = ? ORDER BY period_start DESC'
    ).bind(systemId).all<any>();

    const workspaceRow = await db.prepare(
        'SELECT * FROM workspaces WHERE system_id = ?'
    ).bind(systemId).first<any>();

    const workspace = workspaceRow ? {
        ...workspaceRow,
        layout: typeof workspaceRow.layout === 'string' ? JSON.parse(workspaceRow.layout) : workspaceRow.layout,
    } : null;

    // Attachment filenames
    const { results: attachments } = await db.prepare(
        'SELECT filename FROM attachments WHERE workspace_id = (SELECT id FROM workspaces WHERE system_id = ?)'
    ).bind(systemId).all<{ filename: string }>();
    const attachmentFilenames = attachments.map(a => a.filename);

    // Mongo — journal entries for this system
    let journalEntries: { _id: string; instance_id: string; widget_id: string; text: string; created_at: Date }[] = [];
    try {
        const client = await getMongoClient(c.env.MONGODB_URI);
        const collection = client.db().collection('journal_entries');
        journalEntries = await collection.find({ system_id: systemId }).toArray() as any[];
    } catch (err) {
        console.warn(`[export] mongo query failed system=${systemId}`, err);
    }

    return c.json({
        exported_at: now,
        schema_version: 1,
        system,
        schedules,
        instances,
        reviews,
        workspace,
        journal_entries: journalEntries.map(e => ({
            entry_id: e._id,
            instance_id: e.instance_id,
            widget_id: e.widget_id,
            text: e.text,
            created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
        })),
        attachment_filenames: attachmentFilenames,
    });
});

export default app;
```

- [ ] **Step 2: Verify the file compiles**

Run: `pnpm --filter api check` (or `npx tsc --noEmit -p packages/api/tsconfig.json`)
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routes/export.ts
git commit -m "feat(api): add system export route"
```

---

### Task 2: Register the route in index.ts

**Files:**
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Add the import and route registration**

Add the import after the existing routes block (~line 26):

```ts
import exportRoutes from './routes/export';
```

Add the route registration after `app.route('/api/systems/:system_id/workspace', workspaceRoutes);` (~line 87):

```ts
// System export
app.route('/api/systems/:system_id/export', exportRoutes);
```

- [ ] **Step 2: Verify compilation**

Run: `pnpm --filter api check`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/index.ts
git commit -m "feat(api): register /api/systems/:system_id/export route"
```

---

### Task 3: Integration tests

**Files:**
- Create: `packages/api/src/__tests__/export.spec.ts`

- [ ] **Step 1: Write `packages/api/src/__tests__/export.spec.ts`**

```ts
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi, inject } from 'vitest';
import { Hono } from 'hono';
import exportRoutes from '../routes/export';

const migrations = inject('migrations');

// Mock Mongo — the export route reads journal entries via Mongo
vi.mock('../lib/mongo', () => ({
    getMongoClient: vi.fn(),
}));

import { getMongoClient } from '../lib/mongo';

// --- Factory helpers ---

function mockMongoClient() {
    const toArray = vi.fn<() => Promise<any[]>>();
    const collection = {
        find: vi.fn().mockReturnValue({ toArray }),
    };
    const mockClient = {
        db: vi.fn().mockReturnValue({ collection: vi.fn().mockReturnValue(collection) }),
    };
    vi.mocked(getMongoClient).mockResolvedValue(mockClient as any);
    return { toArray };
}

function getAuthedApp(userId: string) {
    const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
    app.use('/api/*', async (c, next) => {
        c.set('user', { id: userId, email: 'test@test.com' });
        c.set('session', { id: crypto.randomUUID(), userId });
        await next();
    });
    app.route('/api/systems/:system_id/export', exportRoutes);
    return app;
}

async function seedUser(db: D1Database, userId: string) {
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT OR IGNORE INTO user (id, name, email, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, 1, ?, ?)`
    ).bind(userId, 'Test User', `${userId}@test.com`, now, now).run();
}

async function seedSystem(db: D1Database, userId: string): Promise<string> {
    const systemId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO systems (id, user_id, name, domain, purpose, philosophy, protocol, floor_action, trigger, barrier_list, environment_cue, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(
        systemId, userId, 'Export Test System', 'productivity',
        'Test purpose', 'Test philosophy', 'Test protocol', 'Do one thing',
        'After coffee', JSON.stringify(['distractions']), 'Quiet room',
        now, now
    ).run();
    return systemId;
}

async function seedSchedule(db: D1Database, systemId: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO schedules (id, system_id, days_of_week, time_window_start, time_window_end, recurrence, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'weekly', ?, ?)`
    ).bind(id, systemId, 127, '09:00', '10:00', now, now).run();
    return id;
}

async function seedInstance(db: D1Database, systemId: string, date: string, state: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO instances (id, system_id, date, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, systemId, date, state, now, now).run();
    return id;
}

async function seedReview(db: D1Database, systemId: string, periodStart: string, periodEnd: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO reviews (id, system_id, period_start, period_end, what_worked, what_broke, worst_day_check, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).bind(id, systemId, periodStart, periodEnd, 'Worked well', 'Nothing broke', now, now).run();
    return id;
}

async function seedWorkspace(db: D1Database, systemId: string): Promise<string> {
    const workspaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const layout = JSON.stringify({ v: 1, widgets: [] });
    await db.prepare(
        `INSERT INTO workspaces (id, system_id, layout, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(workspaceId, systemId, layout, now, now).run();
    return workspaceId;
}

async function seedAttachment(db: D1Database, workspaceId: string, filename: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO attachments (id, workspace_id, filename, content_type, size_bytes, r2_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, workspaceId, filename, 'application/pdf', 1024, `attachments/${id}`, now, now).run();
}

// --- Tests ---

describe('GET /api/systems/:system_id/export', () => {
    const userId = 'user-export-test';

    beforeEach(async () => {
        await applyD1Migrations(env.DB, migrations);
        await seedUser(env.DB, userId);
        vi.clearAllMocks();
    });

    it('returns full export with all data sections', async () => {
        const { toArray } = mockMongoClient();
        toArray.mockResolvedValue([
            { _id: 'journal-1', instance_id: 'inst-1', widget_id: 'w-log-1', text: 'Good day', created_at: new Date('2026-07-01T12:00:00Z') },
        ]);

        const systemId = await seedSystem(env.DB, userId);
        await seedSchedule(env.DB, systemId);
        await seedInstance(env.DB, systemId, '2026-07-01', 'full');
        await seedInstance(env.DB, systemId, '2026-07-02', 'floor');
        await seedReview(env.DB, systemId, '2026-07-06', '2026-07-12');
        await seedWorkspace(env.DB, systemId);

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;

        expect(body.schema_version).toBe(1);
        expect(body.exported_at).toBeTruthy();
        expect(body.system.id).toBe(systemId);
        expect(body.system.name).toBe('Export Test System');
        expect(body.system.barrier_list).toEqual(['distractions']);
        expect(body.schedules).toHaveLength(1);
        expect(body.instances).toHaveLength(2);
        expect(body.instances[0].state).toBe('full');
        expect(body.instances[1].state).toBe('floor');
        expect(body.reviews).toHaveLength(1);
        expect(body.workspace).toBeTruthy();
        expect(body.workspace.system_id).toBe(systemId);
        expect(body.journal_entries).toHaveLength(1);
        expect(body.journal_entries[0].text).toBe('Good day');
        expect(body.attachment_filenames).toEqual([]);
    });

    it('returns 404 for non-owned system', async () => {
        mockMongoClient();
        const systemId = await seedSystem(env.DB, userId);
        const app = getAuthedApp('other-user-id');
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );
        expect(res.status).toBe(404);
    });

    it('returns 404 for non-existent system', async () => {
        mockMongoClient();
        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${crypto.randomUUID()}/export`),
            env
        );
        expect(res.status).toBe(404);
    });

    it('returns valid export for an empty system (no activity)', async () => {
        const { toArray } = mockMongoClient();
        toArray.mockResolvedValue([]);

        const systemId = await seedSystem(env.DB, userId);
        await seedWorkspace(env.DB, systemId);

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.instances).toEqual([]);
        expect(body.schedules).toEqual([]);
        expect(body.reviews).toEqual([]);
        expect(body.journal_entries).toEqual([]);
        expect(body.attachment_filenames).toEqual([]);
        expect(body.workspace).toBeTruthy();
    });

    it('includes attachment filenames when attachments exist', async () => {
        const { toArray } = mockMongoClient();
        toArray.mockResolvedValue([]);

        const systemId = await seedSystem(env.DB, userId);
        const workspaceId = await seedWorkspace(env.DB, systemId);
        await seedAttachment(env.DB, workspaceId, 'report.pdf');
        await seedAttachment(env.DB, workspaceId, 'photo.png');

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.attachment_filenames).toContain('report.pdf');
        expect(body.attachment_filenames).toContain('photo.png');
    });

    it('handles Mongo failure gracefully (returns empty array)', async () => {
        vi.mocked(getMongoClient).mockRejectedValue(new Error('Mongo down'));

        const systemId = await seedSystem(env.DB, userId);
        await seedWorkspace(env.DB, systemId);

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.journal_entries).toEqual([]);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail (no route yet)**

Run: `pnpm --filter api test:integration -- --run src/__tests__/export.spec.ts`
Expected: tests either fail naturally since route isn't registered, or pass once registered

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/__tests__/export.spec.ts
git commit -m "test(api): add export endpoint integration tests"
```

---

### Task 4: Frontend API module

**Files:**
- Create: `packages/web/src/lib/api/export.ts`

- [ ] **Step 1: Write `packages/web/src/lib/api/export.ts`**

```ts
import { apiFetch } from './client';

export interface SystemExport {
    exported_at: string;
    schema_version: number;
    system: Record<string, unknown>;
    schedules: Record<string, unknown>[];
    instances: Record<string, unknown>[];
    reviews: Record<string, unknown>[];
    workspace: Record<string, unknown> | null;
    journal_entries: {
        entry_id: string;
        instance_id: string;
        widget_id: string;
        text: string;
        created_at: string;
    }[];
    attachment_filenames: string[];
}

export async function exportSystem(systemId: string): Promise<SystemExport> {
    return apiFetch<SystemExport>(`/api/systems/${systemId}/export`);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api/export.ts
git commit -m "feat(web): add exportSystem API module"
```

---

### Task 5: Frontend Export button on System Detail page

**Files:**
- Modify: `packages/web/src/routes/(app)/systems/[id]/+page.svelte`

- [ ] **Step 1: Add the import and download helper at the top of the script section**

Add after existing imports (~after the `import` block):

```ts
import { exportSystem } from '$lib/api/export';
import { addToast } from '$lib/stores/toast.svelte';

let exporting = $state(false);

function sanitizeFilename(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'system';
}

async function handleExport() {
    exporting = true;
    try {
        const data = await exportSystem(system.id);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizeFilename(system.name)}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('success', 'System exported');
    } catch (e) {
        addToast('error', 'Export failed');
    } finally {
        exporting = false;
    }
}
```

- [ ] **Step 2: Add the Export action card in the template, after the "Save as template" card (~line 76)**

```svelte
<div class="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
    <div>
      <h3 class="font-body text-sm font-semibold text-on-surface">Export system</h3>
      <p class="font-body text-xs text-muted-foreground mt-0.5">Download this system's data as a JSON file</p>
    </div>
    <button onclick={handleExport} disabled={exporting}
            class="rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary
                   px-5 py-2.5 text-sm font-body font-semibold
                   transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
      {exporting ? 'Exporting...' : 'Export'}
    </button>
  </div>
```

- [ ] **Step 3: Verify the page compiles**

Run: `pnpm --filter web check` or `npx svelte-kit sync && npx tsc --noEmit -p packages/web/tsconfig.json`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/routes/\(app\)/systems/\[id\]/+page.svelte packages/web/src/lib/api/export.ts
git commit -m "feat(web): add export button to system detail page"
```

---

### Task 6: Run full test suite

- [ ] **Step 1: Run integration tests**

```bash
pnpm --filter api test:integration
```

Expected: all tests pass including the new export spec

- [ ] **Step 2: Run frontend typecheck**

```bash
pnpm --filter web check
```

Expected: no errors

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "chore: finalize export feature"
```

---

## Spec Coverage Check

| Spec requirement | Task(s) |
|---|---|
| `GET /api/systems/:system_id/export` route | Tasks 1, 2 |
| Ownership-scoped via getOwnedSystem | Task 1 — uses existing `getOwnedSystem` |
| D1 data: system, schedules, instances, reviews, workspace | Task 1 — all queried |
| Mongo data: journal entries | Task 1 — via getMongoClient, with graceful fallback |
| Attachment filenames (not files) | Task 1 — `SELECT filename FROM attachments` |
| Response shape with exported_at, schema_version | Task 1 — included in JSON |
| Frontend button on System Detail page | Task 5 |
| Client-side Blob download | Task 5 — `Blob + URL.createObjectURL + <a>` pattern |
| Integration tests | Task 3 |
| No new dependencies | No new package.json entries anywhere |