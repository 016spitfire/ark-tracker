# Notifications Plan

Goal: notify players before their timers run out, on desktop, Android, and iPhone, including when the app is closed.

Branch: `feature/notifications`

## Background

- The app has no server. All data lives on the device, and nothing runs while the app is closed.
- Browsers once had an API for scheduling local notifications ahead of time (Notification Triggers), but it was abandoned. A notification that fires with the app closed needs a server to send a push.
- So the plan builds in two stages: notifications while the app is open (no server), then real push from a small server.
- Gaia Plant Care has an in-app version of milestone 1 with two gaps to avoid here: reminders are only scheduled from the settings screen (not on app open), and its custom service worker is never loaded.

### iPhone limits

- Web notifications on iPhone, local or push, only work when the app is installed to the home screen (iOS 16.4 or later). Not in a regular Safari tab.
- The app should detect this and tell iPhone users to Add to Home Screen first.

### Chosen stack for push (all free tiers)

- **Vercel Functions** (Hobby) for the API, in this same project
- **Upstash Redis** (free) for subscriptions and scheduled notifications
- **cron-job.org** (free) calls the send endpoint every minute
- **web-push** npm library with VAPID keys. Delivery through Google/Apple/Mozilla push services is free.

Ruled out:

- **Vercel Cron** on Hobby runs only once a day, up to 59 minutes late
- **Upstash QStash** free tier caps delays at 7 days, and timers run for months
- **Neon Postgres** free compute would run out, since a check every minute keeps it awake around the clock

### Free tier headroom (rough estimates, 2026-10)

- The every-minute check has a fixed cost: about 43,200 runs a month, even with zero users
- Upstash Redis free (500K commands/month) is the first limit hit. Roughly 100-120 active users, or several hundred if each device's timers are stored as one record (planned)
- Vercel Hobby free (1M function calls/month) covers roughly 1,000-1,500 users
- Going over a free tier throttles or pauses the service. It doesn't charge.
- Past that: Redis pay-as-you-go ($0.20 per 100K commands), Vercel Pro ($20/month)
- Vercel Hobby is non-commercial only. This app stays free (fan content rules), so that's fine.

## Milestones

### Milestone 1: In-app notifications (no server)

- [x] Notification settings saved in `AppData.settings`: `notificationsEnabled`, `notifyLeadMinutes` (list, default 1 hour before + when ready), `dailySummaryEnabled`, `dailySummaryTime`
- [x] Enable checkbox requests permission on tap (browsers require a user gesture)
- [x] Test notification button
- [x] Scheduler: on every app open and every timer change, find the next due notification and set one wake-up for it, then schedule the next after it fires (`src/utils/notificationSchedule.ts` rules, `src/hooks/useNotificationScheduler.ts` wiring)
- [x] Chain long waits: `setTimeout` maxes out around 24.8 days, and timers can run for months (re-checks at least every 6 hours)
- [x] Record which timers have already notified, so a reload doesn't repeat them (localStorage `ark-tracker:notify-state`, per device)
- [x] Catch-up on open: one "While you were away" notification for alerts missed while the app was closed
- [x] Switch `vite-plugin-pwa` to our own service worker file (`injectManifest`): `src/sw.ts`
- [x] `notificationclick` handler opens the related card
- [x] Detect iPhone not installed to home screen and explain
- [x] Settings note: these only fire while the app is open
- [x] Multiple alerts per timer (checkboxes: 1 day, 12h, 6h, 2h, 1h, 30m, 15m, when ready)
- [x] Daily summary at a local time: count of timers ready in the next 24 hours, soonest named
- [x] New or resynced timers only alert going forward (no instant "1 hour before" on a 10-minute timer)
- [ ] README updated

### Milestone 2: Calendar export (optional)

- [ ] Decide: in or skip
- [ ] "Add to calendar" on a card downloads an `.ics` file: one event per timer, alarm at the lead time
- [ ] Note that a resync needs a re-export

### Milestone 3: Push foundation

- [ ] Generate VAPID keys; store them as Vercel environment variables (never committed)
- [ ] Connect Upstash Redis through the Vercel dashboard
- [ ] Per-device secret token, generated on the device, so each device can only change its own data
- [ ] `POST /api/subscribe` and `DELETE /api/subscribe`
- [ ] `POST /api/test-push`
- [ ] `push` handler in the service worker
- [ ] Done when: the app is fully closed and the test push still arrives

### Milestone 4: Timer sync

- [ ] Opt-in, with a plain-language note that timer names and times are sent to the server
- [ ] Each device's upcoming notifications stored as one record (keeps Redis usage low)
- [ ] Sync on save, resync, done, and delete
- [ ] Retry after coming back online
- [ ] "Delete my data" button

### Milestone 5: Scheduler

- [ ] `/api/send-due` endpoint, protected by a secret header
- [ ] cron-job.org job calling it every minute with the header
- [ ] Find due notifications, send them, remove them
- [ ] Clean up dead subscriptions (push service returns 404/410)
- [ ] Done when: notifications arrive with every device closed

### Milestone 6: Hardening

- [ ] Rate limits on the public endpoints
- [ ] Error handling and logging
- [ ] Check usage in the Vercel and Upstash dashboards
- [ ] iPhone Add to Home Screen guidance
- [ ] README and privacy text

## Open decisions

- [x] Default lead time, and whether to notify both before and at ready: multiple alerts allowed, default 1 hour before + when ready
- [ ] Whether individual timers can opt out (for example, no alert for a 300-day dedi)
- [ ] Milestone 2: in or skip
- [ ] When to merge `feature/notifications` into `main`

## Decision log

- 2026-10-05: Push stack is Vercel Functions + Upstash Redis + cron-job.org (see Background)
- 2026-10-05: ARK Tracker stays free. No donations or paywall in the app; a credit link to the portfolio only (fan content guidelines)
- 2026-10-06: Plan written; work happens on `feature/notifications`
- 2026-10-06: Multiple alerts per timer (user picks any of 8 lead times) plus an optional daily summary at a local time. Daily summary is skipped when nothing is due.

## References

- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Upstash Redis pricing](https://upstash.com/pricing/redis)
- [Upstash QStash pricing](https://upstash.com/pricing/qstash)
- [Neon pricing](https://neon.com/pricing)
- [cron-job.org](https://cron-job.org/en/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) (alternative backend, not chosen)
