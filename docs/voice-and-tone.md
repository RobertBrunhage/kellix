# Voice and Tone

How Kellix communicates across the dashboard, documentation, Telegram, and marketing.

For brand strategy (mission, values, personality), see `docs/brand.md`.

## Core principle

Write for the person who didn't set it up. If your partner, parent, or housemate can read it and know what to do, the copy works.

## Voice principles

### 1. Plain language, always

Kellix is used by people with different technical backgrounds. Every label, message, and instruction should make sense to someone who has never opened a terminal.

| Avoid | Prefer |
|-------|--------|
| "Configure your integration credentials" | "Add your login details" |
| "Provision a new user container" | "Add a person" |
| "Inject secrets at runtime" | "Kellix uses your saved credentials securely" |
| "Per-user isolated agent" | "Each person gets their own assistant" |

The person reading this might be checking their weight trend or setting a Monday reminder. Talk to them like a person.

### 2. Short and direct

Say what it does. Don't explain the architecture.

| Long | Short |
|------|-------|
| "Kellix securely stores your credentials in an encrypted vault and injects them into skill scripts at runtime" | "Your credentials are encrypted and only used when needed" |
| "Each household member receives their own isolated OpenCode container with private memory" | "Each person gets their own private assistant" |

If one sentence works, don't write two.

### 3. Active and helpful

Lead with what the user can do, not what the system does internally.

| Passive / system-focused | Active / user-focused |
|--------------------------|----------------------|
| "A reminder has been scheduled" | "Got it, I'll remind you Monday" |
| "The integration was successfully configured" | "Connected. You're all set." |
| "User workspace has been initialized" | "Welcome! You're ready to go." |

### 4. Warm but not cute

Kellix should feel like a helpful person, not a cartoon character. Friendly tone, no gimmicks.

| Too cold | Just right | Too cute |
|----------|-----------|----------|
| "Operation completed" | "Done." | "Yay, we did it!" |
| "Error: authentication failed" | "Couldn't connect. Check your login details and try again." | "Oopsie! Something went wrong :(" |
| "No results found" | "Nothing here yet." | "Looks empty in here! Let's fix that!" |

### 5. Honest about what's happening

When something goes wrong or takes time, say so clearly. Don't hide behind vague language.

| Vague | Clear |
|-------|-------|
| "Something went wrong" | "Couldn't reach your Withings account. The token might have expired." |
| "Please try again later" | "The connection timed out. Try again in a minute, or check your network." |
| "An error occurred" | "That skill failed to run. Here's what happened: ..." |

## Writing for the dashboard

The dashboard is where people manage settings, add integrations, and check on things. It's not used daily by most people, so it needs to be obvious and self-explanatory.

- **Page titles:** Noun-based, plain. "People", "Integrations", "Jobs". Not "Manage Your Household Members".
- **Buttons:** Short verbs. "Add", "Save", "Connect", "Remove". Not "Submit Configuration".
- **Empty states:** Guide the user. "No reminders yet. Message Kellix on Telegram to create one."
- **Confirmations:** Say what happened. "Saved." / "Removed." / "Connected."
- **Destructive actions:** Be specific. "Remove this person? Their memory and settings will be deleted."

## Writing for Telegram

Telegram is where people actually talk to Kellix. The tone here is the most conversational.

- Reply like a helpful person, not a system.
- Keep messages short. Telegram is a chat app, not a document viewer.
- Use line breaks to separate ideas. Walls of text don't work in chat.
- When Kellix needs something from the user, be specific about what and where.

| System-like | Human-like |
|------------|-----------|
| "Integration setup requires credentials. Navigate to dashboard." | "I need your Withings credentials. Add them here: [link]" |
| "Reminder created: Monday 09:00 - review training" | "I'll remind you every Monday at 9 to review your training." |
| "Query complete. Weight data retrieved." | "Your average this week was 82.3 kg, down from 83.1 last week." |

## Writing for docs and marketing

When describing Kellix to someone who hasn't used it yet:

- Lead with what it does for the household, not how it works technically.
- Show real examples. "You say 'remind me to water the plants every Thursday' and it just works."
- Mention privacy and local hosting, but don't make it sound paranoid. It's a feature, not a manifesto.
- Assume the reader is evaluating whether this is worth setting up for their home.

### Headline patterns

- **Action-first:** "Set reminders by texting." / "Track your weight automatically."
- **Benefit-first:** "One assistant for the whole household." / "Private by default."
- **Scenario-first:** "Ask Kellix what you weighed last Tuesday."

### Words and phrases to avoid

These signal generic marketing or over-engineered copy:

- "leverage" / "utilize" / "empower" / "unlock"
- "seamless" / "frictionless" / "cutting-edge"
- "curated" / "crafted" / "tailored experience"
- "your AI-powered household management solution"
- "enterprise-grade security"
- any "not just X, but Y" construction

### Words that work

- "assistant" over "agent" or "bot" (in user-facing copy)
- "person" or "household member" over "user"
- "private" over "secure" (when describing local-first design)
- "set up" over "configure" or "provision"
- "saved" / "encrypted" / "local" over "vault" / "zero-trust" / "air-gapped"

## Tone by surface

| Surface | Tone | Example |
|---------|------|---------|
| Telegram chat | Conversational, brief, helpful | "I'll remind you Monday at 9." |
| Dashboard labels | Plain, functional | "Add a person" |
| Dashboard empty states | Guiding, encouraging | "No integrations yet. Start by connecting Telegram." |
| Error messages | Honest, specific, calm | "Couldn't save. Check your connection and try again." |
| README / docs | Clear, practical, friendly | "Each person gets their own private assistant." |
| Marketing / landing page | Warm, confident, benefit-focused | "One assistant for your whole household." |

## Related docs

- `docs/brand.md` - mission, values, positioning, personality
- `docs/visual-identity.md` - logo, colors, typography, imagery
