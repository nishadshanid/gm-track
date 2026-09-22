import type { AppData, Person, Unit } from '../types'
import { selectable } from '../services/selectors.ts'

/**
 * THE DATA BOUNDARY.
 *
 * This is the only place in the codebase allowed to build a payload for an
 * external model. It is a whitelist, not a filter: it names the handful of
 * fields that may leave the device and copies them one by one, so a field added
 * to `AppData` later cannot leak by default.
 *
 * Why it is this strict: the Gemini free tier states that content is used to
 * improve Google's products, and this app holds two people's body weight and
 * waist measurements. The libraries and the plan are *vocabulary* — generic
 * Kerala food and standard gym exercises that happen to be stored here — so
 * sending them costs nothing. The record of what these two actually ate,
 * lifted and weighed is not sent at all.
 *
 * Deliberately absent, and it must stay that way:
 *   bodyMetrics, mealLogs, workoutSessions, waterEntries, stepLogs,
 *   targets, coaching, notes, and every token in device state.
 *
 * `test/aiContext.test.js` asserts this against a store full of real data, and
 * the browser test asserts it again on the actual outgoing request body.
 */

export interface AiFood {
  name: string
  unit: Unit
  /** Per-unit energy, so the model can sanity-check a portion it proposes. */
  kcal: number
  /** Grams in one piece, where the food is counted rather than weighed. */
  gramsEach?: number
}

export interface AiExercise {
  name: string
  groups: string
  /** 'weight-reps' | 'time' | ... — decides whether reps or seconds are asked for. */
  mode: string
}

export interface AiContext {
  today: string
  /** Display name only. No targets, no measurements, no id. */
  person: string
  /** How this person fills a planned range — 'min' | 'mid' | 'max'. */
  portions: string
  foods: AiFood[]
  exercises: AiExercise[]
  /** Slot names in order, so "log my breakfast" resolves to a real slot. */
  mealSlots: string[]
  /** Option labels per slot, e.g. "Breakfast: A Idli, B Dosa". */
  mealOptions: string[]
  /** Workout day names, so "skip legs" resolves to a real template. */
  workoutDays: string[]
}

export function buildAiContext(data: AppData, person: Person, today: string): AiContext {
  const slots = selectable(data.mealSlots)
    .filter((s) => s.personId === person.id)
    .sort((a, b) => a.order - b.order)

  const options = selectable(data.mealOptions)
  const optionLines = slots.map((slot) => {
    const names = options
      .filter((o) => o.slotId === slot.id)
      .sort((a, b) => a.order - b.order)
      .map((o) => `${o.label} ${o.name}`)
      .join(', ')
    return `${slot.name}: ${names}`
  })

  return {
    today,
    person: person.name,
    portions: person.portionDefault,
    // Each field is copied explicitly — never a spread of the record, which
    // would carry anything added to Food later.
    foods: selectable(data.foods).map((f) => ({
      name: f.name,
      unit: f.basis.unit,
      kcal: f.basis.kcal,
      gramsEach: f.conversions?.g ? Math.round(1 / f.conversions.g) : undefined,
    })),
    exercises: selectable(data.exercises).map((e) => ({
      name: e.name,
      groups: e.muscleGroups.join('/'),
      mode: e.mode,
    })),
    mealSlots: slots.map((s) => s.name),
    mealOptions: optionLines,
    workoutDays: selectable(data.dayTemplates)
      .filter((t) => t.personId === person.id)
      .sort((a, b) => a.order - b.order)
      .map((t) => t.name),
  }
}

/** Every key this payload is permitted to contain. Used by the test. */
export const ALLOWED_CONTEXT_KEYS = [
  'today',
  'person',
  'portions',
  'foods',
  'exercises',
  'mealSlots',
  'mealOptions',
  'workoutDays',
  // nested
  'name',
  'unit',
  'kcal',
  'gramsEach',
  'groups',
  'mode',
] as const
