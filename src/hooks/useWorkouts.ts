import { useCallback, useMemo } from 'react'
import type {
  DateKey,
  Exercise,
  Id,
  SessionExercise,
  SetKind,
  SetLog,
  WorkoutDayTemplate,
  WorkoutSession,
} from '../types'
import { store } from '../services/store'
import { useData } from './useData'
import { usePerson } from './usePerson'
import {
  byId,
  live,
  selectable,
  sessionHistoryFor,
  sessionsFor,
} from '../services/selectors'
import { lastPerformance, progressionFor, suggest, topSet, workSets } from '../utils/overload'
import { weekdayOf } from '../utils/date'
import { uid } from '../utils/id'

/**
 * Workout logging for one person on one day.
 *
 * A session snapshots the template's name and every exercise's name and target
 * scheme at the moment it starts. Editing the template next month must not
 * rewrite what was actually done — and swapping an exercise mid-session has to
 * work without touching the template at all.
 */

function newSet(index: number, at: string, prefill?: SetLog | undefined): SetLog {
  return {
    id: uid(),
    index,
    // Load is prefilled from last time — the whole point is to walk in knowing
    // what you lifted rather than guessing. Reps are NOT: they are the outcome,
    // and a prefilled 12 that nobody edited would be recorded as twelve reps
    // that never happened. The "last time" line shows the number to beat, and
    // when the load goes up the reps are supposed to drop anyway.
    weightKg: prefill?.weightKg ?? null,
    reps: 0,
    kind: 'work',
    done: false,
    updatedAt: at,
  }
}

export interface ExerciseView {
  entry: SessionExercise
  exercise: Exercise | undefined
  timed: boolean
  prev: ReturnType<typeof lastPerformance>
  suggestion: ReturnType<typeof suggest> | undefined
  doneSets: number
}

