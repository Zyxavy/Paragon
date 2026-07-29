# Design System Master File — Paragon

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Paragon
**Last revised:** 2026-07-29
**Category:** Personal Systems Builder

**App Philosophy:** "Works on the worst day." Low-friction, non-punitive, warm, personal. Designed for daily repetition and weekly reflection. Not a habit tracker — a systems builder.

**Creative North Star:** "The Armchair Studio" — warm, grounded, analog-adjacent. Like a well-worn leather armchair in a room lit by a single desk lamp. Earnest work happens here, not performance.

---

## Global Rules

### Color Palette

Warm interplay of brown earth tones, beige parchment, and blush-mauve accents. Tonal depth over structural containment. No cool-toned colors enter the palette.

**Tailwind v4 with `data-theme` attribute strategy:**

```html
<html data-theme="light">  <!-- or "dark" -->
```

Toggle via `localStorage` + `prefers-color-scheme`.

| Role | Light Hex | Dark Hex | Tailwind Class |
|------|-----------|----------|----------------|
| Surface (base background) | `#ece2d0` | `#020202` | `bg-surface` |
| Surface Container Low | `#cebebe` | `#503b31` | `bg-surface-container-low` |
| Surface Container Lowest | `#f5efe3` | `#705d56` | `bg-surface-container-lowest` |
| On Surface (foreground) | `#020202` | `#ece2d0` | `text-on-surface` |
| Primary (accent) | `#503b31` | `#cebebe` | `text-primary`, `bg-primary` |
| On Primary | `#ece2d0` | `#020202` | `text-on-primary` |
| Primary Container (gradient pair) | `#705d56` | `#503b31` | `bg-primary-container` |
| Secondary | `#705d56` | `#cebebe` | `text-secondary`, `bg-secondary` |
| Blush (accent / high-emotion moments) | `#cebebe` | `#705d56` | `text-blush`, `bg-blush` |
| Muted | `rgba(2,2,2,0.04)` | `rgba(236,226,208,0.04)` | `bg-muted` |
| Muted Foreground | `#705d56` | `#cebebe` | `text-muted-foreground` |
| Border (inputs only) | `rgba(2,2,2,0.12)` | `rgba(236,226,208,0.10)` | `border-border` |
| Outline Variant (ghost fallback) | `#cebebe` | `#503b31` | `border-outline-variant` |
| Destructive | `#C24545` | `#E07070` | `bg-destructive`, `text-destructive` |
| Ring | `#503b31` | `#cebebe` | `ring-ring` |

**Color Notes:**

- Surface is warm beige (`#ece2d0`) — not pure white, adds warmth and reduces eye strain
- Dark mode uses near-black (`#020202`) for a warm nocturnal atmosphere
- Primary is warm earth (`#503b31`) — grounded, natural, never loud
- Secondary/terracotta (`#705d56`) adds warmth to callouts and secondary text
- Blush (`#cebebe`) is the same hue as surface-container-low but used as an accent color — brings mauve warmth without saturation
- No pure black or pure white anywhere — every surface and text has a warm tint

### The "No-Line" Rule

**Prohibit 1px solid borders for sectioning cards and content areas.** Boundaries are defined solely through background color shifts. A `surface-container-low` section sitting on a `surface` background provides enough contrast without visual noise.

**Surface nesting pattern:**

```
surface (#ece2d0)             →  outermost page background
  └─ surface-container-low (#cebebe)   →  section grouping
       └─ surface-container-lowest (#f5efe3) →  interactive cards
```

**Exception:** Input fields and form controls may use a subtle `border-border` stroke to define the interactive zone. The tab bar in system detail is the only app-level exception.

### Typography

Pairing of **Manrope** for display authority and **Plus Jakarta Sans** for approachable legibility.

