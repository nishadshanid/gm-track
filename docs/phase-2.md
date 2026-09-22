# Phase 2 — Registry CRUD (the "nothing hardcoded" backbone)

**Goal:** every registry is editable before any screen depends on it.

**Demo:** add a third person, rename one, change her protein target from 85–100 g
to 95–110 g, add "Ragi puttu" to the food library with its macros, add a new
exercise. All of it persists.

## Scope

- The shared UI kit. Every later phase is assembled from these, so they are built
  once, here: bottom `Sheet`, `Field`, `NumberStepper`, `UnitInput`, `Chip`,
  `SearchList`, `ConfirmDialog`, `EmptyState`.
- `PeopleEditor` — name, short label, emoji, colour, sex, height, birth year,
  `portionDefault`, order, archive.
- `TargetEditor` — kcal min/max, protein min/max, water, steps. Saving writes a
  **new `TargetProfile`** with `effectiveFrom = todayKey()`, it does not mutate the
  old one.
- `FoodEditor` — name, category, canonical unit, `basis` (qty + unit + kcal +
  protein, optional carbs/fat), `conversions` (e.g. grams per idli), named
  servings, archive.
- `ExerciseEditor` — name, muscle groups, equipment, mode
  (`weight-reps` | `bodyweight-reps` | `weighted-bodyweight` | `time` | `distance`),
  unilateral flag, default scheme, cues, archive.
- `src/data/seed/people.ts`, `foods.ts` and `exercises.ts` — the two people with
  their starting targets, 37 Kerala foods, and 39 exercises, all as pure data.

## Files

```
src/components/ui/{Sheet,Field,NumberStepper,UnitInput,Chip,SearchList,ConfirmDialog,EmptyState,SectionHeader}.tsx
src/components/setup/{PeopleEditor,TargetEditor,FoodEditor,ExerciseEditor}.tsx
src/pages/Setup.tsx          ← tabbed: People · Foods · Exercises
src/hooks/useRegistry.ts
src/data/seed/{people,foods,exercises}.ts
```

`exercises.ts` was planned for Phase 4 but lands here: `ExerciseEditor` needs
something to list, and Phase 4's day templates reference these ids.

## Notes

- **Archive vs delete.** The UI only ever offers Archive for foods and exercises.
  Hard delete is reserved for records nothing references, and even then the store
  writes a tombstone rather than splicing.
- Seed macro values are approximate, per-unit, and explicitly editable — the food
  editor is the correction mechanism, and the docs should say so rather than
  implying the numbers are authoritative.
- The seed food list needs `conversions.g` on every piece-based food (idli, dosa,
  chapathi, egg, banana, date, almond) or "10 almonds" and "15 g" cannot both work.

## Out of scope

Meal slots and options (Phase 3), day templates and schedules (Phase 4) — those
editors ship next to the screens that consume them.

## Done when

- Every field of `Person`, `TargetProfile`, `Food` and `Exercise` is reachable
  from the UI.
- Editing a target leaves the previous `TargetProfile` intact in storage.
- Archiving a food removes it from pickers but a direct lookup still resolves it.
