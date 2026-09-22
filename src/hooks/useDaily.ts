import { useCallback, useMemo } from 'react'
import type { DateKey, Id, StepLog, WaterEntry } from '../types'
import { store } from '../services/store'
import { useData } from './useData'
import { live, mealLogsFor, sessionsFor, stepsFor, targetOn, waterMlFor } from '../services/selectors'
import { itemsMacros } from '../utils/macros'
import { streak } from '../utils/stats'
import { uid } from '../utils/id'

/**
 * A person's day at a glance: macros, water, steps, workout.
 *
 * Used by the Today screen for both people at once, so it takes an explicit
 * personId rather than reading the active person.
 */
export function useDaily(personId: Id | undefined, date: DateKey) {
  const data = useData()

  const macros = useMemo(() => {
    if (!personId) return itemsMacros([])
    return itemsMacros(mealLogsFor(data, personId, date).flatMap((l) => l.items))
  }, [data, personId, date])

  const waterMl = personId ? waterMlFor(data, personId, date) : 0
  const steps = personId ? stepsFor(data, personId, date) : undefined
  const target = personId ? targetOn(data, personId, date) : undefined
  const sessions = personId ? sessionsFor(data, personId, date) : []

  const mealsLogged = useMemo(() => {
    if (!personId) return { eaten: 0, total: 0 }
    const logs = mealLogsFor(data, personId, date)
    const slots = live(data.mealSlots).filter((s) => s.personId === personId && !s.archived)
    return {
      eaten: logs.filter((l) => l.status === 'eaten' && l.items.some((i) => !i.deletedAt)).length,
      total: slots.filter((s) => !s.optional).length,
    }
  }, [data, personId, date])

  /**
   * Water is appended, never incremented.
   *
   * Two "+250 ml" taps — from two phones, or two quick taps here — must both
   * survive. A single mutable number would lose one of them, and the merge
   * would have no way to tell that it had.
   */
  const addWater = useCallback(
    (ml: number) => {
      if (!personId || ml === 0) return
      const entry: WaterEntry = {
        id: uid(),
        updatedAt: '',
        personId,
        date,
        ml,
        at: new Date().toISOString(),
      }
      store.upsert('waterEntries', entry)
    },
    [personId, date],
  )

  /** Undo the most recent glass, rather than subtracting a phantom one. */
  const undoWater = useCallback(() => {
    if (!personId) return
    const latest = live(data.waterEntries)
      .filter((w) => w.personId === personId && w.date === date)
      .sort((a, b) => (a.at < b.at ? 1 : -1))[0]
    if (latest) store.remove('waterEntries', latest.id)
  }, [data, personId, date])

  /** Steps are typed once from a phone's health app, so a scalar is fine. */
  const setSteps = useCallback(
    (value: number) => {
      if (!personId) return
      const existing = live(data.stepLogs).find(
        (s) => s.personId === personId && s.date === date,
      )
      if (existing) {
        store.update('stepLogs', existing.id, (rec) => ({ ...rec, steps: value }))
        return
      }
      const created: StepLog = {
        id: `${personId}:${date}`,
        updatedAt: '',
        personId,
        date,
        steps: value,
      }
      store.upsert('stepLogs', created)
    },
    [data, personId, date],
  )

  /** Consecutive days with anything logged at all. */
  const loggedStreak = useMemo(() => {
    if (!personId) return 0
    return streak(date, (d) => {
      if (mealLogsFor(data, personId, d).some((l) => l.items.some((i) => !i.deletedAt))) return true
      if (sessionsFor(data, personId, d).length > 0) return true
      if (waterMlFor(data, personId, d) > 0) return true
      return false
    })
  }, [data, personId, date])

  return {
    macros,
    waterMl,
    steps,
    target,
    sessions,
    mealsLogged,
    loggedStreak,
    addWater,
    undoWater,
    setSteps,
  }
}
