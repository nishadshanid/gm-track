import type {
  AppData,
  DateKey,
  Id,
  MealLog,
  Person,
  Rec,
  TargetProfile,
  WorkoutSession,
} from '../types'

/**
 * Read helpers over the flat collections.
 *
 * The collections are flat and id-keyed because that makes the merge one
 * generic routine and date-range queries one filter. The cost is lookups, and
 * that is paid here: the indexes are memoised on snapshot identity, so they
 * rebuild once per change rather than once per render.
 */

/** Everything alive — tombstones are storage's business, not the UI's. */
export function live<T extends Rec>(list: T[]): T[] {
  return list.filter((r) => !r.deletedAt)
}

/** Alive and not archived — what a picker should offer. */
export function selectable<T extends Rec & { archived?: boolean }>(list: T[]): T[] {
  return list.filter((r) => !r.deletedAt && !r.archived)
}

/** Alive, including archived — what history needs to resolve a reference. */
export function byId<T extends Rec>(list: T[], id: Id | null | undefined): T | undefined {
  if (!id) return undefined
  return list.find((r) => r.id === id && !r.deletedAt)
}

interface Indexes {
  mealLogsByPersonDate: Map<string, MealLog[]>
  sessionsByPersonDate: Map<string, WorkoutSession[]>
  sessionsByPersonExercise: Map<string, WorkoutSession[]>
}

let cachedFor: AppData | null = null
let cached: Indexes | null = null

const pd = (personId: Id, date: DateKey) => `${personId}|${date}`

function build(data: AppData): Indexes {
  const mealLogsByPersonDate = new Map<string, MealLog[]>()
  for (const log of live(data.mealLogs)) {
    const k = pd(log.personId, log.date)
    const list = mealLogsByPersonDate.get(k)
    if (list) list.push(log)
    else mealLogsByPersonDate.set(k, [log])
  }

  const sessionsByPersonDate = new Map<string, WorkoutSession[]>()
  const sessionsByPersonExercise = new Map<string, WorkoutSession[]>()
  for (const s of live(data.workoutSessions)) {
    const k = pd(s.personId, s.date)
    const list = sessionsByPersonDate.get(k)
    if (list) list.push(s)
    else sessionsByPersonDate.set(k, [s])

    for (const entry of s.entries) {
      if (entry.deletedAt) continue
      const ek = `${s.personId}|${entry.exerciseId}`
      const elist = sessionsByPersonExercise.get(ek)
      if (elist) elist.push(s)
      else sessionsByPersonExercise.set(ek, [s])
    }
  }
  // Newest first, so "the last time I did this" is index 0.
  for (const list of sessionsByPersonExercise.values()) {
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }

  return { mealLogsByPersonDate, sessionsByPersonDate, sessionsByPersonExercise }
}

export function indexes(data: AppData): Indexes {
  if (cachedFor !== data || !cached) {
    cached = build(data)
    cachedFor = data
  }
  return cached
}

export function peopleInOrder(data: AppData): Person[] {
  return selectable(data.people).sort((a, b) => a.order - b.order)
}

export function mealLogsFor(data: AppData, personId: Id, date: DateKey): MealLog[] {
  return indexes(data).mealLogsByPersonDate.get(pd(personId, date)) ?? []
}

export function sessionsFor(data: AppData, personId: Id, date: DateKey): WorkoutSession[] {
  return indexes(data).sessionsByPersonDate.get(pd(personId, date)) ?? []
}

/** Past sessions containing this exercise, newest first. */
export function sessionHistoryFor(data: AppData, personId: Id, exerciseId: Id): WorkoutSession[] {
  return indexes(data).sessionsByPersonExercise.get(`${personId}|${exerciseId}`) ?? []
}

/**
 * The target profile in force on a given date — the latest one whose
 * `effectiveFrom` is on or before it. This is why targets are a history: a day
 * logged in August is still judged against August's numbers after September's
 * adjustment.
 */
export function targetOn(
  data: AppData,
  personId: Id,
  date: DateKey,
): TargetProfile | undefined {
  return live(data.targets)
    .filter((t) => t.personId === personId && t.effectiveFrom <= date)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]
}

export function waterMlFor(data: AppData, personId: Id, date: DateKey): number {
  return live(data.waterEntries)
    .filter((w) => w.personId === personId && w.date === date)
    .reduce((sum, w) => sum + w.ml, 0)
}

export function stepsFor(data: AppData, personId: Id, date: DateKey): number | undefined {
  return live(data.stepLogs).find((s) => s.personId === personId && s.date === date)?.steps
}

export function metricFor(data: AppData, personId: Id, date: DateKey) {
  return live(data.bodyMetrics).find((m) => m.personId === personId && m.date === date)
}
