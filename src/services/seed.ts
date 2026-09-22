import type { AppData, Settings } from '../types'
import { todayKey } from '../utils/date.ts'
import { seedCoaching, seedPeople, seedTargets } from '../data/seed/people.ts'
import { seedFoods } from '../data/seed/foods.ts'
import { seedExercises } from '../data/seed/exercises.ts'
import { seedMealPlans } from '../data/seed/mealPlans.ts'
import { seedSplits } from '../data/seed/splits.ts'

/** Bumped when the shape of AppData changes in a way that needs migrating. */
export const SCHEMA_VERSION = 1

/**
 * The starting content.
 *
 * Loaded once, on a device's first run. Everything it produces is ordinary
 * editable data — Setup can change or delete any of it, and "Import starter
 * plan" can re-apply it later.
 */

function defaultSettings(at: string): Settings {
  return {
    id: 'settings',
    updatedAt: at,
    pinEnabled: false,
    weightUnit: 'kg',
    lengthUnit: 'cm',
    weekStartsOn: 1,
    waterStepMl: 250,
    appName: 'Gm2',
  }
}

/** A well-shaped, contentless AppData. Used by normalize() as its base. */
export function emptyData(): AppData {
  const at = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    people: [],
    targets: [],
    coaching: [],
    foods: [],
    mealSlots: [],
    mealOptions: [],
    exercises: [],
    dayTemplates: [],
    schedules: [],
    mealLogs: [],
    workoutSessions: [],
    bodyMetrics: [],
    waterEntries: [],
    stepLogs: [],
    settings: defaultSettings(at),
  }
}

export function seedData(): AppData {
  const at = new Date().toISOString()
  const from = todayKey()
  const meals = seedMealPlans(at)
  const splits = seedSplits(at)
  return {
    ...emptyData(),
    people: seedPeople(at),
    targets: seedTargets(at, from),
    coaching: seedCoaching(at),
    foods: seedFoods(at),
    exercises: seedExercises(at),
    mealSlots: meals.slots,
    mealOptions: meals.options,
    dayTemplates: splits.templates,
    schedules: splits.schedules,
  }
}

/**
 * Add the starter content for registries that are currently empty, leaving
 * everything else untouched.
 *
 * This exists because the app is being built in phases: a device that stored
 * its data before meal plans existed would otherwise show an empty Diet screen
 * with no way forward. It only ever fills a registry that has nothing in it, so
 * it cannot resurrect something deliberately deleted, and it never touches
 * logs.
 */
export function topUpSeed(data: AppData): AppData {
  const at = new Date().toISOString()
  const meals = seedMealPlans(at)
  const splits = seedSplits(at)
  const isEmpty = <T>(list: T[]) => list.length === 0
  return {
    ...data,
    people: isEmpty(data.people) ? seedPeople(at) : data.people,
    targets: isEmpty(data.targets) ? seedTargets(at, todayKey()) : data.targets,
    coaching: isEmpty(data.coaching) ? seedCoaching(at) : data.coaching,
    foods: isEmpty(data.foods) ? seedFoods(at) : data.foods,
    exercises: isEmpty(data.exercises) ? seedExercises(at) : data.exercises,
    mealSlots: isEmpty(data.mealSlots) ? meals.slots : data.mealSlots,
    mealOptions: isEmpty(data.mealOptions) ? meals.options : data.mealOptions,
    dayTemplates: isEmpty(data.dayTemplates) ? splits.templates : data.dayTemplates,
    schedules: isEmpty(data.schedules) ? splits.schedules : data.schedules,
  }
}

/** Which starter registries are missing, for the prompt in Setup. */
export function missingSeed(data: AppData): string[] {
  const missing: string[] = []
  if (data.people.length === 0) missing.push('people')
  if (data.foods.length === 0) missing.push('foods')
  if (data.exercises.length === 0) missing.push('exercises')
  if (data.mealSlots.length === 0) missing.push('meal plans')
  if (data.dayTemplates.length === 0) missing.push('workout splits')
  return missing
}
