import type { BodyMetric, DateKey } from '../types'
import { addDays, diffDays } from './date.ts'

/**
 * Weight trend statistics.
 *
 * The source plan is explicit about the method: weigh 3–7 mornings a week under
 * similar conditions, take the weekly average, and compare averages. Day-to-day
 * scale noise from food, salt and water is larger than a week's real change, so
 * comparing the latest reading to the previous one produces confident nonsense.
 *
 * Every function here refuses to answer when it has too little data. Returning
 * "not enough data" is a real answer; inventing a rate from two readings is not.
 */

export interface Reading {
  date: DateKey
  value: number
}

export interface WindowStat {
  mean: number
  count: number
  from: DateKey
  to: DateKey
  min: number
  max: number
}

/** Pull one numeric field out of the metric log, newest last. */
export function readingsOf(
  metrics: BodyMetric[],
  field: 'weightKg' | 'waistCm' | 'hipCm',
): Reading[] {
  return metrics
    .filter((m) => !m.deletedAt && typeof m[field] === 'number')
    .map((m) => ({ date: m.date, value: m[field] as number }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Mean of every reading in the `days`-day window ending at `end`, inclusive. */
export function windowMean(readings: Reading[], end: DateKey, days: number): WindowStat | null {
  const from = addDays(end, -(days - 1))
  const inWindow = readings.filter((r) => r.date >= from && r.date <= end)
  if (inWindow.length === 0) return null
  const values = inWindow.map((r) => r.value)
  return {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    count: values.length,
    from,
    to: end,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

export type TrendStatus = 'ok' | 'not-enough-data'

export interface Trend {
  status: TrendStatus
  /** Signed change per week. Positive is gaining. */
  kgPerWeek?: number
  current?: WindowStat
  previous?: WindowStat
  weeksApart?: number
  /** Plain-language reason when the status is not-enough-data. */
  reason?: string
}

/**
 * Rate of change in kg/week, from one weekly average to another.
 *
 * Both windows must carry at least `minReadings`, and they are compared as
 * averages — never as single readings. `weeksApart` of 3 means "this week's
 * average against the average three weeks ago", which is the window the plan
 * uses before deciding to change anything.
 */
export function weeklyRate(
  readings: Reading[],
  end: DateKey,
  weeksApart: number,
  minReadings = 3,
): Trend {
  const current = windowMean(readings, end, 7)
  if (!current || current.count < minReadings) {
    const have = current?.count ?? 0
    return {
      status: 'not-enough-data',
      current: current ?? undefined,
      reason: `${have} of ${minReadings} weigh-ins this week. Keep logging.`,
    }
  }

  const previousEnd = addDays(end, -7 * weeksApart)
  const previous = windowMean(readings, previousEnd, 7)
  if (!previous || previous.count < minReadings) {
    return {
      status: 'not-enough-data',
      current,
      previous: previous ?? undefined,
      reason: `Not enough weigh-ins ${weeksApart} ${
        weeksApart === 1 ? 'week' : 'weeks'
      } ago to compare against yet.`,
    }
  }

  // Use the real gap between window ends, so a partially filled history still
  // produces an honest per-week figure.
  const days = diffDays(current.to, previous.to)
  const weeks = days / 7
  return {
    status: 'ok',
    kgPerWeek: weeks > 0 ? (current.mean - previous.mean) / weeks : 0,
    current,
    previous,
    weeksApart: weeks,
  }
}

/**
 * Trailing means for a series of consecutive days — the line drawn on the
 * chart. A day with no reading in its window yields null rather than a gap
 * filled by the last known value.
 */
export function rollingMeans(
  readings: Reading[],
  end: DateKey,
  days: number,
  window = 7,
): { date: DateKey; mean: number | null }[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(end, i - (days - 1))
    const stat = windowMean(readings, date, window)
    return { date, mean: stat ? stat.mean : null }
  })
}

/** Least-squares slope in units per week, for the chart's direction of travel. */
export function slopePerWeek(readings: Reading[], end: DateKey, days: number): number | null {
  const from = addDays(end, -(days - 1))
  const pts = readings
    .filter((r) => r.date >= from && r.date <= end)
    .map((r) => ({ x: diffDays(r.date, from), y: r.value }))
  if (pts.length < 2) return null
  const n = pts.length
  const sx = pts.reduce((a, p) => a + p.x, 0)
  const sy = pts.reduce((a, p) => a + p.y, 0)
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0)
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  return ((n * sxy - sx * sy) / denom) * 7
}

/** Where a rate sits against a target band. */
export type BandPosition = 'below' | 'inside' | 'above'

export function positionIn(rate: number, band: { min: number; max: number }): BandPosition {
  if (rate < band.min) return 'below'
  if (rate > band.max) return 'above'
  return 'inside'
}

/** Consecutive days up to and including `end` that satisfy `logged`. */
export function streak(end: DateKey, logged: (date: DateKey) => boolean, max = 60): number {
  let n = 0
  for (let i = 0; i < max; i++) {
    if (!logged(addDays(end, -i))) break
    n++
  }
  return n
}