| Level | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| Display | Manrope | 700 | `clamp(1.5rem, 3vw, 2rem)` | Page titles, section headings — one per view |
| Headline | Manrope | 600 | `1.25rem` (text-xl) | Card titles, modal headers, system names |
| Title | Plus Jakarta Sans | 600 | `1rem–1.125rem` | Section labels, card titles |
| Body | Plus Jakarta Sans | 400 | `0.875rem` (text-sm) | All reading text, descriptions, body content |
| Label | Plus Jakarta Sans | 500/600 | `0.75rem–0.8125rem` | Form labels, button text, metadata, chips |

**Google Fonts:**

```css
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

**Tailwind config:**

```
--font-display: 'Manrope', sans-serif;
--font-body: 'Plus Jakarta Sans', sans-serif;
```

**The One-Face Rule.** Hierarchy comes from weight, size, and case, not from mixing decorative faces. Manrope for headings, Plus Jakarta Sans for everything else — no third font enters the system.

### Spacing

Use Tailwind's built-in spacing scale with generous gaps for breathing room.

| Scale | Value | Usage |
|-------|-------|-------|
| `p-3` / `gap-3` | `0.75rem` (12px) | Tight icon-label spacing, chip internal padding |
| `p-4` / `gap-4` | `1rem` (16px) | Standard card padding, grid gutters |
| `p-6` / `gap-6` | `1.5rem` (24px) | Section padding, form field gaps |
| `gap-8` | `2rem` (32px) | Large section gaps, hero content spacing |
| `gap-10` | `2.5rem` (40px) | Content block separators (no divider lines) |

**No divider lines between sections.** Use generous spacing to separate content blocks visually. The one exception is the tab bar underline in system detail, which uses `border-border/50`.

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-md` | `6px` | Form inputs, functional edges — smallest radius in the system |
| `rounded-lg` | `8px` | Sidebar items, stat boxes, secondary buttons |
| `rounded-xl` | `12px` | Standard cards, secondary buttons, inputs, containers — the default |
| `rounded-2xl` | `16px` | Primary buttons, modals, template cards, hero containers |
| `rounded-full` | `9999px` | Floating nav pill, day pickers, state chips, notification dots |

No square corners anywhere. The minimum radius (`6px`) still rounds the edge perceptibly.

### Shadows (Ambient Softness)

Traditional shadows are too heavy for a warmth-focused app. Use ambient tinted shadows instead.

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-ambient-sm` | `0 2px 8px rgba(80,59,49,0.04)` | Resting card state, subtle lift |
| `shadow-ambient-md` | `0 8px 24px rgba(80,59,49,0.05)` | Hovered cards, sticky save bar, form cards |
| `shadow-ambient-lg` | `0 16px 40px rgba(80,59,49,0.06)` | Modals, dropdowns, floating nav, featured cards |
| `shadow-ambient-xl` | `0 24px 60px rgba(80,59,49,0.07)` | Toasts, highest-priority overlays |

**Rules:**
- Shadow color uses the warm brown primary as base, not black — softer, tinted
- Wide blur (24-60px), zero spread, low opacity (4-7%)
- In dark mode, shadows become transparent — rely on surface stacking for depth
- **Ghost border fallback:** If a border is needed for accessibility, use `outline-variant` at 15% opacity

---

## Component Specs

### Buttons (Tailwind)

All buttons use generous corner radii. Primary CTA uses a subtle gradient.

```svelte
<!-- Primary CTA (Gradient — warm earth → terracotta) -->
<button class="bg-gradient-to-br from-primary to-primary-container text-on-primary
             px-5 py-2.5 rounded-2xl font-body font-semibold text-sm
             transition-all duration-200 hover:opacity-90 active:scale-[0.98]
             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
             cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
  {label}
</button>

<!-- Secondary (Bordered) -->
<button class="border border-border text-on-surface
             px-5 py-2.5 rounded-xl font-body font-semibold text-sm
             transition-all duration-200 hover:bg-surface/50
             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
             cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
  {label}
</button>

