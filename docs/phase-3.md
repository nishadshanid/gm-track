# Phase 3 — Diet logging + macro math

**Goal:** log a day of food against each person's plan and see the numbers.

**Demo:** open Breakfast, tap Option A (idli), change 3 idli → 4, add a boiled
egg, mark it eaten. The day's kcal and protein bars move against his 2,200–2,400 /
90–100 g band. Switch to her and the same slot shows her portions.

## Scope

- `src/utils/macros.ts` — the single multiplication site.

  ```ts
  toBasisUnits(amount, basis, conversions): number | null
  macrosOf(item: LoggedItem, food?: Food): Macros | null
  ```

  Unconvertible units return `null` → the UI renders "—", never a silent 0.
  Sum unrounded, round once at display.
- `src/utils/portion.ts` — `resolvePlanned(amount, pref)` collapses a
  `PlannedAmount` range using `Person.portionDefault`.
- `MealSlotEditor` / `MealOptionEditor` — slots (name, order, time hint, optional
  flag, per-slot target) and their options (label, name, items, note). Same
  "nothing hardcoded" rule as Phase 2.
- `Diet.tsx` — the day's slots for the active person, each a `SlotCard` with
  status `planned` / `eaten` / `skipped`.
- Choosing an option **copies** its items into the `MealLog`. `sourceOptionId` is
  kept for provenance only and is never used for rendering.
- `PortionSheet` with a stepper for editing a logged amount; `FoodPicker` for
  adding; `QuickAddSheet` for an ad-hoc entry with inline macros
  (`foodId: null`) — needed the first time they eat out.
- `DayTotals` + `MacroBar` against the `TargetProfile` in effect on that date.

## Files

```
src/utils/{macros,portion}.ts
src/components/setup/{MealSlotEditor,MealOptionEditor}.tsx
src/components/diet/{SlotCard,OptionPicker,LoggedItemRow,PortionSheet,FoodPicker,QuickAddSheet,MacroBar,DayTotals}.tsx
src/pages/Diet.tsx
src/hooks/useDiet.ts
src/data/seed/mealPlans.ts
```

`src/data/seed/mealPlans.ts` encodes both plans: his six occasions (wake-up
dates+almonds, breakfast A–D, the 11 AM smoothie/snack options, lunch, 4 PM snack,
pre-workout, post-workout dinner A–C) and her three-plus-optional (breakfast A–D,
optional 11 AM, lunch with the ½ veg / ¼ protein / ¼ rice note, optional 4–5 PM,
pre-workout, dinner A–C).

## Notes

- Swapping option after editing: if `manuallyEdited` is set, confirm before the
  copy overwrites.
- The plan's coaching lines ("Don't make breakfast tiny", "Don't use all three
  options together — pick one") ride along as `MealSlot.note` / `MealOption.note`
  so the guidance survives in the app rather than in the chat transcript.
- Slot totals from the plan display as a **range** `[sum(min), sum(max)]`, because
  that is what the source document actually specifies.

## Added while building

- **Swap is a view state on the card.** Once a meal is logged the items replace
  the picker, so "Swap" had to bring the picker back rather than collapse the
  card. Swapping over a hand-edited meal asks first, via `ConfirmDialog`.
- **`topUpSeed` / `missingSeed` in `services/seed.ts`.** The app is being built
  in phases, so a device that stored its data before meal plans existed would
  show an empty Diet screen with no way forward. Setup now offers "Load starter
  plan", which fills only the registries that are empty and never touches logs.

## Out of scope

Weekly adherence and any coaching suggestion (Phase 6).

## Done when

- His breakfast (4 idli + 2 eggs + 1 cup sambar) and hers (2 idli + 2 eggs) both
  total correctly when checked by hand against the library.
- Swapping Idli → Puttu changes the totals; editing a portion afterwards changes
  them again.
- A quick-add entry with no `foodId` contributes to the day total.
