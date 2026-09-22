import { useCallback, useMemo } from 'react'
import type { BodyMetric, DateKey } from '../types'
import { store } from '../services/store'
import { useData } from './useData'
import { usePerson } from './usePerson'
import { live, metricFor } from '../services/selectors'
import { readingsOf, rollingMeans, weeklyRate, windowMean } from '../utils/stats'
import { uid } from '../utils/id'

/**
 * Body metrics for one person.
 *
 * One record per person per date, so logging this morning's weight and this
 * evening's waist measurement writes to the same row rather than racing.
 */
export function useMetrics(date: DateKey) {
  const data = useData()
  const { person } = usePerson()
  const personId = person?.id

  const rules = useMemo(
    () => live(data.coaching).find((c) => c.personId === personId),
    [data.coaching, personId],
  )

  const metrics = useMemo(
    () =>
      live(data.bodyMetrics)
        .filter((m) => m.personId === personId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.bodyMetrics, personId],
  )

  const today = useMemo(
    () => (personId ? metricFor(data, personId, date) : undefined),
    [data, personId, date],
  )

  const weights = useMemo(() => readingsOf(metrics, 'weightKg'), [metrics])
  const waists = useMemo(() => readingsOf(metrics, 'waistCm'), [metrics])
  const hips = useMemo(() => readingsOf(metrics, 'hipCm'), [metrics])

  const lookback = rules?.lookbackWeeks ?? 3
  const minReadings = rules?.minReadingsPerWeek ?? 3

  const week = useMemo(() => windowMean(weights, date, 7), [weights, date])
  const trend = useMemo(
    () => weeklyRate(weights, date, lookback, minReadings),
    [weights, date, lookback, minReadings],
  )
  const waistTrend = useMemo(
    () => weeklyRate(waists, date, lookback, 1),
    [waists, date, lookback],
  )
  const line = useMemo(() => rollingMeans(weights, date, 42), [weights, date])

  /**
   * Write one field of today's row, creating the row if needed. A patch of
   * `undefined` clears the field, which is how a mistyped weight is removed
   * without deleting a waist measurement recorded the same day.
   */
  const set = useCallback(
    (patch: Partial<Pick<BodyMetric, 'weightKg' | 'waistCm' | 'hipCm' | 'note'>>) => {
      if (!person) return
      const existing = metricFor(data, person.id, date)
      if (existing) {
        store.update('bodyMetrics', existing.id, (rec) => ({ ...rec, ...patch }))
        return
      }
      const created: BodyMetric = {
        // Keyed by person and date so two devices creating "today" converge on
        // one row instead of two.
        id: `${person.id}:${date}`,
        updatedAt: '',
        personId: person.id,
        date,
        ...patch,
      }
      store.upsert('bodyMetrics', created)
    },
    [person, data, date],
  )

  const removeDay = useCallback(() => {
    if (today) store.remove('bodyMetrics', today.id)
  }, [today])

  const addAt = useCallback(
    (when: DateKey, patch: Partial<BodyMetric>) => {
      if (!person) return
      const existing = live(data.bodyMetrics).find(
        (m) => m.personId === person.id && m.date === when,
      )
      if (existing) {
        store.update('bodyMetrics', existing.id, (rec) => ({ ...rec, ...patch }))
        return
      }
      store.upsert('bodyMetrics', {
        id: uid(),
        updatedAt: '',
        personId: person.id,
        date: when,
        ...patch,
      } as BodyMetric)
    },
    [person, data],
  )

  return {
    person,
    rules,
    metrics,
    today,
    weights,
    waists,
    hips,
    week,
    trend,
    waistTrend,
    line,
    set,
    addAt,
    removeDay,
  }
}
