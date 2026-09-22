# Gm2 — Couple's Gym & Diet Tracker

One app, two people, two opposite goals, one kitchen.

| | 👨 Him | 👩 Her |
|---|---|---|
| Goal | Weight gain + muscle | Fat loss + muscle |
| Calories | ~2,200–2,400 kcal | ~1,400–1,600 kcal |
| Protein | 90–100 g | 85–100 g |
| Water | 2.5–3 L | 2–2.5 L |
| Eating occasions | 5–6 | 3 + 1 optional |
| Steps | normal | 7,000–10,000 |
| Split | Chest+Tri / Back+Bi / Shoulders+Abs / Legs / Full body | Lower+Glutes / Upper / Lower+Core / Upper+Cardio / Full+Cardio |
| Weekly target | +0.25–0.5 kg | waist & weekly average trending down |

The food is the same Kerala cooking for both — idli, dosa, puttu, appam, chapathi,
sambar, kadala, chicken, eggs, curd. Only the portions differ. The app has to
reflect that: one shared library, two plans.

---

## Principles

1. **Nothing is hardcoded.** People, targets, meal slots, meal options, foods,
   exercises, day templates, set/rep schemes and even the coaching rules are all
   editable in-app. `src/data/seed/*` only provides a starting point. If a screen
   contains a food name or a rep range as a literal, that is a bug.
2. **One app, two people, either phone.** No accounts. A Him/Her switcher in the
   header; either phone can log for either person. The PIN is an accident-guard,
   not security.
3. **Logs are immutable-ish snapshots.** A log copies the labels and numbers it
   was created from. Renaming a meal slot or fixing a food's calories next month
   must never rewrite last month's history.
4. **Compute, don't store.** Totals, weekly averages and progression suggestions
   are derived by pure functions from the raw log. Derived values in storage
   drift; derived values in a function cannot.
5. **Mobile first, thumb first.** `max-w-md`, bottom tab bar, big tap targets,
   steppers instead of keyboards wherever possible. It gets used standing between
   sets.

---

## Stack

React 18 · Vite · TypeScript · Tailwind (`darkMode: 'class'`) · HashRouter ·
framer-motion · lucide-react. No backend.

Ported from the sibling project `../FTrack`, which already solves the shape of this
problem (mobile family tracker, no server, GitHub-as-database):

| FTrack file | What we take |
|---|---|
| `src/services/storage.ts` | The `StorageAdapter` interface, defensive `normalize()` |
| `src/services/github.ts` | base64 helpers, sha tracking, PAT handling, `verifyToken` |
| `src/services/store.ts` | Tiny external store + `useSyncExternalStore` |
| `src/components/Layout.tsx` | `max-w-md` shell, fixed bottom tab bar, theme toggle |
| `src/App.tsx`, `vite.config.ts` | `HashRouter` + `base: './'` for GitHub Pages |
| `.github/workflows/deploy.yml` | Pages deploy, `paths-ignore` for the data file |

---

## Data model

Full definitions land in `src/types/index.ts` in Phase 1. Two rules carry the
design.

### 1. Every record is a `Rec`

```ts
interface Rec {
  id: string
  updatedAt: string     // ISO — stamped in exactly ONE place: store.emit()
  updatedBy?: string    // deviceId — deterministic tie-break
  deletedAt?: string    // tombstone — the store never hard-deletes
}

type DateKey = string   // "YYYY-MM-DD", always LOCAL time
```

This exists from day one, while storage is still just localStorage, so that
Phase 7's sync is a drop-in rather than a rewrite.

Soft delete matters: if a delete splices the array, the other phone's copy
resurrects the record on the next merge. `archived: true` is a *different* flag —
hidden from pickers, still resolvable by history. A `Food` or `Exercise` any log
references is archived, never deleted.

### 2. Flat, id-keyed collections

```ts
interface AppData {
  schemaVersion: number
  // registries — all editable in-app
  people: Person[]
  targets: TargetProfile[]
  coaching: CoachingRules[]
  foods: Food[]
  mealSlots: MealSlot[]
  mealOptions: MealOption[]
  exercises: Exercise[]
  dayTemplates: WorkoutDayTemplate[]
  schedules: WeekSchedule[]
  // logs
  mealLogs: MealLog[]
  workoutSessions: WorkoutSession[]
  bodyMetrics: BodyMetric[]
  waterEntries: WaterEntry[]
  stepLogs: StepLog[]
  settings: Settings
}
```

