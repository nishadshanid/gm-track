import type { DateKey, Exercise, WorkoutSession } from '../types'
// Extension is explicit so `node --test` can resolve this at runtime; Node's
// TypeScript support does not do extensionless relative resolution, and Vite
// accepts either form. Type-only imports are erased, so they never need it.
import { workSets } from './overload.ts'

/**
 * Weekly working sets per muscle group.
 *
 * Counted the way the source programme counts: against the exercise's
 * *primary* muscle group only. The plan's "Chest: 11 working sets, Triceps: 5"
 * adds up only under that rule — bench press is chest volume, and the triceps
 * work it also does is not counted again as triceps. Spreading each set across
 * every listed group would inflate every number and make the plan's own
 * targets unreachable.
 */
export function setsByMuscle(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  from: DateKey,
  to: DateKey,
): Record<string, number> {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const out: Record<string, number> = {}

  for (const session of sessions) {
    if (session.deletedAt || session.date < from || session.date > to) continue
    for (const entry of session.entries) {
      if (entry.deletedAt) continue
      const exercise = byId.get(entry.exerciseId)
      const primary = exercise?.muscleGroups[0]
      if (!primary) continue
      out[primary] = (out[primary] ?? 0) + workSets(entry).length
    }
  }
  return out
}

/** Total load moved in a session — a rough session-to-session comparison. */
export function tonnage(session: WorkoutSession): number {
  let total = 0
  for (const entry of session.entries) {
    if (entry.deletedAt) continue
    for (const set of workSets(entry)) {
      total += (set.weightKg ?? 0) * set.reps
    }
  }
  return total
}