export function useWorkouts(date: DateKey) {
  const data = useData()
  const { person } = usePerson()
  const personId = person?.id
  const at = () => store.now()

  const exercises = data.exercises
  const templates = useMemo(
    () =>
      selectable(data.dayTemplates)
        .filter((t) => t.personId === personId)
        .sort((a, b) => a.order - b.order),
    [data.dayTemplates, personId],
  )

  const schedule = useMemo(
    () => live(data.schedules).find((s) => s.personId === personId),
    [data.schedules, personId],
  )

  /** What the week plans for this date — a template, an explicit rest, or nothing. */
  const scheduled = useMemo(() => {
    if (!schedule) return { kind: 'none' as const }
    const entry = schedule.days[weekdayOf(date)]
    if (entry === 'rest') return { kind: 'rest' as const }
    if (!entry) return { kind: 'none' as const }
    const template = templates.find((t) => t.id === entry)
    return template ? { kind: 'template' as const, template } : { kind: 'none' as const }
  }, [schedule, date, templates])

  const session = useMemo(
    () => (personId ? sessionsFor(data, personId, date)[0] : undefined),
    [data, personId, date],
  )

  const rules = useMemo(
    () => live(data.coaching).find((c) => c.personId === personId),
    [data.coaching, personId],
  )

  /** Per-exercise view: target, last time, and what beating it looks like. */
  const view = useMemo<ExerciseView[]>(() => {
    if (!session || !personId) return []
    return session.entries
      .filter((e) => !e.deletedAt)
      .sort((a, b) => a.order - b.order)
      .map((entry) => {
        const exercise = byId(exercises, entry.exerciseId)
        const history = sessionHistoryFor(data, personId, entry.exerciseId)
        const prev = lastPerformance(history, entry.exerciseId, session.id)
        return {
          entry,
          exercise,
          timed: exercise?.mode === 'time',
          prev,
          suggestion: exercise
            ? suggest(exercise, entry.scheme, prev, progressionFor(rules))
            : undefined,
          doneSets: workSets(entry).length,
        }
      })
  }, [session, personId, data, exercises, rules])

  /** Build a session from a template, prefilled from the last time each was done. */
  const startSession = useCallback(
    (template?: WorkoutDayTemplate, title?: string) => {
      if (!person) return undefined
      const now = at()

      const entries: SessionExercise[] = (template?.blocks ?? [])
        .filter((b) => !b.optional)
        .sort((a, b) => a.order - b.order)
        .map((block, order) => {
          const exercise = byId(exercises, block.exerciseId)
          const prev = lastPerformance(
            sessionHistoryFor(data, person.id, block.exerciseId),
            block.exerciseId,
          )
          const best = prev ? topSet(prev.entry) : undefined
          return {
            id: uid(),
            exerciseId: block.exerciseId,
            // Snapshot: renaming or archiving the exercise later must not
            // rewrite this session.
            exerciseName: exercise?.name ?? 'Exercise',
            scheme: { ...block.scheme },
            order,
            sets: Array.from({ length: block.scheme.sets }, (_, i) => newSet(i, now, best)),
            note: block.note,
            updatedAt: now,
          }
        })

      const created: WorkoutSession = {
        id: uid(),
        updatedAt: '',
        personId: person.id,
        date,
        templateId: template?.id,
        templateName: template?.name ?? title ?? 'Workout',
        entries,
        startedAt: now,
        loggedBy: person.id,
        createdAt: now,
      }
      store.upsert('workoutSessions', created)
      return created
    },
    [person, exercises, data, date],
  )

  /**
   * Every mutation below goes through `store.update`, which reads the session
   * as currently stored rather than as captured by this render. Ticking three
   * sets in quick succession happens faster than React re-renders, and a
   * closure-based update would lose the first two.
   */
  const mapEntry = useCallback(
    (s: WorkoutSession, entryId: Id, fn: (e: SessionExercise) => SessionExercise) => {
      const now = at()
      store.update('workoutSessions', s.id, (live) => ({
        ...live,
        entries: live.entries.map((e) => (e.id === entryId ? { ...fn(e), updatedAt: now } : e)),
      }))
    },
    [],
  )

  const setSet = useCallback(
    (s: WorkoutSession, entryId: Id, setId: Id, patch: Partial<SetLog>) => {
      const now = at()
      mapEntry(s, entryId, (e) => ({
        ...e,
        // Set-level stamp: two phones can log into one session, and the merge
        // resolves per set rather than per whole session.
        sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch, updatedAt: now } : x)),
      }))
    },
    [mapEntry],
  )

  const addSet = useCallback(
    (s: WorkoutSession, entryId: Id, kind: SetKind = 'work') => {
      const now = at()
      mapEntry(s, entryId, (e) => {
        const alive = e.sets.filter((x) => !x.deletedAt)
        const last = alive[alive.length - 1]
        const fresh = newSet(alive.length, now, last)
        return { ...e, sets: [...e.sets, { ...fresh, kind }] }
      })
    },
    [mapEntry],
  )

  const removeSet = useCallback(
    (s: WorkoutSession, entryId: Id, setId: Id) => {
      const now = at()
      mapEntry(s, entryId, (e) => ({
        ...e,
        sets: e.sets.map((x) => (x.id === setId ? { ...x, deletedAt: now, updatedAt: now } : x)),
      }))
    },
    [mapEntry],
  )

  /** Add an exercise the template didn't include, or that replaces one. */
  const addExercise = useCallback(
    (s: WorkoutSession, exercise: Exercise) => {
      const now = at()
      const scheme = exercise.defaultScheme ?? { sets: 3, repMin: 8, repMax: 12 }
      const prev = personId
        ? lastPerformance(sessionHistoryFor(data, personId, exercise.id), exercise.id, s.id)
        : undefined
      const best = prev ? topSet(prev.entry) : undefined
      store.update('workoutSessions', s.id, (live) => ({
        ...live,
        entries: [
          ...live.entries,
          {
            id: uid(),
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            scheme,
            order: live.entries.length,
            sets: Array.from({ length: scheme.sets }, (_, i) => newSet(i, now, best)),
            updatedAt: now,
          },
        ],
      }))
    },
    [personId, data],
  )

  const removeExercise = useCallback((s: WorkoutSession, entryId: Id) => {
    const now = at()
    store.update('workoutSessions', s.id, (live) => ({
      ...live,
      entries: live.entries.map((e) =>
        e.id === entryId ? { ...e, deletedAt: now, updatedAt: now } : e,
      ),
    }))
  }, [])

  const finish = useCallback((s: WorkoutSession, cardioMinutes?: number) => {
    store.patch('workoutSessions', s.id, {
      finishedAt: at(),
      ...(cardioMinutes ? { cardioMinutes } : {}),
    })
  }, [])

  const reopen = useCallback((s: WorkoutSession) => {
    store.patch('workoutSessions', s.id, { finishedAt: undefined })
  }, [])

  const deleteSession = useCallback(
    (s: WorkoutSession) => store.remove('workoutSessions', s.id),
    [],
  )

  return {
    person,
    templates,
    scheduled,
    session,
    view,
    startSession,
    setSet,
    addSet,
    removeSet,
    addExercise,
    removeExercise,
    finish,
    reopen,
    deleteSession,
  }
}
