# Visual Identity

How Kellix looks. Logo, colors, typography, and imagery rules.

For brand strategy (mission, values, personality), see `docs/brand.md`.

## Logo

### Usage rules

- Always use provided logo files. Don't recreate or approximate the logo.
- Maintain clear space around the logo equal to at least the height of the brand mark.
- Don't place the logo on busy backgrounds without sufficient contrast.
- Don't stretch, rotate, or alter the logo proportions.

## Color palette

### Design direction

The palette should feel warm, domestic, and approachable. Kellix lives in your home, so the colors should feel like they belong there too.

### Principles

- **Warm over cold.** Prefer warm neutrals and soft tones over clinical grays and blues.
- **Calm over loud.** Accent colors are used sparingly. The UI should feel restful, not demanding.
- **High contrast for text.** Body text and interactive elements need to be legible for everyone, not just power users.

### Semantic colors

| Role | Usage |
|------|-------|
| Success | Confirmations, completed actions |
| Error | Failed actions, destructive confirmations |
| Focus | Keyboard navigation, accessibility rings |
| Muted | Secondary text, disabled states |

## Typography

### Principles

| Principle | What it means |
|-----------|--------------|
| **Readable first** | The dashboard is used on phones, tablets, and laptops. Body text must be comfortable at every size. |
| **Friendly, not playful** | Type should feel human and warm. Avoid anything that reads as corporate or as a toy. |
| **Consistent hierarchy** | Headings, body, and labels should be immediately distinguishable. |

### Font selection

Choose fonts that balance warmth with clarity:

- **Headings:** A typeface with personality. Something that feels confident and approachable.
- **Body:** A clean, highly legible sans-serif. Neutral enough to disappear, clear enough to read at small sizes.
- **Code / monospace:** Used in the dashboard for technical surfaces like skill editing and log output.

## Imagery and screenshots

### Style

- Prefer **real product screenshots** showing the dashboard and Telegram conversations.
- Show the actual experience: a Telegram chat where someone asks Kellix to do something and it works.
- When showing the dashboard, use realistic data that a household would recognize (meal plans, reminders, weight logs).

### Do

- Show real Telegram conversations that demonstrate what Kellix can do.
- Use clean dashboard screenshots with realistic household data.
- Show the setup flow to make it feel approachable.

### Don't

- Use generic stock photos of families or smart homes.
- Use AI-generated imagery.
- Show overly technical terminal output as a selling point. The terminal is for setup, not for daily use.

## Dashboard UI direction

The dashboard is the only visual surface Kellix fully controls (Telegram handles the chat UI). It should feel like a home tool, not a developer console.

- Labels and buttons use plain language ("Add a secret", not "Create credential entry").
- Navigation is flat and minimal. Most users only visit the dashboard for setup and occasional changes.
- Empty states should guide people toward the next step, not show a blank page.
- Error messages explain what happened and what to do, in a sentence anyone can understand.

## Related docs

- `docs/brand.md` - mission, values, positioning, personality
- `docs/voice-and-tone.md` - how we write
