# Design System

How to build Kellix UI. Component architecture, patterns, and implementation details.

For brand strategy and personality, see `docs/brand.md`. For visual choices (color rationale, font rationale), see `docs/visual-identity.md`.

## Tech stack

- **Server:** Hono (TypeScript)
- **Rendering:** Server-rendered HTML strings (no build step, no virtual DOM)
- **Styling:** Tailwind CSS
- **Interactivity:** HTMX for fragment swaps, Alpine.js for local UI state
- **Icons:** Lucide (`lucide` for inline SVGs)
- **Toasts:** Flash-message based, auto-dismiss

## Component architecture

Components are plain TypeScript functions that return HTML strings. No virtual DOM, no JSX compiler needed.

```
src/web/
├── components.ts          # Reusable primitives and simple composites
├── views/
│   ├── layout.ts          # Page shell, nav, scripts, design tokens
│   ├── home.ts            # Member grid
│   ├── members.ts         # Person detail pages (tabs, integrations, agent)
│   ├── tasks.ts           # Scheduled jobs
│   ├── settings.ts        # System settings
│   ├── integrations.ts    # Integration management
│   └── auth.ts            # Login / setup
└── ...routes files        # Hono route handlers
```

### Where do new components go?

| Layer | Location | What goes here | Examples |
|-------|----------|---------------|----------|
| Atoms + simple composites | `components.ts` | Reusable primitives with no page-specific logic | `Button`, `Badge`, `Input`, `Select`, `StatusDot` |
| Layout primitives | `components.ts` | Structural wrappers used across pages | `PageHeader`, `Section`, `Tabs`, `EmptyState` |
| Page views | `views/*.ts` | Page-specific layout and composition | Person detail, job list, settings form |

Rules:

- Put visual defaults in shared components first, not page files.
- Build section consistency via layout primitives that consume shared atoms.
- When changing look-and-feel, update primitives and this doc together.
- Prefer existing UI components over creating new ones.
- Keep page-specific markup in view files. Only promote to `components.ts` when it's used on two or more pages.

## Typography system

Two font families: a warm, confident serif for headings and a clean sans-serif for body. See `docs/visual-identity.md` for font selection rationale.

| Role | Weight | Class |
|------|--------|-------|
| Hero statements | extrabold (800) | `font-display font-extrabold` |
| Section titles | bold (700) | `font-display font-bold` |
| Sub-section titles | bold (700) | `font-display font-bold` |
| Body copy | regular (400) | `font-sans` (default) |
| UI labels/eyebrows | semibold (600) | `font-semibold uppercase tracking-[0.16em]` |
| Code / monospace | regular (400) | `font-mono` |

Weight hierarchy: hero (800) > section titles (700) > body (400). The hero should always be the heaviest typographic element on the page.

Rules:

- Keep paragraph width constrained (usually `max-w-xl` or `max-w-2xl`).
- Avoid using `font-display` on dense dashboard UI — it's for marketing/landing pages.
- Reserve `font-extrabold` (800) for the hero only. Section headings use `font-bold` (700).

## Spacing system

Spacing follows Tailwind's default 4px grid. Common increments:

| Token | Size | Usage |
|-------|------|-------|
| `1` | 4px | Label-to-input gap (`mb-1`), helper text offset (`mt-1`) |
| `2` | 8px | Icon + text pairs (`gap-2`), tight stacks (`space-y-2`) |
| `3` | 12px | Component groups (`gap-3`), heading bottom margin (`mb-3`) |
| `4` | 16px | Form group spacing (`space-y-4`), standard gap (`gap-4`), card padding base |
| `6` | 24px | Card padding (`p-6`), dialog padding, section sub-spacing |
| `8` | 32px | Section gaps (`gap-8`), major vertical spacing |
| `16` | 64px | Section vertical spacing (`mb-16`) |

### Section layout rhythm

| Property | Value | Usage |
|----------|-------|-------|
| Section padding | `py-24 md:py-32` | Standard vertical spacing between marketing sections |
| Container max-width | `max-w-5xl` | Content sections (not hero) |
| Section heading margin | `mb-16` | Gap between heading and section content |
| Grid gap | `gap-8` | Standard gap for 2-col grids |