<!-- Ghost (Minimal, for inline actions) -->
<button class="text-muted-foreground hover:text-on-surface
             px-3 py-2 rounded-xl font-body font-medium text-sm
             transition-colors duration-150
             focus:outline-none focus:ring-2 focus:ring-ring
             cursor-pointer disabled:opacity-40">
  {label}
</button>

<!-- Destructive -->
<button class="bg-destructive text-white px-4 py-2 rounded-lg font-body font-semibold text-sm
             transition-all duration-200 hover:opacity-90
             focus:outline-none focus:ring-2 focus:ring-ring
             cursor-pointer disabled:opacity-40">
  {label}
</button>
```

### Cards

No border — separation via surface nesting only.

```svelte
<div class="bg-surface-container-lowest text-on-surface rounded-xl p-4 shadow-ambient-sm
            transition-shadow duration-200 hover:shadow-ambient-md">
  {content}
</div>
```

**Do not use translateY hover on card grids** — it causes visual jitter. Use shadow depth only.

### Inputs

Inputs are the one exception to the no-line rule — they retain a subtle border.

```svelte
<input
  class="w-full px-4 py-2.5 bg-surface text-on-surface
         border border-border rounded-md text-sm font-body
         transition-colors duration-200
         focus:outline-none focus:ring-2 focus:ring-primary
         placeholder:text-muted-foreground"
  {...rest}
