import { useCallback, useMemo } from 'react'
import type { DateKey, TargetProfile } from '../types'
import { store } from '../services/store'
import { useData } from './useData'
import { usePerson } from './usePerson'
import { live, mealLogsFor, targetOn } from '../services/selectors'
import { itemsMacros } from '../utils/macros'
import { readingsOf } from '../utils/stats'
import { evaluate } from '../utils/coach'
import type { DayIntake } from '../utils/coach'
import { lastNDays } from '../utils/date'
import { uid } from '../utils/id'

/** Assembles the coach's inputs from the store and applies its proposals. */
export function useCoach(date: DateKey, window = 14) {
  const data = useData()
  const { person } = usePerson()
  const personId = person?.id

  const rules = useMemo(
    () => live(data.coaching).find((c) => c.personId === personId),
    [data.coaching, personId],
  )
  const target = personId ? targetOn(data, personId, date) : undefined

  const metrics = useMemo(
    () => live(data.bodyMetrics).filter((m) => m.personId === personId),
    [data.bodyMetrics, personId],
  )

  const intake = useMemo<DayIntake[]>(() => {
    if (!personId) return []
    return lastNDays(date, window).map((day) => {
      const logs = mealLogsFor(data, personId, day)
      const items = logs.flatMap((l) => l.items)
      const { total, incomplete } = itemsMacros(items)
      return {
        date: day,
        kcal: total.kcal,
        proteinG: total.proteinG,
        complete: !incomplete,
        logged: items.some((i) => !i.deletedAt),
      }
    })
  }, [data, personId, date, window])

  const steps = useMemo(
    () =>
      live(data.stepLogs)
        .filter((s) => s.personId === personId)
        .map((s) => ({ date: s.date, value: s.steps })),
    [data.stepLogs, personId],
  )

  const advice = useMemo(() => {
    if (!rules || !target) return []
    return evaluate({
      asOf: date,
      rules,
      target,
      weights: readingsOf(metrics, 'weightKg'),
      waists: readingsOf(metrics, 'waistCm'),
      intake,
      steps,
    })
  }, [rules, target, date, metrics, intake, steps])

  /**
   * Write the adjustment as a NEW target effective today, so a day logged last
   * month is still judged against the target it was logged under. Applying
   * twice in one day replaces that day's profile rather than stacking.
   */
  const applyAdjustment = useCallback(
    (delta: { kcalDelta?: number; stepsDelta?: number }) => {
      if (!person || !target) return
      const existingToday = live(data.targets).find(
        (t) => t.personId === person.id && t.effectiveFrom === date,
      )
      const k = delta.kcalDelta ?? 0
      const next: TargetProfile = {
        ...target,
        id: existingToday?.id ?? uid(),
        updatedAt: '',
        effectiveFrom: date,
        kcal: {
          min: Math.max(0, target.kcal.min + k),
          max: Math.max(0, target.kcal.max + k),
        },
        steps: Math.max(0, target.steps + (delta.stepsDelta ?? 0)),
        note: k
          ? `Adjusted by ${k > 0 ? '+' : ''}${k} kcal from the weight trend.`
          : `Step target raised from the weight trend.`,
      }
      store.upsert('targets', next)
    },
    [person, target, data.targets, date],
  )

  return { person, rules, target, advice, intake, applyAdjustment }
}