Layout patterns:

- **Featured + grid**: One prominent item full-width or 2-col, then a `grid md:grid-cols-2 gap-8` below for supporting items.
- **Centered intro + content**: Section heading centered with `text-center mb-16`, content below.
- **Hero**: Full viewport height (`min-h-[calc(100vh-4rem)]`), 2-col grid with text left and visual right.

## Responsive breakpoints

Mobile-first approach using Tailwind's default breakpoints:

| Breakpoint | Width | What changes |
|------------|-------|-------------|
| Base | 0px | Single column, stacked layouts, compact padding (`p-4`) |
| `sm` | 640px | Text size bumps, wider max-widths |
| `md` | 768px | Two-column grids, sidebars appear, padding increases (`p-6`) |
| `lg` | 1024px | Three-column grids, full desktop layouts |
| `xl` | 1280px | Full layout with sidebar + content |

Container padding scales: `1rem` (default) → `1.5rem` (md) → `2rem` (lg).

Rules:

- Always write mobile-first — base styles are mobile, breakpoints add complexity.
- Use `flex-col md:flex-row` for stacked-to-horizontal layouts.
- Use `hidden md:flex` / `md:hidden` for show/hide at breakpoints, not JS.

## Border radius system

Use a small, fixed radius scale based on component role.

| Radius | Token intent | Typical usage |
|--------|--------------|---------------|
| `8px` | Dense controls | Tiny chips, inline code pills, compact indicators |
| `12px` | Interactive controls | Buttons, form inputs, medium chips |
| `16px` | Standard surfaces | Cards, popovers, content containers |
| `20px` | Feature surfaces | Hero cards, major marketing panels, high-emphasis blocks |
| `9999px` | Pills | Tabs, badges, status chips |

Rules:

- Do not mix `16px` and `20px` randomly within the same visual tier.
- Keep nested surfaces one tier smaller than their parent when possible.
- Use full pill radius only for explicitly pill-shaped elements.

## Color palette

### Warm container palette

The signature look is **warm neutral containers** — approachable surfaces that feel domestic, not corporate. The palette uses warm tones in light mode and maps to neutral equivalents in dark mode.

| Color | HSL | Role |
|-------|-----|------|
| Warm 50 | `hsl(43, 19%, 96%)` | Container backgrounds, surface tint |
| Warm 100 | `hsl(43, 19%, 92%)` | Container borders |
| Warm 200 | `hsl(43, 19%, 78%)` | Dividers, subtle separators |
| Warm 500 | `hsl(43, 19%, 48%)` | Mid-tone accent |

### Neutral palette

Body text, headings, and UI chrome use Tailwind's `neutral` scale.

### Semantic colors

Accents are used sparingly for status and feedback:

| Color | Usage |
|-------|-------|
| Emerald (500/700) | Success states, connected integrations, healthy status |
| Red (500/700) | Error states, destructive actions, disconnected |
| Amber (500/700) | Warning states, needs attention |
| Blue (500) | Focus rings only — never for links or text |

### Color philosophy

- **Warm over cold.** Warm surfaces instead of gray backgrounds.
- **Neutral text.** Links and text use neutral tones, never blue.
- **Light mode defaults to white** page backgrounds with warm containers for grouping.
- **Dark mode maps warm to neutral.** Warm tones don't work in dark mode — see dark mode mapping section below.

## Button system

### Variants

| Variant | Use for |
|---------|---------|
| `default` | Primary CTAs (dark bg, light text) |
| `outline` | Secondary actions (bordered) |
| `secondary` | Tertiary actions (subtle bg) |
| `ghost` | Minimal buttons (no bg until hover) |
| `destructive` | Delete/danger actions (remove person, disconnect integration) |
| `link` | Inline link-style buttons |
| `green` | Success/positive actions (connect, enable) |

Sizes: `default`, `sm`, `lg`, `icon`, `full`

### Sizing

- Primary CTA minimum height: `48px`.
- Default button height: `44px`.
- Small button height: `36px`.
- Keep horizontal padding generous (`px-5` to `px-8` depending on context).
- Keep button corner radius at `12px` across variants.

