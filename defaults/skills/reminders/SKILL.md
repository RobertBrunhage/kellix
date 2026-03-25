---
name: Reminders
description: Create scheduled and one-off reminders that send messages to the user on Telegram
per_user: true
---

## Reminders & Scheduled Messages

Use the `manage_jobs` tool to create, list, and delete reminders.

### Creating a Recurring Reminder

```
manage_jobs action: "add", userName: "{userName}", job: {
  id: "{userName}-workout-1pm",
  name: "1pm Workout Reminder",
  cron: "0 13 * * 1,2,4,5",
  prompt: "Check training schedule and tell me what workout is today."
}
```

### Creating a One-Off Reminder

```
manage_jobs action: "add", userName: "{userName}", job: {
  id: "{userName}-check-laundry",
  name: "Check laundry",
  at: "2026-03-24T15:30:00",
  prompt: "Remind me to check the laundry."
}
```

One-off reminders are automatically deleted after firing.

### Job Fields

- **id**: Unique identifier (use `{userName}-{descriptive-slug}`)
- **name**: Human-readable name
- **cron**: Cron expression (minute hour day-of-month month day-of-week)
- **at**: ISO datetime for one-off reminders
- **prompt**: What to think about when the reminder fires
- **timezone**: Optional IANA timezone (e.g., `Europe/Stockholm`)

Use either `cron` OR `at`, not both.

### Cron Examples

- `0 7 * * *` — every day at 7:00 AM
- `0 7 * * 1-5` — weekdays at 7:00 AM
- `0 20 * * 0` — Sundays at 8:00 PM
- `0 9 * * 1` — Mondays at 9:00 AM

### One-Off: Converting Relative Times

Use the `session_status` tool to get the current time, then calculate the target time.

### Managing Reminders

- **List**: `manage_jobs action: "list", userName: "{userName}"`
- **Delete**: `manage_jobs action: "remove", id: "{job-id}"`
- The scheduler picks up changes within 30 seconds
- Reminders fire in isolated sessions (don't pollute the user's conversation)
