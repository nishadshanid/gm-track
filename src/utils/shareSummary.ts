import type { AppData, DateKey, Person } from '../types'
import { live, mealLogsFor, sessionsFor, targetOn } from '../services/selectors.ts'
import { itemsMacros } from './macros.ts'
import { readingsOf, weeklyRate, windowMean } from './stats.ts'
import { workSets } from './overload.ts'
import { lastNDays } from './date.ts'

/**
 * A week in a paragraph, for sending to each other.
 *
 * Plain text rather than a rendered image: it pastes into any chat, needs no
 * extra dependency, and stays readable when it arrives. It reports only what
 * was logged — an unlogged day is reported as unlogged, never as a zero.
 */
export function weeklySummary(data: AppData, person: Person, asOf: DateKey): string {
  const days = lastNDays(asOf, 7)
  const target = targetOn(data, person.id, asOf)

  const intake = days.map((d) => {
    const items = mealLogsFor(data, person.id, d).flatMap((l) => l.items)
    const { total } = itemsMacros(items)
    return { d, kcal: total.kcal, proteinG: total.proteinG, logged: items.some((i) => !i.deletedAt) }
  })
  const logged = intake.filter((x) => x.logged)
  const avg = (pick: (x: (typeof logged)[number]) => number) =>
    logged.length ? Math.round(logged.reduce((a, x) => a + pick(x), 0) / logged.length) : null

  const sessions = days.flatMap((d) => sessionsFor(data, person.id, d))
  const setCount = sessions.reduce(
    (n, s) => n + s.entries.reduce((m, e) => m + workSets(e).length, 0),
    0,
  )

  const metrics = live(data.bodyMetrics).filter((m) => m.personId === person.id)
  const weights = readingsOf(metrics, 'weightKg')
  const week = windowMean(weights, asOf, 7)
  const rules = live(data.coaching).find((c) => c.personId === person.id)
  const trend = weeklyRate(weights, asOf, rules?.lookbackWeeks ?? 3, rules?.minReadingsPerWeek ?? 3)

  const lines: string[] = [`${person.emoji ?? ''} ${person.name} — last 7 days`.trim()]

  if (week) {
    lines.push(
      `Weight: ${Math.round(week.mean * 10) / 10} kg average (${week.count} weigh-ins)` +
        (trend.kgPerWeek != null
          ? `, ${trend.kgPerWeek > 0 ? '+' : ''}${Math.round(trend.kgPerWeek * 100) / 100} kg/week`
          : ''),
    )
  } else {
    lines.push('Weight: no weigh-ins this week')
  }

  const kcal = avg((x) => x.kcal)
  const protein = avg((x) => x.proteinG)
  lines.push(
    kcal != null
      ? `Food: ${kcal} kcal and ${protein} g protein on ${logged.length} logged ${
          logged.length === 1 ? 'day' : 'days'
        }` + (target ? ` (target ${target.kcal.min}–${target.kcal.max} kcal)` : '')
      : 'Food: nothing logged this week',
  )

  lines.push(
    sessions.length
      ? `Gym: ${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}, ${setCount} working sets — ${sessions
          .map((s) => s.templateName)
          .join(', ')}`
      : 'Gym: no sessions logged',
  )

  return lines.join('\n')
}

/** Share if the device supports it, otherwise copy. Returns what happened. */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text })
      return 'shared'
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