### CTA hierarchy

- Hero/final section CTAs use large size (`h-12` tier).
- Supporting actions use default size (`h-11` tier).
- Minor contextual actions use small size (`h-9` tier).

Rules:

- One section should typically have a single dominant primary action.
- Avoid placing equally strong competing CTAs side-by-side.
- Keep CTA spacing consistent (`mt-8` / `mt-10` patterns in marketing sections).
- CTA copy follows `docs/voice-and-tone.md`: short verbs like "Add", "Save", "Connect".

## Icon sizing

Use Lucide icons. Size by context:

| Size | Class | Usage |
|------|-------|-------|
| 12px | `h-3 w-3` | Minimal badges, decorative accents |
| 16px | `h-4 w-4` | Inline in buttons, form elements, dropdown triggers |
| 20px | `h-5 w-5` | Standalone icons, input adornments, error/status icons |
| 24px | `h-6 w-6` | Prominent standalone icons |
| 32px | `h-8 w-8` | Hero-level success/status indicators |

Rules:

- Icons inside buttons use `h-4 w-4` with `mr-2` spacing before text.
- Always include a color class (`text-neutral-500`, `text-neutral-900`, etc.).
- Use `flex-shrink-0` on icons next to variable-length text.

## Heading structure

Use consistent section heading structure for top-level sections.

- Recommended order: `eyebrow` (optional) → title → subtitle (optional).
- Use plain `h3` only for subsection titles within a section body.

### Eyebrow pattern

Small uppercase labels above headings or sections:

```html
<p class="text-[0.72rem] font-semibold uppercase tracking-[0.16em]
          text-neutral-500 dark:text-neutral-400 mb-4">
  Section Label
</p>
```

Use eyebrows for section categorization (e.g., "Your Household", "Integrations", "Privacy").

Rules:

- Keep heading spacing consistent across sections.
- Avoid custom one-off heading stacks unless the section intentionally breaks pattern.

## Form patterns

### Input styling

```html
<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
  Label
</label>
<input
  class="w-full h-11 px-4 rounded-xl
         border border-neutral-200 dark:border-neutral-700
         bg-white dark:bg-neutral-800 dark:text-white
         focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-neutral-300 focus:ring-offset-2
         transition-[border-color,box-shadow] duration-200 ease-out"
/>
<p class="mt-1 text-sm text-muted-foreground">Helper text</p>
```

### Textarea

```html
<textarea
  class="w-full min-h-[200px] p-4 rounded-lg resize-y
         border border-neutral-300 dark:border-neutral-700
         bg-white dark:bg-neutral-800
         focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400 focus:border-transparent
         placeholder:text-neutral-400 dark:placeholder:text-neutral-500
         text-neutral-900 dark:text-neutral-100"
/>
```

### Form layout

- Wrap form groups in `space-y-4`.
- Label spacing: `mb-1` below label, `mt-1` above helper text.
- Input height: `h-11` for standard inputs.
- Label copy uses plain language per `docs/voice-and-tone.md`: "Bot token", not "Telegram Bot API Authentication Token".

### Inline validation

```html
<!-- Success -->
<span class="text-sm text-green-600 dark:text-green-400">Saved.</span>

<!-- Error -->
<span class="text-sm text-red-600 dark:text-red-400">Couldn't save. Check your connection.</span>
```

## Loading states

### Button loading

Buttons dim and show a spinner while their parent form is mid-request. This is handled purely through the `.htmx-request` CSS hook — no per-button wiring needed.

For standalone loading buttons outside HTMX:

```html
<button disabled class="opacity-70 pointer-events-none">
  <span class="inline-block animate-spin mr-2">
    <svg class="h-4 w-4" ...>...</svg>
  </span>
  Saving...
</button>
```

### Skeleton screens

Use `animate-pulse` placeholder blocks for content that's loading:

```html
<div class="animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 h-4 w-[200px]"></div>
<div class="animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 h-32 w-full"></div>
```

### Content loading

For richer loading states, use staggered fade-in with blur:

```css
.fade-in-up {
  animation: fade-in-up 300ms ease-out both;
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); filter: blur(2px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
```

