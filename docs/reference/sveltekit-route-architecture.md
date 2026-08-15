# SvelteKit Route Architecture

**Project:** *Paragon*

**Document type:** Frontend architecture -- the page tree, auth guard, store design, component hierarchy, and navigation model for `packages/web`. Companion to the [API Route Design](api-routes.md) (owns every endpoint this frontend calls), [Auth Integration](auth-integration.md) (owns `authClient`/session primitives this document consumes), and the [PRD](../PRD/PRD-systems-app.md) (owns the user flows this route tree implements).
**Status:** Draft -- v1 scope

**Implementation status:** Current (S2–S21 live)

**Last updated:** July 22, 2026

---

## 1. Foundational Constraints

ADR 001 S5.2 disables SSR entirely -- SvelteKit is served as static assets with zero Worker invocation for the frontend. This has one structural consequence that shapes every route below: **there is no server-side code in `packages/web` at all.** Every `load` function is a **universal** `+page.ts` / `+layout.ts` (not `+page.server.ts`), which SvelteKit runs client-side when SSR is off.

```typescript
// packages/web/src/routes/+layout.ts
export const ssr = false;
export const prerender = false;
```

Set once at the root; every route inherits it. Every load function's `fetch` call to `/api/*` must still set `credentials: 'include'` explicitly (Auth Integration S2) -- SvelteKit's enhanced `fetch` only auto-forwards cookies during SSR, which this app never does.

### 1.1 Theme boot before first paint

Because SSR is disabled, the frontend must set the theme before Svelte mounts or users will see a flash of the wrong theme. `packages/web/src/app.html` should include a tiny inline script in `<head>` that reads `localStorage.theme`, falls back to `prefers-color-scheme`, and sets `document.documentElement.dataset.theme` to `light` or `dark` before the app bundle loads. The Svelte theme toggle then updates the same `data-theme` attribute and persists the value back to `localStorage`.

```html
<script>
  (() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = stored || (prefersDark ? 'dark' : 'light');
  })();
</script>
```

Keep this script dependency-free and synchronous. It exists only to prevent theme flash; all interactive theme UI still lives in Svelte.

---

## 2. Route Tree

```
src/routes/
├── +layout.ts                    # ssr=false, prerender=false (root, S1)
├── +layout.svelte                # renders {@render children()} with no chrome -- session resolved here
├── +page.svelte                  # /  -- Landing page (pre-auth only), PRD 6.0 step 1 (no (marketing) group; the landing page is the root route itself)
│
├── (auth)/                       # Pre-auth route group -- no nav shell, centered form layout
│   ├── +layout.svelte            # getSession() on mount; signed-in users are goto()'d to /guides
│   ├── sign-up/
│   │   └── +page.svelte          # Sign Up form, Auth Integration 4.2
│   └── sign-in/
│       └── +page.svelte          # Sign In form, Auth Integration 4.2
│
└── (app)/                        # Post-auth route group -- nav shell, auth guard
    ├── +layout.ts                # Auth guard load function: getCachedSession(), redirect 302 → /sign-in (S3.3)
    ├── +layout.svelte            # Nav sidebar shell (S4)
    │
    ├── guides/
    │   └── +page.svelte          # Guides & Tutorials tab, PRD 6.0 step 3
    │
    ├── account/
    │   ├── +page.ts              # loads recovery codes for display
    │   └── +page.svelte          # Account settings: recovery codes (masked, hide/show) + regenerate
    │
    ├── dashboard/
    │   ├── +page.ts              # loads GET /api/dashboard
    │   └── +page.svelte          # Daily Dashboard, PRD 6.3
    │
    ├── systems/
    │   ├── +page.ts              # loads GET /api/systems
    │   ├── +page.svelte          # "All systems" list view
    │   ├── new/
    │   │   └── +page.svelte      # System Creator, PRD 6.1
    │   └── [id]/
    │       ├── +layout.ts        # loads GET /api/systems/:id once, shared by all tabs below
    │       ├── +layout.svelte    # System detail shell: tabs for Overview / Workspace / Metrics / Reviews
    │       ├── +page.svelte      # Overview tab: blueprint fields, streak/calendar, PRD 6.5
    │       ├── edit/
    │       │   └── +page.svelte  # Edit System (reuses System Creator form)
    │       ├── workspace/
    │       │   ├── +page.ts      # loads GET /api/systems/:id/workspace
    │       │   └── +page.svelte  # Workspace Builder, PRD 6.2
    │       ├── metrics/
    │       │   ├── +page.ts      # loads GET /api/systems/:id/metrics
    │       │   └── +page.svelte  # Metrics dashboard (floor hold rate, review completion, streaks)
    │       └── reviews/
    │           ├── +page.ts      # loads GET /api/systems/:id/reviews
    │           ├── +page.svelte  # Per-system review history + "start a review" entry point
    │           └── new/
    │               └── +page.svelte  # Per-system Review form, PRD 6.4
    │
    └── review-day/
        ├── +page.ts              # loads GET /api/review-day
        └── +page.svelte          # Review Day aggregation view, PRD 5.7
```

