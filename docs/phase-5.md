# Phase 5 — Body metrics, water, steps, and the real Today screen

**Goal:** the daily numbers that the coaching rules will later read, plus a home
screen worth opening.

**Demo:** log this morning's weight, see the 7-day average and the trend against
the target rate. Tap +250 ml four times and watch the water ring fill. The home
screen shows both partners' day side by side.

## Scope

- `src/utils/stats.ts` — trailing 7-day mean, week-over-week delta in kg/week,
  simple linear trend, and a **minimum-sample guard**: fewer than 3 readings in a
  window returns "not enough data" rather than a number.
- `WeightEntry` + `WeeklyAverageCard` + `TrendChart` (inline SVG, no chart
  library) + `MeasureRow` for waist / hip / neck / arm / thigh.
- `WaterRing` — taps append a `WaterEntry`, they do not increment a scalar. The
  step size (`Settings.waterStepMl`) is editable.
- `StepsCard` — a single number per person per day, typed from their phone's
  health app.
- `Today.tsx` rewritten: kcal / protein / water rings per person, today's workout
  with a start button, quick-add buttons, and a streak chip. Both people visible
  at once, since either phone logs for either person.

## Files

```
src/utils/stats.ts
src/components/metrics/{WeightEntry,WeeklyAverageCard,TrendChart,MeasureRow}.tsx
src/components/daily/{WaterRing,StepsCard,TodayRings,StreakChip}.tsx
src/pages/Metrics.tsx
src/hooks/{useMetrics,useDaily}.ts
src/pages/Today.tsx            ← rewritten
```

## Notes

- Compare **average to average**, never last reading to last reading. Day-to-day
  scale noise is larger than a week's real change, and the source document is
  explicit about weighing 3–7 mornings and using the weekly average.
- Her tracked set is weight + waist + hip; his is weight. Both are just fields on
  `BodyMetric` — which fields a person sees is a preference, not a schema change.
- The trend chart draws the raw readings faintly and the 7-day average boldly,
  with the target rate band behind. That band is what makes "am I on track"
  answerable at a glance.

## Added while building

- **`PersonDayCard`** (`components/daily/`) carries one person's day, and Today
  renders one per person. Each card scopes the accent colour to that person, so
  both appear side by side in their own colour and the water button on a card
  logs for that person, from either phone.
- **Metric rows are keyed `personId:date`**, so two devices logging "this
  morning" converge on one row instead of creating two. Weight, waist and hip
  written the same day land in the same record.
- `useDaily(personId, date)` takes an explicit person rather than reading the
  active one, because Today shows both at once.

## Out of scope

Turning the trend into advice — that is Phase 6.

## Done when

- 14 days of weights with two gaps produce correct weekly averages.
- A week with 2 readings reports "not enough data" instead of a misleading number.
- Two rapid water taps produce two `WaterEntry` records, not one.