Stagger items with incremental `animation-delay` at `0.05s` intervals.

## Empty states

Center the message in the available space. Title + subtitle + optional action.

```html
<div class="flex flex-col items-center justify-center min-h-[400px] text-center">
  <h2 class="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
    No people yet
  </h2>
  <p class="text-lg text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
    Add someone to get started. Each person gets their own assistant.
  </p>
  <a href="/add" class="...">Add a person</a>
</div>
```

Rules:

- Always provide a next action — don't leave the user in a dead end.
- Use `min-h-[400px]` or similar to prevent layout collapse.
- Keep empty state copy concise — one title, one subtitle max.
- Use plain language per `docs/voice-and-tone.md`. "No reminders yet" not "No scheduled job entities found."

## Error states

### Inline error banners

```html
<div class="inline-flex items-center gap-2 rounded-lg
            border border-red-200 dark:border-red-800
            bg-red-50 dark:bg-red-950/30
            px-4 py-2 text-sm text-red-700 dark:text-red-400">
  <svg class="h-5 w-5 flex-shrink-0">...</svg>
  <span>Couldn't connect to Withings. The token might have expired.</span>
</div>
```

### Toast notifications

Transient feedback uses auto-dismissing toasts:

- Keep messages short: "Saved." / "Removed." / "Connected."
- Error toasts should be specific: "Couldn't save. Check your connection."
- Duration: 4 seconds for success, longer for errors that need reading.

## Warm container pattern

Warm containers group related content and create visual hierarchy without heavy borders.

```html
<!-- Outer container -->
<div class="bg-warm-50 dark:bg-neutral-900 rounded-2xl md:rounded-3xl p-6 md:p-10
            border border-warm-100 dark:border-neutral-800
            shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]
            dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">

  <!-- Cards inside containers use white bg -->
  <div class="bg-white dark:bg-neutral-800/50
              border border-neutral-200 dark:border-neutral-700/50
              rounded-xl p-6 md:p-8">
    ...
  </div>
</div>
```

Key details:

- Light: `bg-warm-50` with `border-warm-100` and subtle inset shadow.
- Dark: `bg-neutral-900` with `border-neutral-800` (warm maps to neutral in dark mode).
- Interior cards: `bg-white` / `dark:bg-neutral-800/50` with thinner borders.
- Outer radius `rounded-2xl md:rounded-3xl`, inner cards `rounded-xl`.

Rules:

- Don't alternate warm/white section backgrounds ("striping"). Use one consistent page surface and place warm containers within it.
- Keep the inset shadow subtle — it creates a recessed feel without heavy depth.
- Use `border-warm-100` (not `warm-200`) for the outer border to keep it thin.

## Footer bar pattern

Containers with actions use a footer bar separated by a top border.

```html
<div class="flex items-center justify-between mt-8 pt-6
            border-t border-warm-200/60 dark:border-neutral-700/40">
  <div>
    <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100">Withings</p>
    <p class="text-sm text-neutral-500 dark:text-neutral-400">Sync your weight and body composition.</p>
  </div>
  <a href="/connect/withings" class="...">Connect</a>
</div>
```

- Title + description on left, action on right.
- Border uses low-opacity warm/neutral to stay subtle.

## Dark mode color mapping

Warm tones don't exist in dark mode. Map them to neutral equivalents:

| Light | Dark |
|-------|------|
| `bg-warm-50` | `dark:bg-neutral-900` |
| `border-warm-100` | `dark:border-neutral-800` |
| `border-warm-200/60` | `dark:border-neutral-700/40` |
| `bg-white` (inside container) | `dark:bg-neutral-800/50` |
| `border-neutral-200` (inside container) | `dark:border-neutral-700/50` |

Semantic colors:

| State | Light | Dark |
|-------|-------|------|
| Success bg | `bg-green-50` | `dark:bg-green-500/15` |
| Success text | `text-green-700` | `dark:text-green-300` |
| Error bg | `bg-red-50` | `dark:bg-red-950/30` |
| Error text | `text-red-700` | `dark:text-red-400` |
| Error border | `border-red-200` | `dark:border-red-800` |
| Focus ring | `focus:ring-neutral-950` | `dark:focus:ring-neutral-300` |
| Input border | `border-neutral-200` | `dark:border-neutral-700` |
| Muted text | `text-neutral-500` | `dark:text-neutral-400` |