### 2.1 Route group rationale

Route groups (parenthesized directories) apply different layouts without changing the URL:

- The landing page is the **root route** (`+page.svelte` at `/`) -- no marketing group was needed; the root layout is already chromeless.
- **`(auth)`** -- sign-up/login share a centered minimal form layout. Redirects signed-in users away.
- **`(app)`** -- every authenticated page has the nav sidebar and requires a valid session.

If a future pass wants a shared "unauthenticated" layout across both the landing and auth pages (e.g. a site-wide header), that's a one-file addition without restructuring routes.

### 2.2 Why `[id]` gets its own nested layout

`systems/[id]/+layout.ts` loads the System record once via `GET /api/systems/:id` and exposes it through `PageData` to every child route -- the Overview tab, workspace, metrics, reviews, and edit page all share the same fetched record rather than independently re-fetching. This matters because the System detail page is a tabbed interface: navigating between Overview/Workspace/Metrics/Reviews should feel instant, not re-trigger a full-page loading state. SvelteKit's nested-layout data model gives this for free.

### 2.3 What is NOT a route in v1

| Possible route | Reason omitted |
|---|---|
| `/terms`, `/privacy` | Personal app, no legal surface in v1 |
| `/auth/forgot-password` | Password reset deferred (Auth Integration 5) |
| `/attachments/:id` | Handled by the API route directly as a streamed URL, not a SvelteKit page |
| `/templates` | Template browser deferred; templates are selected inline during System creation |

