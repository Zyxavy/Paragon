---
name: Paragon
description: Systems that work on your worst day
colors:
  primary: "#503b31"
  surface: "#ece2d0"
  surface-container-low: "#cebebe"
  surface-container-lowest: "#f5efe3"
  on-surface: "#020202"
  on-primary: "#ece2d0"
  primary-container: "#705d56"
  secondary: "#705d56"
  blush: "#cebebe"
  muted-foreground: "#705d56"
  destructive: "#C24545"
  border: "rgba(2, 2, 2, 0.12)"
  ring: "#503b31"
typography:
  display:
    fontFamily: "'Manrope', sans-serif"
    fontWeight: 700
  body:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  pill: "9999px"
  2xl: "16px"
  xl: "12px"
  lg: "8px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.2xl}"
    padding: "20px 10px 20px 10px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-mobile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  modal:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "24px"
---

# Design System: Paragon

## Overview

**Creative North Star: "The Armchair Studio"**

Paragon's visual identity is warm, grounded, and unapologetically earnest — like a well-worn leather armchair in a room lit by a single desk lamp. This is not a productivity dashboard designed to maximize output; it is a personal workshop for designing systems that survive real life. The palette draws from terracotta clay and aged parchment: warm browns, soft beiges, and a blush-mauve accent. Corners are generous, shadows are gentle, and nothing demands attention. The interface recedes so the work itself — the systems, the reviews, the daily check-ins — becomes the focus. Dark mode shifts the same warm tones into a nocturnal atmosphere: near-black surfaces with muted taupe accents, like a study at midnight.

**Key Characteristics:**
- Earthy, warm, muted — no cold blues, grays, or clinical whites
- Rounded and soft — generous corner radii across every surface
- Gentle shadows suggest layering, not floating; in dark mode, depth is conveyed purely through tonal contrast
- The brand voice is honest and direct; the visuals follow — supportive without being saccharine

## Colors

The palette is built around a warm brown primary anchored by beige-cream surfaces. The range stays within a narrow band of the warm hue circle: browns, taupes, creams, and a single blush accent. No cool tones intrude.

### Primary
- **Warm Earth** (`#503b31`): The anchor. Used for primary buttons, active navigation, headings, and key interactive elements.
- **Terracotta Mid** (`#705d56`): A lighter, muted extension of the primary. Used as primary-container (gradient partner), secondary text, and muted-foreground.
- **Blush Mauve** (`#cebebe`): The accent. Used for state indicators, filters, and as the primary role in dark mode. Adds a subtle rose warmth without breaking the earth tone.

### Neutral
- **Aged Parchment** (`#ece2d0`): The main surface color. Warm beige that avoids the sterile feel of pure white.
- **Cream Veil** (`#f5efe3`): The lightest surface (card backgrounds, elevated containers). One step lighter than the main surface.
- **Washed Taupe** (`#cebebe`): Surface container low — used for sidebar, inactive states, and secondary containers.
- **Near Black** (`#020202`): Text and icons on light surfaces. Near-black rather than pure black for a softer read.
- **Muted Text** (`#705d56`): Secondary text, placeholders, and non-essential information.

### Feedback
- **Alert Red** (`#C24545` light / `#E07070` dark): Destructive actions, errors. Kept warm-red rather than cool-crimson.

### Dark Theme
In dark mode, the palette inverts while staying within the same warm family:
- Surface becomes **Near Black** (`#020202`), the lightest containers become **Terracotta Mid** (`#705d56`), and **Washed Taupe** (`#cebebe`) becomes the primary and on-surface color. Shadows go transparent; depth is conveyed through tonal layering alone.

### Named Rules
**The Warmth Rule.** No cool-toned grays, blues, or true whites enter the palette. Every neutral carries a brown or beige undertone. When adding a new color, check it against the existing palette — if it reads as cool, it does not belong.

## Typography

**Display Font:** Manrope (with sans-serif fallback)
**Body Font:** Plus Jakarta Sans (with sans-serif fallback)

**Character:** The pairing is utilitarian but refined — Manrope's geometric shoulders give headings a quiet strength, while Plus Jakarta Sans's humanist proportions keep body text readable at small sizes. Both are sans-serif, keeping the interface clean, but the weight contrast between display (bold) and body (regular) establishes clear hierarchy without decorative flourishes.

### Hierarchy
- **Display** (Manrope 700, `clamp(1.5rem, 3vw, 2rem)`, 1.2): Page titles and section headings. Used sparingly — one per view.
- **Title** (Manrope 600, `1rem–1.125rem`, 1.3): Card titles, modal headings, system names.
- **Body** (Plus Jakarta Sans 400, `0.875rem`, 1.5): All reading text, descriptions, paragraph content. Max line length should not exceed 70ch.
- **Label** (Plus Jakarta Sans 500/600, `0.75rem–0.8125rem`, 1.4, uppercase when emphasis is needed): Form labels, button text, metadata, chip labels.