Rules:

- Never use warm colors in dark mode — they look muddy.
- Use opacity modifiers (`/50`, `/40`) on dark borders to keep them subtle.
- Page background is `bg-white dark:bg-neutral-950`.

## Section backgrounds and depth

Default to clean, flat section backgrounds. Add depth only when it supports content.

- Page background is `bg-white dark:bg-neutral-950` everywhere.
- Use warm containers (see above) to group content, not section-level backgrounds.

Rules:

- Don't alternate section backgrounds — it creates a "striped" effect.
- Keep decorative effects non-interactive (`pointer-events-none`) and low contrast.
- Decorative elements should never reduce text contrast.

## Link styling

Links outside of navigation use a consistent underline pattern:

```html
<a href="/settings"
   class="text-neutral-900 dark:text-neutral-100 font-medium
          underline underline-offset-2
          decoration-neutral-300 dark:decoration-neutral-600
          transition-colors duration-150
          hover:decoration-neutral-500 dark:hover:decoration-neutral-400">
  Settings
</a>
```

Rules:

- Never use blue link colors (`text-blue-500`, `hover:text-blue-600`). Links use neutral tones.
- Underline decoration uses muted colors (`decoration-neutral-300`), not the text color.

## Animation guidelines

Core principles:

- **Never animate from scale(0)** — start at 0.92+ for enter animations.
- **Keep animations under 300ms** for UI interactions. Glow/fade trails can be longer.
- **Use custom spring easing** for satisfying "pop" effects: `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Use ease-out** for entering/exiting elements, never ease-in.
- **Scale buttons on press**: `active:scale-[0.98]` for tactile feedback.
- **Add blur(2px) during transitions** to mask imperfections between animation states.
- **Make animations origin-aware**: use `transform-origin` to scale from the trigger point.
- **Remove repetitive animations** that would become annoying through frequent exposure.

### Animation inventory

| Pattern | Duration | Easing | Properties | Usage |
|---------|----------|--------|------------|-------|
| Hero stagger | 500ms | ease-out | opacity, translateY(12px), scale(0.96), blur(2px) | Hero text/CTA/card entrance, 80ms stagger between items |
| Element drop-in | 180ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | opacity(0.6→1), scale(0.92→1) | Status chips, badges landing in place |
| Success pop | 250ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | scale(0.95→1.04→1), blur, green glow | Successful connection, saved confirmation |
| Error shake | 300ms | ease-out | translateX(±4px) | Failed action feedback |
| Panel switch | 200ms | ease-out | opacity, scale(0.96), blur(2px) | Tab content transitions |
| Stagger timing | 80ms increments | — | — | Sequential reveals (hero items, member cards) |

### Success animation

```css
@keyframes pop-success {
  0% { scale: 0.95; filter: blur(2px); }
  40% { scale: 1.04; filter: blur(0px); }
  100% { scale: 1; filter: blur(0px); }
}
```

## Component mapping

- **Hero/featured wrappers:** `20px` radius.
- **Card components:** `16px` radius.
- **Buttons:** `12px` radius.
- **Tabs/chips:** pill radius only when semantically a pill.
- **Badges/status indicators:** pill radius.

## Applying this system

- Apply this scale to new UI first, then normalize old surfaces incrementally.
- Prioritize shared primitives (`Button`, `Card`, `Section`) before local overrides.
- Keep exceptions explicit in component code when a screen needs denser UI (e.g., the dashboard settings page).
- If a one-off style repeats more than twice, promote it into a reusable component.

## Implementation source of truth

- `src/web/components.ts` — shared UI primitives and design tokens
- `src/web/views/layout.ts` — page shell, nav, Tailwind config
- `src/web/views/*.ts` — page-specific views
- `docs/brand.md` — mission, values, positioning, personality
- `docs/visual-identity.md` — logo, colors, typography, imagery
- `docs/voice-and-tone.md` — how we write

When in doubt, update primitives first, then page-level views.