**NavBar items (5):** `Dashboard`, `Systems`, `Review Day`, `Guides`, `Account`. Note `Account` is intentionally kept out of the sidebar proper -- it renders in the footer of the nav shell as a settings/link entry (per the NavBar component's account-excluded-from-sidebar decision), avoiding a 5th full-height sidebar item for a low-traffic page.

---

## 3. Auth Guard

The auth guard lives in `(app)/+layout.ts`, **not** the root layout. The root layout resolves the session but does not redirect -- that responsibility belongs to each route group's own layout.

### 3.1 Root layout load function

```typescript
// packages/web/src/routes/+layout.ts
import type { LayoutLoad } from './$types';

export const ssr = false;
export const prerender = false;

export const load: LayoutLoad = async () => {
  // Session is resolved here so child layouts and pages can access it via data.session.
  // The root layout never redirects -- each route group's own layout decides.
  return {};
};
```

### 3.2 Root layout component

The root layout is intentionally thin -- it renders children with no chrome. It does not import `authClient` or any auth logic. Its only job is to be the render root.

```svelte
<!-- packages/web/src/routes/+layout.svelte -->
<script lang="ts">
  let { children } = $props();
</script>

{@render children()}
```

### 3.3 App group auth guard

```typescript
// packages/web/src/routes/(app)/+layout.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { getCachedSession } from '$lib/auth/session.svelte';

export const load: LayoutLoad = async () => {
  // getCachedSession() is the SDK's non-reactive API wrapped with caching -- it returns
  // a promise, works in load context, and reuses the session already fetched by the root
  // layout rather than issuing a second /get-session round-trip per navigation.
  // This avoids duplicating Better Auth's session-check contract in a hand-rolled fetch.
  const { data: session } = await getCachedSession();

  if (!session) {
    throw redirect(302, '/sign-in');
  }

  return { session };
};
```

Every route under `(app)/` inherits this guard. No individual page needs its own auth check -- a page component under `(app)/` can assume `data.session` is present.

**Sign-out** does not need a symmetric guard. `authClient.signOut()` clears the session cookie, and the next navigation to any `(app)/` route re-runs this load function and redirects to `/sign-in`.

### 3.4 Auth group layout (pre-auth)

```svelte
<!-- packages/web/src/routes/(auth)/+layout.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { authClient } from '$lib/auth-client';

  let { children } = $props();
  let ready = $state(false);

  // Check session once on mount -- if already signed in, redirect to guides.
  // goto() (not throw redirect) is used here because this runs inside an $effect,
  // where throw redirect() is undocumented behavior; goto() is the documented
  // browser-side navigation API and this app is CSR-only anyway.
  $effect(() => {
    authClient.getSession().then(({ data: session }) => {
      if (session) { goto('/guides'); return; }
      ready = true;
    });
  });
</script>

{#if ready}
  {@render children()}
{/if}
```

The `auth-shell` wrapper is centered, minimal styling (logo/title at top, form below). It renders children only when there is no active session -- this prevents the sign-in form from flashing momentarily before redirect.

### 3.5 Root layout (landing)

```svelte
<!-- packages/web/src/routes/+layout.svelte -->
<script lang="ts">
  let { children } = $props();
</script>

{@render children()}
```

No chrome, no auth check. The landing page is the root `+page.svelte` (no `(marketing)` route group -- the root layout is already chromeless), and is always reachable.

---

## 4. App Group Layout -- Nav Shell

```svelte
<!-- packages/web/src/routes/(app)/+layout.svelte -->
<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import NavBar from '$lib/components/NavBar.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import type { PageData } from './$types';

  let { children, data } = $props();
  const session = data.session;
</script>

<NavBar {session} />
<ToastContainer />
<main>
  {@render children()}
</main>
```

The NavBar renders as a floating pill on mobile (`bg-surface/70 backdrop-blur-xl rounded-full` with a bottom offset via `pb-[calc(56px+1.5rem)]` on `<main>`) and expands to a sidebar at `xl:` breakpoint. It renders the following items:

| Tab | Icon | Route | Shown when |
|---|---|---|---|---|---|
| Dashboard | `LayoutDashboard` | `/dashboard` | Always, default active |
| Systems | `Cog` | `/systems` | Always |
| Review Day | `ClipboardCheck` | `/review-day` | Always, with a badge if any system is due |
| Guides | `BookOpen` | `/guides` | Always, highlighted on first visit post-signup |

Order above matches the NavBar's item order (Dashboard, Systems, Review Day, Guides). The fifth item, **Account** (`/account`, recovery codes), is deliberately not a sidebar row -- it renders as a link in the nav footer (next to the sign-out action), keeping the sidebar at four items.

The NavBar uses Lucide Svelte icons (imported as `ComponentType` from `@lucide/svelte/icons/*`), shows the user's name/email (from `session.user`), and a sign-out button that calls `authClient.signOut()` and navigates to `/`. At `xl:` the pill expands into a full sidebar with icon+label rows and the footer (account link + sign-out action) at the bottom.

`<ToastContainer>` is mounted here -- the one place in the app where `toastStore.items` is rendered (S5.4). No page below `(app)/` re-declares it.

---

## 5. Store Design

All stores use Svelte 5 `$state` runes (not `svelte/store` `writable`), except where Better Auth's client provides its own store.

### 5.1 Auth client

```typescript
// packages/web/src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

`useSession()` is a runes-compatible reactive store from `better-auth/svelte`. Used in the auth group layout (S3.4) for display and in the NavBar (S4) for showing the user's name. The auth guard (S3.3) uses `getCachedSession()` from `$lib/auth/session.svelte` instead -- a thin wrapper over `authClient.getSession()` with caching, returning a promise and working inside `load` functions without a second round-trip.

### 5.2 Dashboard store

```typescript
// packages/web/src/lib/stores/dashboard.svelte.ts
class DashboardStore {
  instances = $state<DashboardInstance[]>([]);

  load(instances: DashboardInstance[]) {
    this.instances = instances;
  }

  async markState(instanceId: string, state: 'full' | 'floor' | 'missed') {
    const idx = this.instances.findIndex(i => i.id === instanceId);
    if (idx === -1) return;

    const prev = this.instances[idx];
    this.instances[idx] = { ...prev, state };

    try {
      const updated = await patchInstance(instanceId, { state });
      this.instances[idx] = {
        ...this.instances[idx],
        state: updated.state as DashboardInstance['state'],
        notes: updated.notes,
      };
    } catch {
      this.instances[idx] = prev;
      toastStore.push({ type: 'error', message: 'Could not save — try again.' });
    }
  }
}

export const dashboardStore = new DashboardStore();
```

`dashboard/+page.ts`'s `load` function calls `GET /api/dashboard` and calls `dashboardStore.load(data.instances)` -- the store, not the page component, is the single source of truth for Instance state on the Dashboard. The optimistic-update-with-rollback pattern here is what PRD S10's non-functional requirement ("Instance auto-generation on load should not visibly block the UI") cashes out to at the Dashboard's most frequent interaction: marking full/floor/missed needs to feel instant.

### 5.3 Workspace editor store

```typescript
// packages/web/src/lib/stores/workspace-editor.svelte.ts
class WorkspaceEditorStore {
  layout = $state<Layout | null>(null);
  dirty = $state(false);
  systemId = $state('');

  load(systemId: string, layout: Layout) {
    this.systemId = systemId;
    this.layout = layout;
    this.dirty = false;
  }

  addWidget(widget: Widget) {
    this.layout!.widgets.push(widget);
    this.dirty = true;
  }

  removeWidget(id: string) {
    this.layout!.widgets = this.layout!.widgets.filter(w => w.id !== id);
    this.dirty = true;
  }

  reorder(widgets: Widget[]) {
    this.layout!.widgets = widgets;
    this.dirty = true;
  }

  async save() {
    const saved = await putWorkspace(this.systemId, this.layout);
    this.layout = saved.layout;
    this.dirty = false;
  }
}
```

Scoped to the Workspace Builder page only -- instantiated fresh per visit, not a singleton like `dashboardStore`. `dirty` backs a "you have unsaved changes" guard on navigation-away.

### 5.4 Toast store

```typescript
// packages/web/src/lib/stores/toast.svelte.ts
export type ToastType = 'error' | 'info' | 'success';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

class ToastStore {
  items = $state<ToastItem[]>([]);

  push(item: { type: ToastType; message: string }) {
    const id = crypto.randomUUID();
    this.items = [...this.items, { id, ...item }];
    setTimeout(() => {
      this.items = this.items.filter(i => i.id !== id);
    }, 4000);
  }

  dismiss(id: string) {
    this.items = this.items.filter(i => i.id !== id);
  }
}

export const toastStore = new ToastStore();
```

`dismiss(id)` is called by the `<ToastContainer>` dismiss button. The component renders each item with a `fly` transition (200ms) and a close button.

The single consumer of every API error across the app (S6). Rendered by `<ToastContainer>` in the app layout (S4).

---

## 6. API Client Wrapper

Every `load` function and store action goes through one wrapper rather than calling `fetch` directly, so `credentials: 'include'` and the error contract are enforced in one place.

```typescript
// packages/web/src/lib/api/client.ts
import { toastStore } from '$lib/stores/toast.svelte';

const BASE = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'unknown', message: 'Something went wrong.' }));
    throw new ApiError(res.status, body.error, body.message);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

