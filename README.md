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
| `src/utils/timers.ts` | Timer helpers: sorting, nearest timer, label suggestions |
| `src/utils/decay.ts` | Calculates a base's timers from one material's reading |
| `src/components/MarkerList.tsx` | Main screen: filters, Timers section, Points of Interest section |
| `src/components/MarkerForm.tsx` | Add/edit a marker |
| `src/components/Settings.tsx` | Edit maps and categories, export/import JSON |
| `src/components/ResyncForm.tsx` | Inline "time the game shows now" entry on timer cards |
| `src/components/DecayCalculator.tsx` | "Fill from decay times" panel on the marker form |
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
- The data has a `version` number. When the shape changes, `migrate()` in `src/hooks/useAppData.ts` upgrades older saves and older export files as they load, one version at a time. Version 2 replaced a marker's single `expiresAt` with a `timers` list.
- Each timer stores `expiresAt` as an absolute timestamp (entry time + duration), so countdowns stay accurate while the app is closed.
- Timer markers sort by their nearest active timer. Cards with more than one timer list each one; tap a timer row to resync it or mark it done. Done timers follow the "Show done" toggle, the same as done markers.
- In the edit form, add timers with **+ Add timer**. On existing timers, leave the duration blank to keep it, or enter a new one to restart it from now.
- **Resync** restarts a timer's countdown from now, using the time the game currently shows. Use it when the in-game timer has drifted. The game's timers pause during server downtime and rewind on crash rollbacks, and the app can't detect either. A disclaimer about this appears on the main list and on the form for timer categories.
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

On the marker form, **Fill from decay times** asks for one material's in-game timer and which other materials the base has, then adds a timer for each. A timer whose name already exists on the marker is updated instead of duplicated. Materials that would already have decayed are skipped and listed.

Full times come from **Settings > Decay Times**. The defaults are official-server values from the [ARK wiki](https://ark.wiki.gg/wiki/Building). Private servers often scale decay, with separate multipliers for structures and tames. Enter them and press **Apply** to recalculate every row, then fix any single row that still doesn't match the game. To work out a server's structure multiplier, read two materials at one base: for example, `(metal time left - stone time left) / 4 days`, since official metal and stone are 4 days apart.

## Sharing between devices

Each device keeps its own data. To copy it over, go to **Settings > Export** on one device and **Settings > Import** on the other. Importing replaces everything on the receiving device. Export also works as a backup, since clearing browser data wipes the app.

## Icons

`public/icon-*.png` are generated by `scripts/generate-icons.cjs`. It needs the `canvas` package, which it borrows from Rolling Home:

```bash
NODE_PATH=../rolling-home/node_modules node scripts/generate-icons.cjs
```
