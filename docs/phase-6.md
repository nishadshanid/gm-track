# Phase 6 — Coaching / adjustment engine

**Goal:** the adjustment rules from the source documents, applied automatically
instead of remembered.

**Demo:** "7-day average +0.10 kg/week for 3 weeks — below your +0.25–0.5 target.
Add ~200 kcal/day." Tap Apply and his target becomes 2,400–2,600, effective today,
while last month's days keep the target they were judged against.

## Scope

- `src/utils/coach.ts` — pure, given metrics + rules + targets:

  ```ts
  evaluate(personId, data, asOf): Suggestion[]
  ```

  Rules, all editable via `CoachingRulesEditor`:
  - **Gain:** weekly average rising 0.25–0.5 kg/wk → hold. Flat for
    `lookbackWeeks` → add `kcalAdjustStep` (150–250). Rising much faster → trim.
  - **Loss:** weight or waist trending down → hold. Nothing moving for 3–4 weeks →
    trim 100–150 kcal **or** add steps, offered as two choices, never an automatic
    500 kcal cut.
  - Both: a protein-intake check against the target band, and an adherence note
    when too few days were logged for the verdict to mean anything.
- `CoachCard` + `AdjustSheet` — the suggestion, the evidence behind it, and an
  Apply that writes a new `TargetProfile`.
- `Insights.tsx` — weight trend, kcal/protein adherence, and per-exercise load
  progression over time.

## Files

```
src/utils/coach.ts
src/components/coach/{CoachCard,AdjustSheet}.tsx
src/components/setup/CoachingRulesEditor.tsx
src/pages/Insights.tsx
```

## Notes

- A suggestion must always show its evidence — the window, the number of
  readings, and the computed rate. Advice with no visible basis gets ignored or,
  worse, trusted blindly.
- Never fire on insufficient data. `stats.ts` already returns "not enough data";
  `coach.ts` propagates that as "keep logging" rather than inventing a verdict.
- The two documented failure modes are worth stating in the UI, because they are
  the actual risk: for him, treating "eat more protein" as a substitute for
  eating more food; for her, cutting calories hard and adding cardio instead of
  holding a moderate deficit with strength training.
- Applying a suggestion is always explicit. Nothing auto-edits a target.

## Added while building

- **An implausible food log blocks the one-tap change.** Averaging 500 kcal a
  day against a 1,400–1,600 target means meals are going unlogged, not that the
  metabolism is broken — and offering "cut another 125 kcal" on top of that
  adjusts a target nothing is measured against, compounding every time the
  trend fails to move. When logged intake falls under 70% of the target floor,
  the coach says so, shows the trend analysis for information, and withholds
  the Apply button. The steps suggestion survives, since it changes no calorie
  band. The protein notice is suppressed too, for the same reason.
- **`useCoach`** (`hooks/`) assembles the inputs from the store and writes the
  applied adjustment, keeping `coach.ts` pure and testable.

## Out of scope

Anything predictive. This reports what the rules say about logged data.

## Done when

- A synthetic flat 3-week trend produces exactly the documented suggestion.
- Apply writes a new `TargetProfile`; reopening a day from before the change shows
  the old target.
- Editing `lookbackWeeks` or `kcalAdjustStep` changes the output.
