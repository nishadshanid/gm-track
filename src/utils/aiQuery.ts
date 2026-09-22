import type { AppData, DateKey, Id } from '../types'
import { live, mealLogsFor, sessionsFor, stepsFor, targetOn, waterMlFor } from '../services/selectors.ts'
import { itemsMacros } from './macros.ts'
import { readingsOf, weeklyRate, windowMean } from './stats.ts'
import { setsByMuscle } from './volume.ts'
import { workSets } from './overload.ts'
import { addDays, lastNDays } from './date.ts'
import { kg, litres } from './format.ts'

/**
 * The model writes the question; this answers it.
 *
 * "How much protein last week?" is compiled by the model into
 * `{ metric: 'protein', days: 7 }` — a query, not an answer. That spec is run
 * here, locally, against the store, and the result is rendered by the app. The
 * numbers never go back to the model, so asking about your own data does not
 * send your own data anywhere.
 *
 * Everything below reuses the same functions the screens use, so an answer here
 * and the figure on the Diet or Body screen cannot disagree.
 */

export type QueryMetric =
  | 'kcal'
  | 'protein'
  | 'water'
  | 'steps'
  | 'weight'
  | 'sets'
  | 'sessions'

export interface QuerySpec {
  metric: QueryMetric
  /** Window in days, ending today. 1 = today. */
  days: number
}

export interface QueryAnswer {
  headline: string
  detail?: string
  /** Days that actually carried data, so a thin answer says so. */
  basis: string
}

const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null

export function runQuery(
  data: AppData,
  personId: Id,
  today: DateKey,
  spec: QuerySpec,
): QueryAnswer {
  const days = Math.max(1, Math.min(365, Math.round(spec.days || 7)))
  const window = lastNDays(today, days)
  const label = days === 1 ? 'today' : `over the last ${days} days`

  switch (spec.metric) {
    case 'kcal':
    case 'protein': {
      const perDay = window
        .map((d) => {
          const items = mealLogsFor(data, personId, d).flatMap((l) => l.items)
          const logged = items.some((i) => !i.deletedAt)
          return logged ? itemsMacros(items).total : null
        })
        .filter((t): t is NonNullable<typeof t> => t !== null)

      if (perDay.length === 0) {
        return { headline: 'Nothing logged', basis: `No food logged ${label}.` }
      }
      const isKcal = spec.metric === 'kcal'
      const mean = avg(perDay.map((t) => (isKcal ? t.kcal : t.proteinG))) as number
      const target = targetOn(data, personId, today)
      const band = target ? (isKcal ? target.kcal : target.proteinG) : undefined
      return {
        headline: isKcal
          ? `${Math.round(mean)} kcal a day`
          : `${Math.round(mean)} g protein a day`,
        detail: band ? `Target ${band.min}–${band.max}.` : undefined,
        // Averaged over logged days only — an unlogged day is unknown, not zero.
        basis: `Averaged over ${perDay.length} logged ${perDay.length === 1 ? 'day' : 'days'} ${label}.`,
      }
    }

    case 'water': {
      const perDay = window.map((d) => waterMlFor(data, personId, d)).filter((ml) => ml > 0)
      if (perDay.length === 0) return { headline: 'Nothing logged', basis: `No water logged ${label}.` }
      return {
        headline: `${litres(avg(perDay) as number)} a day`,
        basis: `Averaged over ${perDay.length} ${perDay.length === 1 ? 'day' : 'days'} with water logged.`,
      }
    }

    case 'steps': {
      const perDay = window
        .map((d) => stepsFor(data, personId, d))
        .filter((s): s is number => typeof s === 'number')
      if (perDay.length === 0) return { headline: 'Nothing logged', basis: `No steps logged ${label}.` }
      return {
        headline: `${Math.round(avg(perDay) as number).toLocaleString()} steps a day`,
        basis: `Averaged over ${perDay.length} logged ${perDay.length === 1 ? 'day' : 'days'}.`,
      }
    }

    case 'weight': {
      const metrics = live(data.bodyMetrics).filter((m) => m.personId === personId)
      const weights = readingsOf(metrics, 'weightKg')
      const week = windowMean(weights, today, Math.max(7, days))
      if (!week) return { headline: 'Nothing logged', basis: `No weigh-ins ${label}.` }
      const rules = live(data.coaching).find((c) => c.personId === personId)
      const trend = weeklyRate(weights, today, rules?.lookbackWeeks ?? 3, rules?.minReadingsPerWeek ?? 3)
      return {
        headline: kg(week.mean),
        // Reuses the same guard the Body screen uses: no rate without enough data.
        detail:
          trend.kgPerWeek != null
            ? `${trend.kgPerWeek > 0 ? '+' : ''}${Math.round(trend.kgPerWeek * 100) / 100} kg/week`
            : trend.reason,
        basis: `Average of ${week.count} weigh-ins, ${week.from} to ${week.to}.`,
      }
    }

    case 'sets': {
      const sessions = live(data.workoutSessions).filter((s) => s.personId === personId)
      const volume = setsByMuscle(sessions, data.exercises, addDays(today, -(days - 1)), today)
      const entries = Object.entries(volume).sort((a, b) => b[1] - a[1])
      if (entries.length === 0) return { headline: 'Nothing logged', basis: `No sets logged ${label}.` }
      const total = entries.reduce((n, [, v]) => n + v, 0)
      return {
        headline: `${total} working sets`,
        detail: entries.map(([m, n]) => `${m} ${n}`).join(' · '),
        basis: `Counted against each exercise's primary muscle, ${label}.`,
      }
    }

    case 'sessions': {
      const all = window.flatMap((d) => sessionsFor(data, personId, d))
      if (all.length === 0) return { headline: 'Nothing logged', basis: `No sessions ${label}.` }
      const sets = all.reduce(
        (n, s) => n + s.entries.reduce((m, e) => m + workSets(e).length, 0),
        0,
      )
      return {
        headline: `${all.length} ${all.length === 1 ? 'session' : 'sessions'}`,
        detail: `${all.map((s) => s.templateName).join(', ')} · ${sets} working sets`,
        basis: `Logged ${label}.`,
      }
    }
  }
}
