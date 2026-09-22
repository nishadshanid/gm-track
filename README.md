# Gm2 🏋️ 🍚

A gym and diet tracker for two people with opposite goals, one kitchen and one
gym slot.

|                  | 👨 Him                    | 👩 Her                          |
| ---------------- | ------------------------- | ------------------------------- |
| Goal             | Weight gain + muscle      | Fat loss + muscle               |
| Calories         | ~2,200–2,400 kcal         | ~1,400–1,600 kcal               |
| Protein          | 90–100 g                  | 85–100 g                        |
| Eating occasions | 5–6                       | 3 + 1 optional                  |
| Split            | 5-day body-part split     | 5-day lower/upper + cardio      |

The food is the same Kerala cooking for both — idli, dosa, puttu, appam,
chapathi, sambar, kadala, chicken, eggs, curd. Only the portions differ, and
that difference is one setting per person.

Either phone can log for either person. There are no accounts, just a Him/Her
switch in the header.

## What it does

- **Diet** — today's meal slots from each person's plan. Pick Option A (idli) or
  C (puttu), adjust portions, add anything else, and the day's calories and
  protein move against that person's target band. Quick-add covers eating out.
- **Gym** — today's session from the weekly split, with last session's loads in
  front of you. Hit the top of the rep range on every prescribed set and it says
  so: *"All 3 sets hit 12 reps at 40 kg. Go to 42.5 kg and start again around 8."*
- **Body** — weight with a 7-day average, waist and hip, and a trend chart
  against the target rate.
- **Coach** — the adjustment rules from the original plans, applied to logged
  data. *"Add about 200 kcal a day"*, *"Scale is flat but the waist is moving —
  hold everything"*, *"Trim about 125 kcal — not 500, or walk more instead."*
  Every card shows the weigh-ins and windows it was computed from, and nothing
  changes a target without an explicit tap.
- **Setup** — everything above is data. People, targets, meal slots and their
  options, foods and their macros, exercises, workout days, the weekly schedule
  and the coaching rules are all editable in the app.

## Tech

React 18 · Vite · TypeScript · Tailwind · HashRouter · framer-motion ·
lucide-react. No backend, no build-time secrets, no analytics.

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # tsc --noEmit
npm test           # node --test, 107 tests
npm run build
```

## Data and sync

All state is one JSON object. On its own, the app keeps it in `localStorage` and
works entirely offline — that is a complete, usable setup for one device.

To share data between two phones, point it at a **private** GitHub repo:

1. Create a private repo, e.g. `gm2-data`. It can be the repo you deploy from.
2. Add repository **Variables** (Settings → Secrets and variables → Actions →
   Variables). These are coordinates, not credentials:
   - `VITE_GH_OWNER` — your GitHub username
   - `VITE_GH_REPO` — `gm2-data`
   - `VITE_GH_BRANCH` — `main` (optional)
   - `VITE_GH_PATH` — `data.json` (optional)
3. Create a **fine-grained personal access token**: that repo only, *Contents:
   read and write*.
4. Open the app on each phone → **Setup → Sync, PIN and data** → paste the
   token. It is verified against the repo, then stored in that browser only. It
   is never bundled into the build and never committed.

For local development, copy `.env.example` to `.env` and fill the same values.
Leave them empty to stay local-only.

### Why private

The file holds both people's body weight and waist measurements. FTrack, the
sibling project this borrows from, uses a public repo so its dashboard can read
without a token — that is not an acceptable trade here, so reads are
authenticated too and each phone needs its own token.

### How two phones stay in agreement

Logging is write-heavy — a session is roughly five exercises × four sets × two
people — so the app does **not** commit on every change:

- a push happens 8 s after the last edit, at most 45 s after the first unsaved
  one, and never less than 10 s apart
- plus immediately when the tab is hidden, the page unloads, the network comes
  back, or you tap the sync chip

That is 5–15 commits per session instead of ~80.

Every push is **read → merge → write**, never a blind overwrite:

- a record that exists on only one phone survives
- a record edited on both resolves to the later edit, and identically on both
  devices
- a delete is a tombstone that competes on time, so deleting on one phone while
  editing on the other resolves by who acted last — in either direction
- **sets inside a session and items inside a meal merge individually**, so you
  can both log into the same Friday session at once
- water is append-only, so two taps are two glasses

The `localStorage` copy is not a cache, it is the outbox. Because the merge is
state-based, the unsent snapshot *is* the queue: a force-quit, a dead signal in
the gym basement, or a week offline all reconcile at the next flush.

### The PIN is not security

It stops a pocket tap or a curious child from rewriting yesterday's log.
It does not protect the data. Anyone holding the GitHub token can read
everything. The PIN hash is stored in the shared file so both phones accept the
same code; being unlocked is per-device, per-session. Viewing is never gated.

## Deploying

Push to `main` and the workflow in `.github/workflows/deploy.yml` builds and
publishes to GitHub Pages. Commits that only change `data.json` are ignored, so
logging a workout does not trigger a rebuild.

`base: './'` plus `HashRouter` means it works from any repo subpath with no
server rewrites. Open the Pages URL on each phone and **Add to Home Screen** —
`manifest.webmanifest` makes it open full-screen like an app.

## Honest limits

- **The seeded food macros are approximations for home cooking.** How much oil
  goes into your dosa and how thick your sambar is are household-specific.
  Correct the ten or so foods you eat most in **Setup → Foods**; past logs keep
  the numbers they were recorded with, and a **Recompute** button on the Diet
  screen pulls corrections into a day when you want them.
- **The coach only knows what you log.** If logged intake falls below 70% of the
  target floor it says the log looks incomplete and withholds the one-tap
  calorie change, because adjusting a target you are not measuring against just
  moves the goalposts.
- **The GitHub round trip has not been run against a real repo yet.** The merge
  rules and the queue's conflict/retry/offline behaviour are covered by 25
  tests against a simulated two-device remote; the first real two-phone run is
  still outstanding.
- **This is not medical advice.** It applies the rules from the plans it was
  built for, to the data you give it.

## Layout

```
docs/                 phase-by-phase build notes, start at 00-overview.md
src/types/            the whole persisted contract
src/services/         store, storage adapters, merge, sync queue, seed
src/utils/            pure logic: macros, portions, overload, stats, coach
src/hooks/            one hook per screen's data
src/components/       ui kit, plus diet / workout / metrics / daily / coach
src/pages/            Today, Diet, Workout, Metrics, Insights, Setup, Settings
test/                 node --test over the pure modules
```

Design decisions and the reasoning behind them are in
[`docs/00-overview.md`](docs/00-overview.md).
