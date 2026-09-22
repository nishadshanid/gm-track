# Phase 4 — Workout logging + progressive overload

**Goal:** log a session set by set, with last session's numbers in front of you.

**Demo:** Monday, tap Chest + Triceps. Bench press shows "last: 40 × 8, 8, 7".
Log 40 × 9, 9, 8. Next week log 40 × 12, 12, 12 and the card says: all sets at the
top of 8–12 → add 2.5 kg.

## Scope

- `DayTemplateEditor` — a day's name and its blocks (exercise, sets, rep range,
  rest, superset group, order, note). `ScheduleEditor` — which template each
  weekday maps to, or `rest`.
- `Workout.tsx` picks today's template from `WeekSchedule` by local weekday, with
  an override (they will not always train on schedule).
- `SessionLog.tsx` — the live session. Per exercise: target scheme, previous
  session's sets, a row per set with weight/reps steppers and a done toggle.
  Add / swap / skip an exercise mid-session. Optional rest timer.
- `src/utils/overload.ts` — derived, never stored.

  ```ts
  lastSessionFor(personId, exerciseId): SessionExercise | undefined
  hitTopOfRange(entry): boolean
  suggestion(entry, rules): { kind: 'add-load' | 'add-reps' | 'hold', deltaKg?: number }
  ```

- `src/utils/volume.ts` — working sets per muscle group per week, to sanity-check
  against the plan's "chest: 11 sets, triceps: 5".
- `src/data/seed/splits.ts` — his five days and her five days, exactly as
  specified, including her cardio blocks and the optional accessories.

## Files

```
src/components/setup/{DayTemplateEditor,ScheduleEditor}.tsx
src/utils/{overload,volume}.ts
src/components/workout/{DayPicker,ExerciseCard,SetRow,RestTimer,PrevBest,ProgressionHint}.tsx
src/pages/{Workout,SessionLog}.tsx
src/hooks/useWorkouts.ts
src/data/seed/splits.ts
```

## Notes

- `hitTopOfRange` counts only `kind === 'work' && done`, requires
  `workSets.length >= scheme.sets`, and handles `weightKg === null`: bodyweight
  exercises progress reps, and only `weighted-bodyweight` gains load.
- Increment defaults live in `CoachingRules.progression`
  (`incrementKgUpper: 2.5`, `incrementKgLower: 5`) and are editable, not literals.
- The session snapshots `templateName`, `exerciseName` and `scheme`, so editing
  the template later never rewrites history.
- Plank and other time-based work uses `mode: 'time'` — seconds, not reps.

## Changed while building

- **No separate `SessionLog.tsx`.** The live session is state on `Workout.tsx`
  rather than a second route: the session belongs to a date, and a route would
  have duplicated the date navigation and the person switcher for nothing.
- **`store.update(key, id, fn)` added** (`services/store.ts`). Ticking three
  sets in quick succession happens faster than React re-renders, so the old
  closure-based `patch` recomputed from a stale session each time and kept only
  the last tick. Every hook mutation now reads the record as currently stored.
  `useDiet` had the same flaw for item edits and was fixed with it.
- **Reps are not prefilled, only load.** Prefilling last week's reps meant an
  untouched row that got ticked recorded reps nobody did. Load is a deliberate
  setting; reps are the outcome.
- **The load suggestion is applied by a tap**, not prefilled — "Set all sets to
  42.5 kg". Taking the increase stays a decision, because you might not have the
  plates or might want another week at this weight.

## Out of scope

Charts of load over time (Phase 6, `Insights.tsx`).

## Done when

- A session survives a reload mid-set.
- The same exercise next week prefills last week's loads.
- Forcing 12/12/12 on a 3 × 8–12 produces the add-load hint; 12/12/11 does not.