Flat rather than nested by `personId/date` because: merge is one generic routine
per collection instead of a tree walk; date-range queries (weekly average,
last-8-sessions) are one filter; immutable updates stay one level deep; and it
gives a clean archive seam. Lookup cost is absorbed by memoised indexes rebuilt
once per snapshot in `src/services/selectors.ts`.

**Device-local state is not in `AppData`.** Active person, theme, the PAT and the
PIN-unlocked flag live in `src/services/local.ts`. Syncing "who is looking at this
phone" would be a bug.

### Decisions that matter

**Meal options are templates; logging materialises a copy.**
`MealSlot` ("Breakfast") → `MealOption[]` ("A — Idli", "B — Dosa", "C — Puttu").
Choosing an option copies its items into the `MealLog`, which is then edited
freely. Rendering a log by looking up `optionId` breaks the first time someone
eats 2 idli instead of 3.

**Planned and logged amounts are different types.**

```ts
interface PlannedAmount { value: number; max?: number; unit: Unit }  // "200–300 g"
interface LoggedAmount  { value: number; unit: Unit }                // no range
```

Two types, not one optional field, so the compiler stops a range leaking into a
log. `Person.portionDefault` ('min' | 'mid' | 'max') resolves the range when
logging — his plan defaults to `max`, hers to `min`.

**Never store computed kcal on a logged item.** Store the food's *basis*
(`{ qty: 100, unit: 'g', kcal, proteinG }`) snapshotted at log time, and compute
in one pure function. One multiplication site, zero drift. A "Recompute from
library" action covers the case where a food's numbers are corrected later.

**Water is append-only events**, not a scalar:
`WaterEntry { personId, date, ml, at }`. It union-merges for free; a mutable
`waterMl: number` silently loses one of two simultaneous "+250 ml" taps.

**`SetLog` and `LoggedItem` carry their own `updatedAt`**, so two phones logging
into the same Friday full-body session merge set-by-set rather than
last-save-wins.

**Targets are a history, not a row.** `TargetProfile` has an `effectiveFrom`;
applying a coach suggestion writes a new profile, so past days keep the target
they were judged against.

---

## Macro math

Each `Food` declares a `basis` and optional `conversions`, so grams, millilitres
and pieces all go through one formula:

- **g** — rice, chicken, peanuts: `basis {qty:100, unit:'g'}`
- **ml** — milk, sambar, curd: `basis {qty:100, unit:'ml'}`
- **piece** — idli, dosa, egg, chapathi, banana, dates, almonds:
  `basis {qty:1, unit:'piece'}` plus `conversions.g = 1/gramsPerPiece`, so both
  "3 idli" and "135 g idli" resolve

An unconvertible unit returns `null` and the UI shows "—", never a silent 0.
Sum unrounded; round once at display (kcal integer, protein 0.1 g).
**Quick-add** (`foodId: null` with an inline basis) is mandatory — without it the
app is abandoned the first time they eat out.

---

## Sync

FTrack PUTs the whole file on every mutation and, on a 409, refetches the sha and
blind-overwrites. A gym session is roughly 5 exercises × 4 sets × 2 people ≈ 80
mutations: 80 commits, GitHub secondary rate limits, and a retry that silently
discards the other phone's sets. Both failures are certain, not theoretical.

The `StorageAdapter` interface is extended additively; the localStorage adapter
still implements only the first two methods.

```ts
interface StorageAdapter {
  subscribe(cb: (data: AppData) => void): () => void
  save(data: AppData): void
  flush?(): Promise<void>
  status?(cb: (s: SyncStatus) => void): () => void
}
```

1. **`save()` never writes remotely.** It writes the localStorage mirror
   synchronously and schedules a push — 8 s idle debounce, 45 s max wait, 10 s
   floor between pushes. Explicit flush on `visibilitychange → hidden`,
   `pagehide`, "Finish workout", "Save meal", leaving a logging route, `online`,
   and a manual tap. Result: ~5–15 commits per session instead of 80.
2. **Read-merge-write, never blind write.** GET (with `If-None-Match`) →
   `mergeData(remote, local)` → PUT with the just-fetched sha. On 409: refetch,
   re-merge, retry with backoff 1/2/4/8 s + jitter, max 5 attempts, then park as
   dirty. The local snapshot is never discarded on failure.
3. **Merge rules** (`src/services/merge.ts`): index both sides by id; **ids
   present on only one side survive** — exactly what FTrack destroys; ids on both
   sides resolve by higher `updatedAt`, ties by `updatedBy`. A tombstone is just
   another field competing on `updatedAt`, so a delete wins only if it is newer
   than the competing edit. Second-level merge for
   `WorkoutSession.entries[].sets[]` and `MealLog.items[]`.