`apiFetch` throws `ApiError` on non-2xx responses -- it does **not** push toasts itself. Error-toast handling happens at the store or component level so call sites that need to opt out (e.g. `floor_action_required` from `POST /api/systems/:id/confirm` should surface as inline form validation, not a toast) can `catch` the `ApiError` and handle it differently without fighting a built-in toast.

A higher-order wrapper for store and load-function usage handles the common case (default: push a toast):

```typescript
// packages/web/src/lib/api/index.ts
import { apiFetch, ApiError } from './client';
import { toastStore } from '$lib/stores/toast.svelte';

export async function apiFetchWithToast<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) {
      toastStore.push({ type: 'error', message: e.message });
    }
    throw e;
  }
}
```

Thin typed helpers per resource group:

```
src/lib/api/
├── client.ts          # apiFetch, ApiError
├── index.ts           # apiFetchWithToast (default toast on client error)
├── systems.ts         # getSystems, createSystem, patchSystem, confirmSystem, archiveSystem, getMetrics
├── instances.ts       # patchInstance, getInstance
├── dashboard.ts       # getDashboard
├── schedules.ts       # getSchedules, createSchedule, patchSchedule, deleteSchedule
├── workspaces.ts      # getWorkspace, putWorkspace
├── counter-logs.ts    # createCounterLog, getCounterLogs (cursor-paginated), deleteCounterLog
├── timer-sessions.ts  # createTimerSession, getTimerSessions (cursor-paginated), deleteTimerSession
├── checklist.ts       # putChecklist, getChecklist
├── link-list.ts       # getLinkList, putLinkList
├── notes.ts           # getNotes, putNotes
├── journal-log.ts     # putJournalEntry (Mongo-first with D1 fallback + queue), getJournalEntries
├── reviews.ts         # getReviews, createReview, getReviewDay
├── templates.ts       # getTemplates, getTemplate
├── attachments.ts     # uploadAttachment, getAttachmentUrl, deleteAttachment
├── export.ts          # exportSystem (GET /api/systems/:id/export)
├── visual-aid.ts      # getVisualAid (GET /api/visual-aid)
├── recovery-codes.ts  # generateRecoveryCodes, getRecoveryCodes
├── cache.ts           # client-side response cache helpers
└── ai.ts              # draftSystem
```

