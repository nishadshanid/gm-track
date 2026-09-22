# Phase 1 — Scaffold, shell, and the full type model

**Goal:** a running, installable-feeling mobile shell with the complete data
contract already in place.

**Demo:** open on a phone. Dark mode works. The bottom tab bar navigates. The
Him/Her switcher changes the accent colour and name and survives a reload.

## Scope

- Vite + React 18 + TypeScript + Tailwind project, mirroring `../FTrack`'s config
  (`base: './'`, `darkMode: 'class'`, HashRouter).
- **`src/types/index.ts` written in full** — every interface in
  [00-overview.md](00-overview.md#data-model), including the collections that no
  screen touches until Phase 5. This is the one thing that must not be done
  incrementally; the whole plan's low-rework property depends on it.
- The tiny external store, ported from FTrack's `src/services/store.ts` but with
  the generic `upsert` / `patch` / `remove` / `mutate` core instead of bespoke
  actions. `emit()` is the single place that stamps `updatedAt` / `updatedBy` and
  persists.
- localStorage adapter only. The `StorageAdapter` interface already declares the
  optional `flush?()` / `status?()` that Phase 7 will implement.
- Device-local state (`active person`, theme) separated into
  `src/services/local.ts` so it never lands in `AppData`.
- Seed bootstrap: on first run, if `AppData` is empty, load `src/data/seed/*`.

## Files

```
package.json  vite.config.ts  tsconfig.json  tsconfig.node.json
tailwind.config.js  postcss.config.js  index.html  .gitignore  .env.example
src/main.tsx  src/App.tsx  src/index.css  src/vite-env.d.ts
src/types/index.ts                      ← the whole model
src/utils/{id,date,format}.ts           ← date.ts owns todayKey(), LOCAL time
src/services/{local,storage,store,selectors,seed}.ts
src/hooks/{useData,usePerson,useTheme}.ts
src/components/{Layout,BottomNav,PersonSwitcher,PageTransition,ThemeToggle}.tsx
src/pages/Today.tsx                     ← skeleton, real in Phase 5
```

## Notes

- `src/utils/date.ts` is the only place a `DateKey` is ever produced.
  `toISOString().slice(0,10)` must not appear anywhere in the codebase — it rolls
  the day at 05:30 IST.
- `PersonSwitcher` reads `people` from the store (it is a registry, not a
  constant) and writes the choice to `local.ts`.
- Accent colour comes from `Person.color`, applied as a CSS custom property on the
  shell so every screen picks it up without prop-drilling.

## Out of scope

Any logging UI, any editor, anything touching GitHub.

## Done when

- `npm run dev` serves a working shell; `npm run lint` is clean.
- Switching person and reloading keeps the choice.
- `localStorage` shows a seeded `AppData` with every collection present and every
  record carrying `id` + `updatedAt`.