4. **The outbox is the snapshot.** Because the merge is state-based, the dirty
   snapshot in localStorage *is* the queue. Cold start: mirror → render → fetch →
   merge → render → push if changed. Correct across offline, force-quit, and a
   week of airplane mode, in about 60 lines.
5. **Clock-skew guard.** Stamp with `Math.max(Date.now(), lastSeenRemoteMs + 1)`,
   or a phone three minutes slow wins arguments it should lose.
6. **Polling is visibility- and route-aware** — 30 s on a logging screen so the
   other phone's sets appear mid-session, 120 s elsewhere, paused when hidden,
   plus on `focus` and `online`.
7. **Size seam, not sharding.** `JSON.stringify(data)` with no pretty-printing
   from day one — the contents API only inlines about 1 MB. `github.ts` exposes
   `readFile`/`writeFile`; the adapter may lazily read `archive/<year>.json` but
   only ever *writes* `data.json`. A Settings action archives old logs. Warn at
   600 KB.

**Private repo.** The data file holds both people's weight and waist/hip
measurements, so unlike FTrack the repo is private and reads are authenticated
too. Each phone pastes a fine-grained PAT (Contents: read+write, that repo only)
once; it is stored in that browser and never bundled. The PIN is SHA-256(pin +
salt) in `settings` so both phones share it — it prevents fat-finger edits, and
the README says plainly that the PAT is the only real credential.

---

## Store shape

Fourteen collections would mean 45+ bespoke FTrack-style actions. Instead, a
generic core with domain hooks on top:

```ts
store.upsert(key, rec)
store.update(key, id, fn)  // fn receives the CURRENT stored record
store.patch(key, id, patch)
store.remove(key, id)      // sets deletedAt
store.mutate(fn)           // escape hatch
```

`emit()` is the single place that stamps `updatedAt`/`updatedBy`. That one
stamping site is what makes the merge trustworthy.

**Hooks mutate through `store.update`, not `patch`.** `patch` and `upsert` take
a value the caller already holds, and in React that value comes from a render
closure. Ticking set 1, 2 and 3 in quick succession all happens before a
re-render, so three closure-based updates would each recompute from the same
stale record and the last write would silently discard the first two. `update`
reads the stored record inside the call, so consecutive mutations compose.

---

## Phases

| # | Phase | Demo at the end |
|---|---|---|
| 1 | [Scaffold, shell, type model](phase-1.md) | Runs on a phone, tabs work, Him/Her switch persists |
| 2 | [Registry CRUD](phase-2.md) | Add a person, a food, an exercise; edit targets |
| 3 | [Diet logging + macros](phase-3.md) | Tap Option A, change 3 idli → 4, totals move |
| 4 | [Workout logging + overload](phase-4.md) | Log sets vs "3 × 8–12", get the increase-load hint |
| 5 | [Body, water, steps, Today](phase-5.md) | Weight trend, water ring, full home screen |
| 6 | [Coaching engine](phase-6.md) | "Add 200 kcal" suggestion with a working Apply |
| 7 | [PIN + GitHub sync](phase-7.md) | Two devices log at once, nothing lost |
| 8 | [Deploy + polish](phase-8.md) | Installed on both phones from a Pages URL |

Everything before Phase 7 runs on the localStorage adapter.

**Why registry CRUD is Phase 2 and sync is Phase 7.** The logging screens need
the pickers and the UI kit anyway, so building the editors first costs nothing
and proves the "everything is editable" requirement instead of bolting it on at
the end. `mergeData`, by contrast, depends on the final shape of every
collection — built early it gets rewritten three times; built last it touches
zero components.

---

## Conventions

- **Dates.** Every `DateKey` comes from `src/utils/date.ts` (`todayKey()`,
  `dateKey(d)`), built from *local* components. `toISOString().slice(0,10)` rolls
  the day at 05:30 IST and is banned.
- **Ids.** `src/utils/id.ts` — `uid()`, as in FTrack.
- **Pure logic lives in `src/utils/`** and takes plain arguments, never the store.
  `macros`, `portion`, `overload`, `volume`, `stats`, `coach`, `merge` are all
  testable with `node --test`. A *runtime* relative import between two of them
  carries its `.ts` extension, because Node's TypeScript support has no
  extensionless resolution; Vite accepts either form, and `import type` is
  erased so it never needs one.
- **Components never read storage.** They use hooks; hooks use selectors;
  selectors read the snapshot.
- **Tailwind, no CSS files** beyond `index.css` for the `card` / field classes.
- `npm run lint` is `tsc -b --noEmit` and stays clean at the end of every phase.