One file per resource group, mirroring API Route Design's section numbering, so a given endpoint's frontend helper is easy to find.

---

## 7. Component Hierarchy Per Page

Only pages with non-trivial composition are broken down -- simple pages (marketing landing page, sign-up/login forms) are single-component and don't need a hierarchy diagram.

### 7.0 Guides (`(app)/guides/+page.svelte`)

```
+page.svelte
├── 3 guide cards with blush-numbered badges (1/2/3)
│   ├── "Set up your first system"
│   ├── "Do your first review"
│   └── "Track your progress"
├── Quick-start CTA (gradient button linking to /systems/new)
└── cascading `fly` transition at 400ms stagger
```

A single-component page with three guide cards describing the core product loop. Each card has a blush-numbered badge, a description with detail bullets, and inline links. Below the cards is a gradient CTA button ("Create your first system") that navigates to `/systems/new`.

### 7.1 Dashboard (`(app)/dashboard/+page.svelte`)

```
+page.svelte
├── +page.ts          # calls apiFetchWithToast('GET /api/dashboard'), passes to dashboardStore.load()
└── <InstanceList instances={dashboardStore.instances}>
    └── <InstanceCard> (one per instance)
        ├── <SystemBadge domain floor_action />
        ├── <StateButtons state onMark={dashboardStore.markState} />  -- full / floor / missed
        └── <WorkspaceLink systemId />
```

### 7.2 System Creator (`(app)/systems/new/+page.svelte`)

Design override: `design-system/paragon/pages/system-creator.md`. This page is a single scrollable form with stepper-styled section markers, not a gated wizard, so autosave can track every field from one form state.