/>
```

**Focus state:** On focus, a `2px` primary ring replaces the border. No background color shift.

### Floating Bottom Navigation

Glassmorphism pill — unboxed and floating. Only visible on mobile (<1280px). Replaced by sidebar on desktop.

```svelte
<nav class="fixed bottom-4 left-1/2 -translate-x-1/2 xl:hidden
            bg-surface/70 backdrop-blur-xl
            rounded-full h-14 px-6
            shadow-ambient-lg
            flex items-center gap-6 sm:gap-8
            z-50 transition-shadow duration-200">
  {#each navItems as item}
    <a href={item.href}
       class="flex flex-col items-center gap-0.5
              {item.active
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-on-surface'}
              transition-colors duration-200 no-underline">
      <Icon icon={item.icon} class="w-4 h-4" />
    </a>
  {/each}
</nav>
```

**Desktop sidebar:**

```svelte
<aside class="hidden xl:flex fixed left-0 top-0 h-screen w-48
              bg-surface-container-low flex-col justify-between p-6 z-40">
  <div class="flex flex-col gap-1">
    <div class="font-display font-semibold text-primary text-lg mb-6 px-3">Paragon</div>
    {#each navItems as item}
      <a href={item.href}
         class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body font-medium
                {item.active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-on-surface hover:bg-muted'}
                transition-colors duration-150 no-underline">
        <Icon icon={item.icon} class="w-4 h-4" />
        {item.label}
      </a>
    {/each}
  </div>
  <div class="flex flex-col gap-2 px-3">
    <span class="text-xs text-muted-foreground">{user.email}</span>
    <button onclick={signOut}
            class="text-xs text-muted-foreground hover:text-on-surface text-left
                   transition-colors duration-150 cursor-pointer bg-transparent border-none p-0">
      Sign out
    </button>
  </div>
</aside>
```

**Icon style:** Thin-stroke (1.5pt) line-art icons. Active state uses `text-primary` — no fill, no background pill (desktop sidebar uses tinted background for active).

### Modals

```svelte
<!-- Overlay -->
<div class="fixed inset-0 bg-on-surface/30 z-50 flex items-center justify-center p-4"
     onclick={onclose} role="presentation">
  <!-- Modal -->
  <div class="bg-surface rounded-2xl p-6 shadow-ambient-lg max-w-sm w-full mx-4"
       onclick={(e) => e.stopPropagation()} role="document">
    <h2 class="font-display text-lg font-semibold text-on-surface mb-4">{title}</h2>
    {@render children()}
  </div>
</div>
```

### Progress / Status

For system trackers (floor/full states):

```svelte
<!-- Full completed — use blush for warm acknowledgment -->
<span class="inline-flex items-center gap-1.5 text-sm text-blush">
  <CheckCircleIcon class="w-4 h-4" /> Full
</span>

<!-- Floor achieved (minimum viable) -->
<span class="inline-flex items-center gap-1.5 text-sm text-secondary">
  <CheckIcon class="w-4 h-4" /> Floor
</span>

<!-- Missed/skipped -->
<span class="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
  <XIcon class="w-4 h-4" /> Missed
</span>
```

### Ring Charts (Streak / Progress)

```svelte
<svg class="w-16 h-16">
  <!-- Background track -->
  <circle cx="32" cy="32" r="26" fill="none"
          stroke="currentColor" class="text-surface-container-low"
          stroke-width="12" stroke-linecap="round" />
  <!-- Progress fill — gradient -->
  <circle cx="32" cy="32" r="26" fill="none"
          stroke="url(#progress-grad)"
          stroke-width="12" stroke-linecap="round"
          stroke-dasharray={circumference}
          stroke-dashoffset={offset} />
  <defs>
    <linearGradient id="progress-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--color-primary)" />
      <stop offset="100%" stop-color="var(--color-primary-container)" />
    </linearGradient>
  </defs>
  <text x="32" y="32" text-anchor="middle" dominant-baseline="central"
        class="text-xl font-bold fill-on-surface font-display">{percentage}%</text>
</svg>
```

### Toast / Notification

```svelte
<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div class="pointer-events-auto rounded-xl px-4 py-3 text-sm font-body shadow-ambient-lg
                flex items-start gap-3
                {toast.type === 'error'
                  ? 'bg-destructive text-white'
                  : 'bg-primary text-on-primary'}">
      <span class="flex-1">{toast.message}</span>
      <button onclick={() => dismiss(toast.id)}
              class="text-inherit opacity-70 hover:opacity-100 transition-opacity
                     bg-transparent border-none cursor-pointer p-0 text-lg leading-none">&times;</button>
    </div>
  {/each}
</div>
```

### Save Bar

```svelte
<div class="sticky bottom-0 mt-6 bg-surface-container-lowest rounded-xl px-6 py-4
            shadow-ambient-md flex items-center justify-between">
  <span class="text-xs text-muted-foreground flex items-center gap-2">
    {#if dirty}
      <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
      Unsaved changes
    {:else}
      <Check class="w-3 h-3" />
      Saved
    {/if}
  </span>
  <button onclick={onSave} disabled={!dirty}
          class="bg-gradient-to-br from-primary to-primary-container text-on-primary
                 px-6 py-2.5 rounded-2xl font-body font-semibold text-sm
                 transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
    Save
  </button>
</div>
```

### Chips / Tags

```svelte
<!-- Default tag/badge -->
<span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1
             text-xs font-body font-medium text-primary">
  {label}
</span>

<!-- Domain badge -->
<span class="text-xs font-medium text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg">
  {domain}
</span>
```

### Skeleton / Loading

```svelte
<div class="skeleton h-14 rounded-xl mb-4"></div>
<div class="skeleton h-[180px] rounded-xl"></div>

<!-- defined in layout.css: -->
<!--
.skeleton {
  background: var(--color-muted);
  border-radius: 1rem;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
-->
```

---

## Style Guidelines

**Style:** The Warm Workshop — editorial, layered, warm

**Keywords:** Tonal depth, ambient shadows, glassmorphism, warm brown + blush + parchment, generous space

**Best For:** Daily-use personal tools, journaling, systems-building, reflection

**Key Effects:**
- No-line sectioning via background color shifts (`surface` → `surface-container-low` → `surface-container-lowest`)
- Ambient tinted shadows (wide blur, warm-brown-tinted at 4-7% opacity)
- Glassmorphism on floating elements (`backdrop-blur-xl`, 70% opacity on surface)
- Signature gradient on primary CTAs (`primary` → `primary-container` at 135°)
- Blush (`#cebebe`) for warm acknowledgment moments (completions, streaks, secondary states)
- Generous corner radii throughout (12px on cards/inputs, 16px on buttons)
- Prioritize negative space — if a screen feels full, increase spacing by one increment

### Animation Timing

| Context | Duration | Easing | Example |
|---------|----------|--------|---------|
| Micro-interactions | 200ms | ease-out | Button hover, focus rings, icon toggles |
| Element transitions | 300ms | ease-in-out | Card expand, modal open/close, nav switch |
| Mood-setting / page | 400-600ms | ease-in-out | Page transitions, progress reveals, streak animations |

---

## Design Philosophy

1. **Works on the worst day** — UI must be usable when user is tired, stressed, or unmotivated. Large tap targets, clear labels, forgiving inputs.
2. **Remove the decision** — Pre-fill defaults, auto-save everything, minimize settings screens.
3. **Capture beats perfection** — Favor quick-add over structured forms. Allow rough input, refine later.
4. **Repetition creates motivation** — Make the daily check-in feel rewarding, not obligatory. Warm tone, simple feedback.
5. **The review closes the loop** — The weekly review is the most important screen after the daily dashboard. Make it reflective, not punitive.

---

## Anti-Patterns (Do NOT Use)

- ❌ **Pure black or pure white** — `#000000` and `#FFFFFF` are forbidden. All surfaces and text must be muted and warm-tinted.
- ❌ **Neon or high-saturation colors** — No bright blues, greens, or purples. The palette is deliberately muted and warm.
- ❌ **Cool-toned grays** — Every neutral must carry a brown or beige undertone.
- ❌ **1px solid borders on sections/cards** — Use background color shifts instead. Only form inputs may use borders.
- ❌ **Sharp/square corners on interactive elements** — All buttons use `rounded-2xl`. Minimum `rounded-md` (0.375rem) on anything interactive.
- ❌ **Divider lines** — Use generous spacing to separate content blocks.
- ❌ **Bright red for destructive actions** — Use muted warm red (`#C24545`) instead.
- ❌ **Heavy black shadows** — Always use ambient tinted shadows (warm-brown base, wide blur, low opacity).
- ❌ **Emojis as icons** — Use Lucide SVG icons. Thin-stroke (1.5pt) line-art.
- ❌ **Layout-shifting hovers** — No scale transforms on cards in grids.
- ❌ **Punitive language** — Never "streak lost" or "you failed." Use "missed" / "skipped" / "tomorrow's a new day."
- ❌ **Empty states without guidance** — Empty dashboard shows the "Create your first system" prompt, not a blank page.
- ❌ **Full-screen loading spinners** — Use skeleton loaders for dashboard widgets.
- ❌ **Confetti / pop animations** — The app's tone is warm and calm, not gamified. Use ease-in-out with deliberate pacing.

---

## Pre-Delivery Checklist

- [ ] No emojis as icons (use Lucide SVG icons, thin-stroke line-art)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Micro-interactions at 200ms, element transitions at 300ms
- [ ] Light mode: body text contrast >=4.5:1
- [ ] Focus states visible for keyboard navigation using primary ring
- [ ] `prefers-reduced-motion` respected — fall back to instant transitions
- [ ] Responsive: 375px, 768px, 1024px, 1280px
- [ ] No border lines on cards or sections — verified against the no-line rule
- [ ] Floating nav uses glassmorphism (`bg-surface/70 backdrop-blur-xl rounded-full`)
- [ ] Auto-save indicator present on mutable forms
- [ ] Non-punitive language for misses (no "streak lost")
- [ ] Empty states have helpful guidance, not blank pages
- [ ] Dark mode tested independently (not inferred from light)
- [ ] All touch targets >=44px
- [ ] Blush (`#cebebe`) used for warm acknowledgment — not bright green or gold