### Named Rules
**The One-Face Rule.** Hierarchy comes from weight, size, and case, not from mixing decorative faces. Manrope for headings, Plus Jakarta Sans for everything else — no third font enters the system.

## Layout

The layout is built on a flexible single-column spine with a fixed sidebar on large screens.

**Container:** `max-w-6xl` (1152px) centered, padded with `1.5rem` on each side.

**Desktop sidebar:** Fixed left, 192px wide, activates at `xl` (1280px). The main content offsets by `12rem` (192px) when the sidebar is visible.

**Grid rhythm:** Cards are laid out in a responsive grid: single column on mobile, 2 columns at `md` (768px), 3 columns at `xl` (1280px). The gutter is `1rem` (`gap-4`).

**Spacing rhythm:** The spacing scale follows a `0.25rem` base: `0.25rem` (xs), `0.5rem` (sm), `1rem` (md), `1.5rem` (lg), `2rem` (xl). Card interiors use `1rem` padding; sections are separated by `1.5rem–2rem`.

**Mobile nav:** Bottom-floating pill navigation (fixed, centered, `bottom-4`, `rounded-full`) with backdrop blur. Replaced by the sidebar at `xl`.

## Elevation & Depth

Depth is communicated through tonal layering rather than pronounced shadows. Surfaces stack from lightest (card backgrounds) through medium (main surface) to darker (sidebar and low containers). Shadows are present but intentionally subtle — they hint at hierarchy rather than simulating physical float.

In dark mode, shadows become transparent (the near-black surface makes them invisible anyway). Depth is conveyed entirely through tonal contrast: lighter containers sit on top of darker ones.

### Shadow Vocabulary
- **Ambient Sm** (`0 2px 8px rgba(80, 59, 49, 0.04)`): Resting state for cards and containers. Barely perceptible.
- **Ambient Md** (`0 8px 24px rgba(80, 59, 49, 0.05)`): Hovered cards and sticky elements (save bar).
- **Ambient Lg** (`0 16px 40px rgba(80, 59, 49, 0.06)`): Modals, dialogs, and elevated overlays.
- **Ambient Xl** (`0 24px 60px rgba(80, 59, 49, 0.07)`): Toasts and the highest-priority overlays.

### Named Rules
**The Layer-Not-Float Rule.** Stack surfaces, don't float them. Shadows are secondary to tonal contrast. A component should still read as elevated even with shadows removed — the background color alone should communicate depth.

## Shapes

The form language is consistently rounded and soft. The radius vocabulary:

- **Pill** (`9999px`): Mobile nav bar, state chips, day pickers, notification dots — anything that should read as a capsule.
- **2xl** (`16px`): Primary buttons, modals, template cards — the most prominent interactive surfaces.
- **Xl** (`12px`): Cards, secondary buttons, input containers, the main content surface — the default corner for most components.
- **Lg** (`8px`): Sidebar items, stat boxes, secondary buttons — tighter but still noticeably rounded.
- **Md** (`6px`): Form inputs, textareas, schedule containers — functional edges that still feel soft.

No square corners appear anywhere in the system. The smallest radius (`6px`) still rounds the edge perceptibly.

## Components

### Buttons
- **Shape:** Generously rounded — primary uses `16px` (2xl), secondary uses `12px` (xl), ghost uses no explicit radius.
- **Primary:** Gradient fill `from-primary to-primary-container`, cream text. Internal padding `10px 20px` (default size). Transitions at `200ms` with a subtle press-down on click (`active:scale-[0.98]`). On hover, opacity drops to 90%.
- **Secondary:** Transparent background with a `1px` border (`border`). No shadow. On hover, gains a tinted background (`bg-surface/50`).
- **Ghost:** No background, no border. Text in muted-foreground, transitions to on-surface on hover. Used for icon buttons and inline actions.
- **Destructive:** Solid `destructive` background, white text, hover-opacity 90%. Same shape as primary.
- **Disabled:** Opacity drops to 40–50%. No hover effects.

### Cards
- **Corner Style:** Rounded-xl (`12px`) in most contexts; rounded-2xl (`16px`) for template cards.
- **Background:** The lightest surface (`surface-container-lowest`).
- **Shadow:** Ambient-sm at rest, ambient-md on hover (`200ms` transition).
- **Internal Padding:** `1rem` (standard cards) or `1.5rem` (guide cards, account sections).

### Inputs / Fields
- **Shape:** Rounded-md (`6px`) for most inputs; rounded-lg (`8px`) or rounded-xl (`12px`) for larger auth inputs.
- **Style:** Filled background (`surface`) with a `1px` border (`border`). The filled style avoids the starkness of outline-only fields.
- **Focus:** `2px` ring in primary color (`ring-primary`), outline removed.
- **Placeholder:** Muted-foreground.
- **Disabled:** 50% opacity.

