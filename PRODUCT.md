# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary user:** An individual who wants to build sustainable routines but has found traditional habit trackers break on bad days. They are self-motivated, technically comfortable (browser-based web app), and value design that accounts for real life — fatigue, busy periods, low motivation — rather than assuming perfect consistency.

The app is single-user. There are no multi-user, team, or social features.

## Product Purpose

Paragon is a personal systems-design web app. Its core unit is the **system**: a repeatable, designed protocol with a floor action (the minimum version that counts as a win), a schedule, a dedicated workspace, and a recurring review loop that feeds changes back into the design.

It exists to help people design routines that survive their worst day — not their best one.

## Positioning

The product thesis is: *Repetition creates motivation, not the reverse.* This distinguishes Paragon from habit trackers (which punish streak breaks) and to-do lists (which assume every day is equally productive). The floor-action pattern means a system is never skipped — only executed at a lower level. The review loop ensures the system evolves with the person.

A nearby product could not truthfully copy the "worst day" framing without also copying the floor-action mechanism and auto-generation design.

## Operating Context

- **Single-user web app** consumed in a browser (desktop and mobile).
- **Timezone locked to Asia/Manila** (UTC+8, no DST). All date calculations are Manila-based.
- **CSR-only SPA** deployed to Cloudflare Workers via static assets. No SSR.
- **Dark mode supported** with a `data-theme` toggle.
- **Free tier constraints:** Cloudflare Workers free tier CPU cap of 10ms per request. Every server-side decision is shaped by this budget.
- **Auth:** Email/password only (Better Auth on D1). No OAuth in v1.
- **AI assistance:** Optional, suggest-only, via Workers AI (deepseek-r1-distill-qwen-32b). Graceful degradation when quota is exceeded.

## Capabilities and Constraints

**Confirmed capabilities:**
- Systems CRUD with purpose, philosophy, protocol, floor action, trigger, barriers, environment cue, status
- Per-system scheduling (day bitmask + time windows)
- Auto-generated daily instances (lazy on dashboard load + nightly cron pre-generation)
- Instance states: pending, full, floor, missed
- Customizable drag-and-drop workspaces with widgets (timer, counter, log, checklist, link list, streak view, progress chart, notes)
- Per-system weekly reviews with worst-day check and mandatory change recording
- Global review day view (all systems due)
- Three built-in templates (Reading, Studying, Workout) with user-saved templates
- AI draft assistance for new systems
- Account management with recovery codes (show/hide/regenerate)
- File attachments via Cloudflare R2
- Journal entries for reflection widgets (MongoDB)

**Confirmed constraints:**
- 10ms CPU budget per request — no in-memory processing loops, push filtering into SQL, use D1.batch()
- Single-user — no sharing, permissions, or social features
- No OAuth providers — email/password only
- Timezone is not user-configurable; Manila-locked
- AI is suggest-only — never auto-saves

## Brand Commitments

- **Name:** Paragon
- **Tagline:** "Systems that work on your worst day"
- **Voice:** Direct, grounded, unsentimental about human limitation. No gamification, no streaks pressure, no toxic productivity.
- **Visual identity:** Warm, muted, earthy palette (beige/cream surfaces, dark brown primary, blush/mauve accent). Manrope (display) + Plus Jakarta Sans (body). Rounded cards, subtle shadows, gradient buttons.
- **Logo:** "P" monogram in a rounded rectangle.
- **Icon library:** Lucide Svelte.
- **Personality:** Honest about failure, supportive without being saccharine, rigorous without being punishing.

## Evidence on Hand

- **PRD:** `docs/PRD/PRD-systems-app.md` — 342-line product requirements document covering problem, goals, data model, flow, features, success metrics.
- **Core framework:** `docs/core/systems-framework.md` — the five-step build process that defines the product's mechanism.
- **Research base:** `docs/core/sources.md` — 8 creators' frameworks that informed the design.
- **Research insights:** `docs/core/insights.md` — synthesis of research into product-specific guidance.
- **Full test suite:** 186 API integration tests documented in AGENTS.md.
- **Working demo:** Deployed at paragon.kelpselp.workers.dev.
- **No fabricated testimonials, case studies, or usage claims exist.** Future work must not invent them.

## Product Principles

1. **The system works on the worst day, or it doesn't ship.** Floor actions must be trivially achievable. Any feature that only works under ideal conditions is scrapped or redesigned.
2. **Remove the decision, not just the friction.** Instances are auto-generated; the user never decides whether to engage today — only how much.
3. **Capture beats perfection.** Auto-save everywhere, including incomplete system blueprints. Losing work is worse than saving drafts.
4. **Repetition creates motivation, not the reverse.** Scoring is non-punitive. Floor completions count meaningfully. Streaks are informational, not judgmental.
5. **The review closes the loop.** A review must produce an *edit* (a change to the system), not just a reflection. If nothing changed, the system is not yet designed.

## Accessibility & Inclusion

- Dark mode support (user preference, not auto)
- Single-user — no localization or translation requirements in v1
- No product-specific accessibility standard has been established beyond general web best practices
