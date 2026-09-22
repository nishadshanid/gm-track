import { useCallback, useState } from 'react'
import type { DateKey, LoggedItem, MealLog, Unit } from '../types'
import { ai } from '../services/ai'
import type { AiIntent } from '../services/ai'
import { store } from '../services/store'
import { useData } from './useData'
import { usePerson } from './usePerson'
import { live, mealLogsFor, selectable, sessionsFor } from '../services/selectors'
import { buildAiContext } from '../utils/aiContext'
import { resolveExercise, resolveFoodItems } from '../utils/aiResolve'
import type { ResolvedItem, UnresolvedItem } from '../utils/aiResolve'
import { runQuery } from '../utils/aiQuery'
import type { QueryAnswer, QueryMetric } from '../utils/aiQuery'
import { itemsMacros } from '../utils/macros'
import { uid } from '../utils/id'

/**
 * The AI turn: one sentence in, one reviewable draft out.
 *
 * Nothing here writes on the model's say-so. An intent becomes a draft, the
 * draft is rendered as a diff, and `apply` runs only when the person confirms —
 * the same shape as the coach's proposals.
 */

export interface MealDraft {
  kind: 'meal'
  slotName: string
  slotId?: string
  items: ResolvedItem[]
  unresolved: UnresolvedItem[]
  kcal: number
  proteinG: number
}

export interface SetsDraft {
  kind: 'sets'
  exerciseName: string
  exerciseId: string
  sets: { weightKg: number | null; reps: number; seconds?: number }[]
  timed: boolean
}

export interface BodyDraft {
  kind: 'body'
  weightKg?: number
  waistCm?: number
  hipCm?: number
}

export interface CounterDraft {
  kind: 'water' | 'steps'
  value: number
}

export interface AnswerDraft {
  kind: 'answer'
  answer: QueryAnswer
}

export interface NoteDraft {
  kind: 'note'
  message: string
}

export type Draft =
  | MealDraft
  | SetsDraft
  | BodyDraft
  | CounterDraft
  | AnswerDraft
  | NoteDraft

const VALID_METRICS: QueryMetric[] = [
  'kcal', 'protein', 'water', 'steps', 'weight', 'sets', 'sessions',
]