```
+page.svelte
├── <TemplatePicker onSelect />                 -- built-ins + user templates, GET /api/templates
│   └── passes templateDefaults (defaults prop) to SystemForm via $effect
├── <AIDraftPanel onDraft />                    -- "Draft with AI" button + prompt, POST /api/ai/draft-system
└── <SystemForm defaults={templateDefaults}>
    ├── field groups: Purpose, Philosophy, Protocol, Floor Action, Trigger, Barrier List, Environment Cue, Schedule
    ├── $effect watches defaults prop, populates $state fields reactively
    ├── autosave: debounced PATCH on every field change (AUTOSAVE_DEBOUNCE_MS)
    └── <ConfirmButton onClick={() => confirmSystem(id)} />  -- POST /api/systems/:id/confirm
```

`<TemplatePicker>` and `<AIDraftPanel>` both write into the same `<SystemForm>` field state (via the `defaults` prop) rather than bypassing it -- this implements PRD 6.1's "AI output never bypasses the form" and PRD 5.6's "clone at instantiation, fully editable" for templates. Neither component ever calls `POST /api/systems` itself.

The System Detail page (`/systems/[id]`) includes a "Save as Template" action button that opens a `<Modal>` dialog, prompting for a template name and calling `POST /api/systems/:id/save-as-template` on confirm.

The edit route (`/systems/[id]/edit`) reuses `<SystemForm>` pre-filled from the existing System record (passes the system data as `defaults`), with the same autosave pattern.

### 7.3 Workspace Builder (`(app)/systems/[id]/workspace/+page.svelte`)

Design override: `design-system/paragon/pages/workspace-builder.md`. This page uses a drag-and-drop bento canvas with palette/canvas/save zones and widget-specific persistent content rules.

```
+page.svelte
├── +page.ts          # calls apiFetchWithToast('GET /api/systems/:id/workspace')
├── <WidgetPalette onAdd={workspaceEditorStore.addWidget} />   -- v1 widget catalog, PRD 5.5
├── <WorkspaceCanvas layout={workspaceEditorStore.layout}>     -- svelte-dnd-action drag surface
│   └── <WidgetCard> (one per widget in layout.widgets, dispatches by type)
│       ├── <TimerWidget />        -- POST/GET timer-sessions, API Route Design 6.2
│       ├── <CounterWidget />      -- POST/GET counter-logs, 6.1
│       ├── <ChecklistWidget />    -- PUT/GET checklist, 6.3
│       ├── <LogWidget />          -- Mongo-backed journal
│       ├── <LinkListWidget />     -- PUT/GET link-list, API Route Design 6.4
│       ├── <StreakWidget />       -- read-only, derived from GET /api/systems/:id/instances
│       ├── <ProgressChartWidget />-- read-only, GET counter-logs or timer-sessions
│       └── <NotesWidget />        -- PUT/GET notes, API Route Design 6.5
└── <SaveBar dirty={workspaceEditorStore.dirty} onSave={workspaceEditorStore.save} />
```

`<WidgetCard>`'s type-dispatch is the one piece of client-side logic that must stay in sync with D1 Schema S3.3.1's widget catalog and the layout JSON schema (D1 Schema S3.4). A new widget type requires: a new case in this dispatch, a new `suggested_widgets` string in Templates, and (if it logs numeric/timed data) a new typed table -- all three in the same PR.

### 7.4 Per-System Review Form (`(app)/systems/[id]/reviews/new/+page.svelte`)

```
+page.svelte
├── +page.ts          # loads GET /api/systems/:id/instances?from=...&to=... for the review period
├── <InstanceSummary counts={{ full, floor, missed }} />
└── <ReviewForm>
    ├── what_worked, what_broke, worst_day_check fields
    ├── current System blueprint fields rendered as editable text areas (floor_action, purpose, etc.)
    │   -- user edits these directly; changed values are collected into the change_applied structured object
    ├── <ChangeAppliedNote />  -- optional free-text override for the auto-derived review description
    └── <SubmitButton />  -- POST /api/systems/:id/reviews, handles 409 review_already_exists inline
```

