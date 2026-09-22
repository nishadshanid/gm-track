import type {
  AppData,
  LoggedItem,
  MealLog,
  Rec,
  SessionExercise,
  SetLog,
  WorkoutSession,
} from '../types'

/**
 * State-based merge of two snapshots.
 *
 * FTrack refetches on a conflict and re-PUTs its own copy, which silently
 * discards whatever the other device wrote. That is survivable for one fuel
 * entry a week; here two people log into the same session from two phones
 * standing in the same room, so the merge has to preserve both.
 *
 * The rules, in order:
 *
 *  1. An id present on only one side SURVIVES. This is the case FTrack
 *     destroys, and it is the common one — she logged her breakfast while he
 *     logged his.
 *  2. An id on both sides resolves to the higher `updatedAt`.
 *  3. Identical stamps break deterministically on `updatedBy` (a device id), so
 *     both devices reach the same answer without another round trip.
 *  4. A tombstone is an ordinary field competing on `updatedAt`. A delete wins
 *     only if it is newer than the edit it races, so deleting on one phone
 *     while editing on the other resolves by who acted last, in both
 *     directions.
 *
 * Two collections get a second level of the same rules, because one shared
 * record edited by two people is the normal case rather than the exception:
 * the sets inside a workout session, and the items inside a meal log.
 */

/** Which of two records is the survivor. Deterministic on both devices. */
function winner<T extends { updatedAt: string; updatedBy?: string }>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b
  // Same millisecond: fall back to a stable comparison of the device ids so
  // both sides independently choose the same record.
  const ua = a.updatedBy ?? ''
  const ub = b.updatedBy ?? ''
  if (ua !== ub) return ua > ub ? a : b
  return a
}

type SubRec = { id: string; updatedAt: string; deletedAt?: string }

/** Merge a nested array by id, using each element's own stamp. */
function mergeSub<T extends SubRec>(
  primary: T[],
  secondary: T[],
  deeper?: (a: T, b: T) => T,
): T[] {
  const out = new Map<string, T>()
  for (const rec of primary) out.set(rec.id, rec)
  for (const rec of secondary) {
    const existing = out.get(rec.id)
    if (!existing) {
      out.set(rec.id, rec)
      continue
    }
    const win = winner(existing, rec)
    out.set(rec.id, deeper ? deeper(existing, rec) : win)
  }
  return [...out.values()]
}

function mergeSets(a: SetLog[], b: SetLog[]): SetLog[] {
  return mergeSub(a, b).sort((x, y) => x.index - y.index)
}

function mergeEntries(a: SessionExercise[], b: SessionExercise[]): SessionExercise[] {
  return mergeSub(a, b, (x, y) => ({
    ...winner(x, y),
    // The scalar fields follow the newer entry, but the sets merge one by one:
    // he ticked set 2 while she ticked set 3 of the same exercise.
    sets: mergeSets(x.sets, y.sets),
  })).sort((x, y) => x.order - y.order)
}

function mergeSession(a: WorkoutSession, b: WorkoutSession): WorkoutSession {
  return { ...winner(a, b), entries: mergeEntries(a.entries, b.entries) }
}

function mergeItems(a: LoggedItem[], b: LoggedItem[]): LoggedItem[] {
  return mergeSub(a, b)
}

function mergeMealLog(a: MealLog, b: MealLog): MealLog {
  return { ...winner(a, b), items: mergeItems(a.items, b.items) }
}

/** Merge one flat collection. */
export function mergeCollection<T extends Rec>(
  remote: T[],
  local: T[],
  deeper?: (a: T, b: T) => T,
): T[] {
  const out = new Map<string, T>()
  for (const rec of remote) out.set(rec.id, rec)
  for (const rec of local) {
    const existing = out.get(rec.id)
    if (!existing) {
      // Present only locally — this is the write the other device has not seen.
      out.set(rec.id, rec)
      continue
    }
    out.set(rec.id, deeper ? deeper(existing, rec) : winner(existing, rec))
  }
  return [...out.values()]
}

export function mergeData(remote: AppData, local: AppData): AppData {
  return {
    schemaVersion: Math.max(remote.schemaVersion ?? 1, local.schemaVersion ?? 1),
    people: mergeCollection(remote.people, local.people),
    targets: mergeCollection(remote.targets, local.targets),
    coaching: mergeCollection(remote.coaching, local.coaching),
    foods: mergeCollection(remote.foods, local.foods),
    mealSlots: mergeCollection(remote.mealSlots, local.mealSlots),
    mealOptions: mergeCollection(remote.mealOptions, local.mealOptions),
    exercises: mergeCollection(remote.exercises, local.exercises),
    dayTemplates: mergeCollection(remote.dayTemplates, local.dayTemplates),
    schedules: mergeCollection(remote.schedules, local.schedules),
    mealLogs: mergeCollection(remote.mealLogs, local.mealLogs, mergeMealLog),
    workoutSessions: mergeCollection(remote.workoutSessions, local.workoutSessions, mergeSession),
    bodyMetrics: mergeCollection(remote.bodyMetrics, local.bodyMetrics),
    // Append-only events: a union is the whole merge, and it is conflict-free.
    waterEntries: mergeCollection(remote.waterEntries, local.waterEntries),
    stepLogs: mergeCollection(remote.stepLogs, local.stepLogs),
    settings: winner(remote.settings, local.settings),
  }
}

/** True when merging produced something different from the remote snapshot. */
export function differsFrom(merged: AppData, remote: AppData): boolean {
  return JSON.stringify(merged) !== JSON.stringify(remote)
}

/**
 * Drop tombstones older than `days`, so deleted records do not accumulate
 * forever. Safe only well past the window in which a device could still be
 * holding an older copy of the same record.
 */
export function purgeTombstones(data: AppData, olderThanDays = 60): AppData {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString()
  const keep = <T extends Rec>(list: T[]) =>
    list.filter((r) => !r.deletedAt || r.deletedAt > cutoff)
  return {
    ...data,
    people: keep(data.people),
    targets: keep(data.targets),
    coaching: keep(data.coaching),
    foods: keep(data.foods),
    mealSlots: keep(data.mealSlots),
    mealOptions: keep(data.mealOptions),
    exercises: keep(data.exercises),
    dayTemplates: keep(data.dayTemplates),
    schedules: keep(data.schedules),
    mealLogs: keep(data.mealLogs),
    workoutSessions: keep(data.workoutSessions),
    bodyMetrics: keep(data.bodyMetrics),
    waterEntries: keep(data.waterEntries),
    stepLogs: keep(data.stepLogs),
  }
}