export function useAi(date: DateKey) {
  const data = useData()
  const { person } = usePerson()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const available = ai.available() && Boolean(person)

  const toDraft = useCallback(
    (intent: AiIntent): Draft => {
      if (!person) return { kind: 'note', message: 'No person selected.' }
      const foods = selectable(data.foods)
      const exercises = selectable(data.exercises)

      switch (intent.kind) {
        case 'log_meal': {
          const { items, unresolved } = resolveFoodItems(intent.items ?? [], foods)
          // Match the slot by name against this person's own slots; fall back
          // to the slot whose time is nearest, rather than guessing wrongly.
          const slots = selectable(data.mealSlots)
            .filter((s) => s.personId === person.id)
            .sort((a, b) => a.order - b.order)
          const named = intent.slot
            ? slots.find((s) => s.name.toLowerCase() === intent.slot!.toLowerCase())
            : undefined
          const slot = named ?? slots[0]

          const preview: LoggedItem[] = items.map((i) => ({
            id: 'preview',
            foodId: i.food.id,
            foodName: i.food.name,
            amount: i.amount,
            basisSnapshot: i.food.basis,
            conversionsSnapshot: i.food.conversions,
            updatedAt: '',
          }))
          const { total } = itemsMacros(preview)

          return {
            kind: 'meal',
            slotName: slot?.name ?? 'Meal',
            slotId: slot?.id,
            items,
            unresolved,
            kcal: total.kcal,
            proteinG: total.proteinG,
          }
        }

        case 'log_sets': {
          const match = resolveExercise(intent.exercise, exercises)
          if (!match) {
            return { kind: 'note', message: `No exercise called “${intent.exercise}” in your library.` }
          }
          const timed = match.item.mode === 'time'
          return {
            kind: 'sets',
            exerciseName: match.item.name,
            exerciseId: match.item.id,
            timed,
            sets: (intent.sets ?? []).map((s) => ({
              weightKg: typeof s.weightKg === 'number' ? s.weightKg : null,
              reps: Number(s.reps) || 0,
              seconds: s.seconds,
            })),
          }
        }

        case 'log_body':
          return {
            kind: 'body',
            weightKg: intent.weightKg,
            waistCm: intent.waistCm,
            hipCm: intent.hipCm,
          }

        case 'log_water':
          return { kind: 'water', value: intent.ml }

        case 'log_steps':
          return { kind: 'steps', value: intent.steps }

        case 'ask': {
          const metric = (VALID_METRICS as string[]).includes(intent.metric)
            ? (intent.metric as QueryMetric)
            : 'kcal'
          // Computed here, from the store. The result is never sent back.
          return { kind: 'answer', answer: runQuery(data, person.id, date, { metric, days: intent.days }) }
        }

        case 'skip_workout':
          return {
            kind: 'note',
            message: `Noted${intent.day ? ` for ${intent.day}` : ''}. Rest days are set in Setup → Gym → Week; nothing was changed automatically.`,
          }

        default:
          return { kind: 'note', message: intent.message }
      }
    },
    [data, person, date],
  )

  const send = useCallback(
    async (input: string) => {
      if (!person || !input.trim()) return
      setBusy(true)
      setError(null)
      setDraft(null)
      try {
        const ctx = buildAiContext(data, person, date)
        const intent = await ai.interpret(input.trim(), ctx)
        setDraft(toDraft(intent))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [person, data, date, toDraft],
  )

  /** Write the draft through the normal store actions. */
  const apply = useCallback(() => {
    if (!draft || !person) return
    const now = store.now()

    if (draft.kind === 'meal' && draft.items.length > 0) {
      const existing = mealLogsFor(data, person.id, date).find((l) => l.slotId === draft.slotId)
      const items: LoggedItem[] = draft.items.map((i) => ({
        id: uid(),
        foodId: i.food.id,
        foodName: i.food.name,
        amount: i.amount,
        basisSnapshot: { ...i.food.basis },
        conversionsSnapshot: i.food.conversions ? { ...i.food.conversions } : undefined,
        updatedAt: now,
      }))
      if (existing) {
        // Append rather than replace: the slot may already hold a logged option.
        store.update('mealLogs', existing.id, (live_) => ({
          ...live_,
          items: [...live_.items, ...items],
          status: 'eaten',
          manuallyEdited: true,
        }))
      } else {
        const log: MealLog = {
          id: uid(),
          updatedAt: '',
          personId: person.id,
          date,
          slotId: draft.slotId ?? 'ad-hoc',
          slotName: draft.slotName,
          items,
          status: 'eaten',
          manuallyEdited: true,
          loggedBy: person.id,
          createdAt: now,
        }
        store.upsert('mealLogs', log)
      }
    }

    if (draft.kind === 'sets' && draft.sets.length > 0) {
      const session = sessionsFor(data, person.id, date)[0]
      const entry = {
        id: uid(),
        exerciseId: draft.exerciseId,
        exerciseName: draft.exerciseName,
        scheme: { sets: draft.sets.length, repMin: 8, repMax: 12 },
        order: session ? session.entries.length : 0,
        updatedAt: now,
        sets: draft.sets.map((s, i) => ({
          id: uid(),
          index: i,
          weightKg: s.weightKg,
          reps: s.reps,
          seconds: s.seconds,
          kind: 'work' as const,
          done: true,
          updatedAt: now,
        })),
      }
      if (session) {
        store.update('workoutSessions', session.id, (live_) => ({
          ...live_,
          entries: [...live_.entries, entry],
        }))
      } else {
        store.upsert('workoutSessions', {
          id: uid(),
          updatedAt: '',
          personId: person.id,
          date,
          templateName: 'Logged by voice',
          entries: [entry],
          startedAt: now,
          loggedBy: person.id,
          createdAt: now,
        })
      }
    }

    if (draft.kind === 'body') {
      const existing = live(data.bodyMetrics).find(
        (m) => m.personId === person.id && m.date === date,
      )
      const patch = {
        weightKg: draft.weightKg,
        waistCm: draft.waistCm,
        hipCm: draft.hipCm,
      }
      // Only set what was actually said, so "waist 86" does not blank a weight.
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v != null))
      if (existing) {
        store.update('bodyMetrics', existing.id, (rec) => ({ ...rec, ...clean }))
      } else {
        store.upsert('bodyMetrics', {
          id: `${person.id}:${date}`,
          updatedAt: '',
          personId: person.id,
          date,
          ...clean,
        } as never)
      }
    }

    if (draft.kind === 'water') {
      store.upsert('waterEntries', {
        id: uid(),
        updatedAt: '',
        personId: person.id,
        date,
        ml: draft.value,
        at: new Date().toISOString(),
      })
    }

    if (draft.kind === 'steps') {
      const existing = live(data.stepLogs).find(
        (s) => s.personId === person.id && s.date === date,
      )
      if (existing) store.update('stepLogs', existing.id, (rec) => ({ ...rec, steps: draft.value }))
      else
        store.upsert('stepLogs', {
          id: `${person.id}:${date}`,
          updatedAt: '',
          personId: person.id,
          date,
          steps: draft.value,
        })
    }

    setDraft(null)
  }, [draft, person, data, date])

  const unitLabel = (u: Unit) => (u === 'piece' ? '' : ` ${u}`)

  return { available, busy, error, draft, send, apply, dismiss: () => setDraft(null), unitLabel }
}