Per PRD 6.4, the review form displays the current System blueprint fields alongside the review fields as editable text areas. When the user changes a value (e.g. lowers `floor_action`), that change is written back via the `change_applied` structured object in `POST /api/systems/:id/reviews`. This is inline editing of the System fields -- not checkboxes or a diff editor. The user's own words for the review description go into `change_applied_note` if they want something different from the auto-derived description.

### 7.5 Review Day (`(app)/review-day/+page.svelte`)

```
+page.svelte
├── +page.ts          # calls apiFetchWithToast('GET /api/review-day')
└── <DueReviewList due={data.due}>
    └── <DueReviewCard>
        ├── system name, floor_action
        ├── <InstanceSummary counts={instance_summary} />  -- same component as 7.4
        └── <StartReviewButton href="/systems/{id}/reviews/new?period_start=...&period_end=..." />
```

Reuses `<InstanceSummary>` from 7.4 -- both contexts show the identical full/floor/missed breakdown for a period.

### 7.6 System Detail (`(app)/systems/[id]/+page.svelte`)

```
+page.svelte
└── <SystemBlueprint system={data.system} />    -- reads from nested layout's loaded data
    ├── all blueprint fields (read-only in overview mode)
    ├── current schedule (days, time window)
    ├── instance streak/calendar (GET /api/systems/:id/instances)
    └── action links: Edit, Workspace, Review, Archive
```

---

## 8. Build Configuration

### 8.1 Vite proxy (development)

In development, the SvelteKit dev server runs on `localhost:5173` and the API Worker runs on `localhost:8787`. `vite.config.ts` proxies `/api/*` requests to the API Worker:

```typescript
// packages/web/vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
```

Better Auth's CSRF check can reject proxied requests if `changeOrigin` strips the `Origin` header -- verify this works end-to-end during scaffolding by signing up in dev and confirming the session cookie is set and honored (Auth Integration 3).

### 8.2 Environment variables

| Variable | Dev value | Prod value | Used in |
|---|---|---|---|
| `VITE_API_BASE_URL` | `''` (empty -- same-origin via proxy) | `''` (empty -- same-origin via Pages Function proxy) | `auth-client.ts`, `api/client.ts` |

In dev, the proxy handles `/api/*` so `VITE_API_BASE_URL` is empty string and fetch paths are relative (`/api/systems`). In production, a Pages Function proxies `/api/*` to the API Worker, making the frontend and API same-origin. `VITE_API_BASE_URL` is empty and all API calls use relative paths.

### 8.3 Static adapter

```typescript
// packages/web/svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',     // SPA fallback -- all routes served from index.html
      precompress: false,          // wrangler handles compression
    }),
    paths: {
      relative: true,
    },
  },
};
```

`fallback: 'index.html'` is critical for SPA on Cloudflare Pages -- without it, navigating directly to `/dashboard` would 404. With the fallback, any non-file path serves `index.html` and SvelteKit's client-side router takes over.

---

## 9. Navigation Model Summary

| From | Action | Target |
|---|---|---|
| Anywhere | Sign-up success | `/guides` |
| Anywhere | Sign-in success | `/dashboard` |
| `/sign-in`, `/sign-up` | Already signed in | `/guides` |
| Any `(app)/*` route | Session lost / expired | `/sign-in` |
| `/` | Click "Get Started" | `/sign-up` |
| `/` | Click "Log In" | `/sign-in` |
| NavBar | Click Dashboard | `/dashboard` |
| NavBar | Click Guides | `/guides` |
| NavBar | Click Review Day | `/review-day` |
| NavBar | Click Systems | `/systems` |
| Dashboard | Click "Create System" | `/systems/new` |
| Dashboard | Click system card | `/systems/[id]` |
| System detail | Click "Edit" | `/systems/[id]/edit` |
| System detail | Click "Workspace" | `/systems/[id]/workspace` |
| System detail | Click "Review" | `/systems/[id]/reviews/new` |
| Review Day | Click "Start Review" | `/systems/[id]/reviews/new?period_start=...&period_end=...` |
| NavBar | Click sign-out | `/` |
