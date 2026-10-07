# ARK Tracker

A PWA for tracking locations in ARK: Survival Evolved on a PvE cluster.

- **Timer markers**: abandoned bases and neglected tames. A marker can hold several labeled timers (tame groups, each building material, generators), each with the decay time the game shows. Each countdown runs from the moment you enter it.
- **Points of interest**: caves, artifacts, spawns. Just a name and a location.

All data lives in the browser's localStorage on each device. There are no accounts and no server.

## Running

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build
```

## Structure

| Path | Purpose |
|---|---|
| `src/App.tsx` | Header and routes; holds the data store and list filters |
| `src/types.ts` | Data model: `ArkMap`, `Category`, `Marker`, `AppData` |
| `src/data/defaults.ts` | Starting maps, categories, and settings for a fresh install |
| `src/data/decay.ts` | Materials and their official decay times |
| `src/hooks/useAppData.ts` | Loads/saves `AppData` in localStorage, exposes save/delete actions |
| `src/hooks/useNow.ts` | Ticking clock that keeps countdowns live |
| `src/utils/time.ts` | Duration math and formatting |
| `src/utils/filters.ts` | List filters, shared by the list and the exports |
| `src/utils/report.ts` | Report data for exports: fixed ready times, time zone, filter summary |
| `src/utils/csv.ts` | CSV export |
| `src/utils/pdf.ts` | PDF export (jsPDF, loaded only when used) |
| `src/utils/timers.ts` | Timer helpers: sorting, nearest timer, label suggestions |
| `src/utils/decay.ts` | Calculates a decay group's timers from one material's reading |
| `src/utils/groups.ts` | Group helpers: offline moment, default names, shifting, v2 -> v3 grouping |
| `src/components/MarkerList.tsx` | Main screen: filters, Timers section, Points of Interest section |
| `src/components/MarkerForm.tsx` | Add/edit a marker |
| `src/components/Settings.tsx` | Edit maps and categories, export/import JSON |
| `src/components/ResyncForm.tsx` | Inline "time the game shows now" entry on timer cards |
| `src/components/GroupEditor.tsx` | One decay group on the marker form: reading, materials, live preview |
| `src/components/NumberInput.tsx` | Decimal input used in Settings |
| `src/components/TimerDisclaimer.tsx` | Note about server downtime and rollbacks |
| `vercel.json` | Sends every URL to `index.html` so routes work on refresh and direct links |

## Routes

| URL | Page |
|---|---|
| `/` | Marker list |
| `/markers/new` | Add a marker |
| `/markers/:id/edit` | Edit a marker (redirects to `/` if it doesn't exist) |
| `/settings` | Settings |

Any other URL redirects to `/`.

## How the data works

- Everything is saved as one JSON object under the localStorage key `ark-tracker:data`.
- The data has a `version` number. When the shape changes, `migrate()` in `src/hooks/useAppData.ts` upgrades older saves and older export files as they load, one version at a time. Version 2 replaced a marker's single `expiresAt` with a `timers` list. Version 3 added decay groups (see below).
- Each timer stores `expiresAt` as an absolute timestamp (entry time + duration), so countdowns stay accurate while the app is closed.
- Timer markers sort by their nearest active timer. Cards with more than one timer list each one, under group headings when there's more than one group (one-off timers appear under "Other"); tap a timer row to resync it or mark it done. Done timers follow the "Show done" toggle, the same as done markers.
- In the edit form, decay groups come first, then **Other timers** for one-offs (**+ Add another timer**). On existing one-off timers, leave the duration blank to keep it, or enter a new one to restart it from now.
- **Resync** restarts a timer's countdown from now, using the time the game currently shows. Resyncing a timer in a decay group shifts every timer in that group by the same amount. Use it when the in-game timer has drifted. The game's timers pause during server downtime and rewind on crash rollbacks, and the app can't detect either. A disclaimer about this appears on the main list and on the form for timer categories.
- **Done** marks a marker as handled (looted, claimed, checked) without deleting it. Use "Show done" to see those markers again.
- Categories control whether a marker has a timer. You can add, recolor, or toggle them in Settings.
- Maps and categories that are still used by markers can't be deleted.
- **Duplicate check**: when adding a marker, the form lists existing markers (including done ones) on the same map within the distance set in **Settings > Duplicate Check** (default 1.0). **Open it** jumps to that marker so you can resync it or add timers; **Save anyway** creates the new one. Settings are part of the saved data, so they're included in exports. New settings get their default values on load without a version bump.

## Decay times

Every decay timer at an abandoned base starts when the tribe goes offline. So one reading is enough to fill in the rest:

```
time gone       = full time (material you read) - time left (material you read)
time left (any) = full time (that material) - time gone
```

Timers are organized into **decay groups**: one group per base, holding that base's material timers. A new marker opens with group **G1** ready for a reading: pick the material you read (Metal by default for Abandoned Base, Tames for Neglected Tame), enter its time, and check the other materials at the base. The form previews every resulting timer live, and Save creates them. Materials that would already have decayed are skipped and listed.

- **+ Add another base group** adds G2, G3, and so on, for close bases with different countdowns at one marker. Group names are editable.
- On an existing group, a new reading recalculates the whole group; leaving it blank keeps the current times. Checking a material adds it using the group's current offline moment, with no new reading needed. Unchecking removes it.
- Changing decay settings later doesn't move existing timers. A new reading recalculates with the current settings.
- **Other timers** are one-offs that don't follow a base, like tames left on their own.
- **Already demolishable** (top of the Timers section) skips timers entirely, for reporting a structure that can be demolished now. It's saved as a single "Demolishable" timer that's ready from the moment it was reported, so the card shows READY, the list sorts it to the top, and exports show "ready since" with that date. Editing the marker keeps the original report time. It doesn't trigger a ready notification.
- Upgrading to data version 3 turned each marker's material-named timers into group G1 with their times unchanged. A tame timer joined G1 only if its countdown lined up with the base's offline moment (within an hour); otherwise it stayed a one-off.

Full times come from **Settings > Decay Times**. The defaults are official-server values from the [ARK wiki](https://ark.wiki.gg/wiki/Building). Private servers often scale decay, with separate multipliers for structures and tames. Enter them and press **Apply** to recalculate every row, then fix any single row that still doesn't match the game. To work out a server's structure multiplier, read two materials at one base: for example, `(metal time left - stone time left) / 4 days`, since official metal and stone are 4 days apart.

## Notifications

**Settings > Notifications** turns on alerts for timers. Pick any number of alert times (1 day before down to when ready), and optionally a daily summary at a set local time listing timers ready in the next 24 hours. Tapping an alert opens that marker.

- Alerts currently only fire while the app is open (a tab, or the installed app in the background). Push notifications with the app closed are planned; see `docs/notifications-plan.md`.
- Scheduling rules live in `src/utils/notificationSchedule.ts` (pure functions, no browser APIs). `src/hooks/useNotificationScheduler.ts` runs them, shows notifications, and sets the next wake-up.
- What's already been sent is stored per device under `ark-tracker:notify-state`, so reloads don't repeat alerts. New or resynced timers only alert going forward. Alerts missed while the app was closed arrive as one "While you were away" notification.
- On iPhone and iPad, notifications only work from the Home Screen app (iOS 16.4+).
- The service worker is `src/sw.ts` (vite-plugin-pwa `injectManifest`). It doesn't run under `npm run dev`; use `npm run build && npm run preview` to test anything that depends on it.

## Exports

**Settings > Data** has three exports:

- **Export backup (JSON)**: everything, for moving to another device or keeping safe. The only format **Import backup** reads.
- **Spreadsheet (CSV)**: one row per timer, plus one row per marker without timers. Opens in Excel, Google Sheets, or LibreOffice.
- **Report (PDF)**: an A4 report grouped by map, soonest timers first, with coordinates and descriptions.

CSV and PDF are snapshots, so timers are given as fixed ready dates and times rather than countdowns, with the exporting device's time zone spelled out (e.g. GMT+2, Africa/Johannesburg). Both follow the list's current filters, and the PDF states which filters were used. jsPDF is loaded only when a PDF is exported; its unused HTML/SVG helpers are left out of the offline cache (see `globIgnores` in `vite.config.ts`).

## Sharing between devices

Each device keeps its own data. To copy it over, go to **Settings > Export** on one device and **Settings > Import** on the other. Importing replaces everything on the receiving device. Export also works as a backup, since clearing browser data wipes the app.

## Icons

`public/icon-*.png` are generated by `scripts/generate-icons.cjs`. It needs the `canvas` package, which it borrows from Rolling Home:

```bash
NODE_PATH=../rolling-home/node_modules node scripts/generate-icons.cjs
```