### Navigation
- **Mobile bar:** Pill-shaped (`rounded-full`), floating above the content at `bottom-4`, translucent background with `backdrop-blur-xl` for a frosted glass effect. Icons at `16px` (w-4 h-4) with labels hidden. Active item in primary, inactive in muted-foreground.
- **Desktop sidebar:** Fixed left panel, 192px wide, surface-container-low background. Items switch between muted-foreground (default) and primary (active) with a tinted background on active. User email in muted-foreground at the bottom with a sign-out link.
- **System tabs:** Horizontal row with an underline on the parent container. Active tab in primary, inactive in muted-foreground. No background fills — hierarchy through color alone.

### Modals
- **Backdrop:** 30% opacity black overlay. Click-to-dismiss.
- **Container:** Surface background, rounded-2xl (`16px`), ambient-lg shadow, `max-w-sm` width, `24px` internal padding.
- **Title:** Display font, `1.125rem`, semibold.

### Save Bar
- **Shape:** Rounded-xl (`12px`), sticks to the bottom of the page content.
- **Background:** surface-container-lowest.
- **Shadow:** Ambient-md (noticeably elevated above the page content).
- **State indicator:** A `4px` pill (`rounded-full`) in secondary (unsaved) or a checkmark icon (saved).

### Chips / Tags
- **Shape:** Pill (`rounded-full`), small padding (`3px 12px`).
- **Default:** Transparent with primary-text on primary-tinted background.
- **State filters (full/floor/missed):** Selected state uses a tinted background specific to the state (blush for full, secondary for floor, muted for missed), text matching the tint. Unselected state uses `surface-container-low` background with `muted-foreground` text.

## Do's and Don'ts

### Do:
- **Do** use the gradient primary button for primary calls to action — the warmth of the gradient signals importance without relying on size alone.
- **Do** prefer tonal layering over shadows for depth. A card on a cream surface reads as elevated; it does not need a pronounced drop shadow.
- **Do** keep the mobile bottom nav pill-shaped and floating — the frosted glass effect distinguishes it from the content below.
- **Do** use the full set of corner radii — tighter radii (md/lg) for functional inputs, larger radii (xl/2xl) for surfaces that should feel more deliberate.
- **Do** maintain the 200ms transition duration consistently across all interactive elements.

### Don't:
- **Don't** add cool-toned colors. No blues, grays without warm undertones, or pure whites. Every neutral must carry a brown or beige cast.
- **Don't** use square corners. Every surface in the system has a minimum `6px` radius.
- **Don't** introduce a third font family. Manrope and Plus Jakarta Sans cover the full hierarchy.
- **Don't** use shadows in dark mode — they become invisible against the near-black surface. Rely on tonal contrast alone.
- **Don't** create button styles outside the three-tier system (gradient primary, bordered secondary, ghost text). A filled non-gradient button does not exist in the system.
- **Don't** put text in primary-role containers — primary-surface contrast is too low for readability. Use primary only for small surfaces (buttons, icons) or as a gradient partner.

---

## Implementation Status

The design system above is fully implemented across all pages of the Paragon web app (`packages/web/`). Every component and page uses CSS custom properties defined in `packages/web/src/routes/layout.css` and follows the spec in `design-system/paragon/MASTER.md`.

### Built pages

| Page | Key patterns |
|---|---|
| Landing (`/`) | Feature card grid, pill badges, hero gradient, logo header |
| Sign in (`/sign-in`) | Centered form card, loading spinner on submit, inline validation |
| Sign up (`/sign-up`) | Same form pattern, recovery codes overlay with blush accent |
| Dashboard (`/dashboard`) | Status header (blush/secondary/muted), bento instance card grid 1/2/3 cols, skeleton loaders |
| Systems list (`/systems`) | Two-column card grid, domain badges (secondary/10), status footer, empty state |
| System creator (`/systems/new`) | Sectioned stepper form (4 sections), collapsible template picker + AI draft, autosave indicator |
| System edit (`/systems/[id]/edit`) | Same form with back arrow, pre-filled, cancel link |
| System detail (`/systems/[id]`) | Tabbed layout (Overview/Workspace/Reviews/Edit), blueprint cards, barriers chips, Save as template CTA |
| Workspace (`/systems/[id]/workspace`) | Widget palette + canvas + save bar, drag/resize, mobile responsive |
| Reviews list (`/systems/[id]/reviews`) | Period cards showing what_worked/what_broke, empty state |
| New review (`/systems/[id]/reviews/new`) | Sectioned form (Reflection + Adjust + Change note), instance summary, Cancel link |
| Review Day (`/review-day`) | Due system cards with instance summaries, "Start review" CTAs |
| Guides (`/guides`) | Numbered guide cards with blush badges, fly transitions, quick-start CTA |
| Account (`/account`) | Profile info card, recovery codes with reveal/hide toggle, regenerate modal |

### CSS variable tokens (layout.css)

All 40+ custom properties are defined: `--color-primary`, `--color-surface`, `--color-blush`, `--color-destructive`, `--font-display`, `--font-body`, `--shadow-ambient-*`, `--radius-*`, `--transition-*`.
