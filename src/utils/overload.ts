import type {
  CoachingRules,
  Exercise,
  ProgressionRules,
  SessionExercise,
  SetLog,
  WorkoutSession,
} from '../types'

/**
 * Progressive overload, derived — never stored.
 *
 * The source programme is explicit that this is the single most important rule:
 * don't repeat 40 kg × 10 every week. So the app's job is to put last session's
 * numbers in front of you and say what beating them looks like.
 *
 * Everything here reads the log. There is no "current working weight" field to
 * fall out of sync with what was actually lifted.
 */

export const DEFAULT_PROGRESSION: ProgressionRules = {
  rule: 'top-of-range-all-sets',
  incrementKgUpper: 2.5,
  incrementKgLower: 5,
}

const LOWER_BODY = ['quads', 'hamstrings', 'glutes', 'calves']

/** Only completed working sets count. Warm-ups and drop sets are not the set. */
export function workSets(entry: SessionExercise): SetLog[] {
  return entry.sets.filter((s) => !s.deletedAt && s.kind === 'work' && s.done)
}

/** Reps for a rep-based set, seconds for a timed one. */
function effort(set: SetLog, timed: boolean): number {
  return timed ? (set.seconds ?? 0) : set.reps
}

/**
 * Did every prescribed working set reach the top of the range?
 *
 * Both halves matter. Hitting 12,12,12 on a 3 × 8–12 earns the increase; doing
 * 12,12 of three prescribed sets does not, because two hard sets are not the
 * prescription. Without the length check, stopping early would read as success.
 */
export function hitTopOfRange(entry: SessionExercise, timed = false): boolean {
  const sets = workSets(entry)
  if (sets.length < entry.scheme.sets) return false
  return sets.every((s) => effort(s, timed) >= entry.scheme.repMax)
}

/** The heaviest completed working set, for "last time" display. */
export function topSet(entry: SessionExercise): SetLog | undefined {
  return workSets(entry).reduce<SetLog | undefined>((best, s) => {
    if (!best) return s
    const bw = best.weightKg ?? 0
    const sw = s.weightKg ?? 0
    if (sw > bw) return s
    if (sw === bw && s.reps > best.reps) return s
    return best
  }, undefined)
}

export interface PrevPerformance {
  session: WorkoutSession
  entry: SessionExercise
}

/**
 * The last time this person did this exercise, with sets that count.
 * `sessions` must be newest-first — see selectors.sessionHistoryFor.
 */
export function lastPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
  excludeSessionId?: string,
): PrevPerformance | undefined {
  for (const session of sessions) {
    if (session.id === excludeSessionId) continue
    const entry = session.entries.find((e) => e.exerciseId === exerciseId && !e.deletedAt)
    if (entry && workSets(entry).length > 0) return { session, entry }
  }
  return undefined
}

export type SuggestionKind = 'first-time' | 'add-load' | 'add-reps' | 'hold'

export interface Suggestion {
  kind: SuggestionKind
  /** Present only for 'add-load'. */
  deltaKg?: number
  targetKg?: number
  message: string
}

function increment(exercise: Exercise, rules: ProgressionRules): number {
  const lower = exercise.muscleGroups.some((g) => LOWER_BODY.includes(g))
  return lower ? rules.incrementKgLower : rules.incrementKgUpper
}

/**
 * What to aim for this session, given the last one.
 *
 * Load only goes up for exercises that carry load. A bodyweight exercise
 * progresses by reps, and a plank by seconds — suggesting "+2.5 kg" on a dead
 * bug would be noise, and on a pull-up it would be wrong until it is weighted.
 */
export function suggest(
  exercise: Exercise,
  scheme: { sets: number; repMin: number; repMax: number },
  prev: PrevPerformance | undefined,
  rules: ProgressionRules = DEFAULT_PROGRESSION,
): Suggestion {
  const timed = exercise.mode === 'time'
  const unit = timed ? 'sec' : 'reps'

  if (!prev) {
    return {
      kind: 'first-time',
      message: `First time logged. Pick a load you control for ${scheme.repMin}–${scheme.repMax} ${unit}, keeping 1–3 reps in reserve.`,
    }
  }

  const sets = workSets(prev.entry)
  const best = topSet(prev.entry)
  const carriesLoad = exercise.mode === 'weight-reps' || exercise.mode === 'weighted-bodyweight'
  const maxedOut = hitTopOfRange(prev.entry, timed)

  if (maxedOut && carriesLoad && best?.weightKg != null) {
    const delta = increment(exercise, rules)
    return {
      kind: 'add-load',
      deltaKg: delta,
      targetKg: best.weightKg + delta,
      message: `All ${sets.length} sets hit ${scheme.repMax} ${unit} at ${best.weightKg} kg. Go to ${
        best.weightKg + delta
      } kg and start again around ${scheme.repMin}.`,
    }
  }

  if (maxedOut) {
    // Nothing to load: progress the reps or the hold instead.
    return {
      kind: 'add-reps',
      message: `Top of the range on every set. Add ${unit} beyond ${scheme.repMax}, or make it harder.`,
    }
  }

  const done = sets.map((s) => effort(s, timed)).join(', ')
  const load = best?.weightKg != null ? ` at ${best.weightKg} kg` : ''
  return {
    kind: 'add-reps',
    message: `Last time: ${done}${load}. Beat it by a rep or two before adding load.`,
  }
}

/** A short "last time" line for the exercise card. */
export function formatPrev(prev: PrevPerformance | undefined, timed = false): string | undefined {
  if (!prev) return undefined
  const sets = workSets(prev.entry)
  if (sets.length === 0) return undefined
  const reps = sets.map((s) => (timed ? `${s.seconds ?? 0}s` : s.reps)).join(', ')
  const weight = sets[0]?.weightKg
  const sameWeight = sets.every((s) => s.weightKg === weight)
  if (weight == null) return reps
  return sameWeight ? `${weight} kg × ${reps}` : sets.map((s) => `${s.weightKg}×${s.reps}`).join(', ')
}

/** Coaching rules for a person, falling back to the documented defaults. */
export function progressionFor(rules: CoachingRules | undefined): ProgressionRules {
  return rules?.progression ?? DEFAULT_PROGRESSION
}
