import type { DateKey } from '../types'

/**
 * The ONLY place a DateKey is produced.
 *
 * `toISOString().slice(0, 10)` is banned in this codebase: it formats in UTC,
 * so in IST (+05:30) everything logged before 05:30 lands on the previous day.
 * A 6:30 AM wake-up meal — the first entry of his plan — would be filed
 * yesterday, every single morning.
 */
export function dateKey(d: Date = new Date()): DateKey {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): DateKey {
  return dateKey()
}

/** Parse a DateKey back to a local-midnight Date. */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export function diffDays(a: DateKey, b: DateKey): number {
  const ms = fromKey(a).getTime() - fromKey(b).getTime()
  return Math.round(ms / 86_400_000)
}

/** Local weekday, 0 = Sunday. */
export function weekdayOf(key: DateKey): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return fromKey(key).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
}

/** The `n` date keys ending at `key`, oldest first. */
export function lastNDays(key: DateKey, n: number): DateKey[] {
  return Array.from({ length: n }, (_, i) => addDays(key, i - (n - 1)))
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const dayName = (w: number) => DAY_NAMES[w] ?? ''
export const dayShort = (w: number) => (DAY_NAMES[w] ?? '').slice(0, 3)

export function friendlyDate(key: DateKey): string {
  const today = todayKey()
  if (key === today) return 'Today'
  if (key === addDays(today, -1)) return 'Yesterday'
  if (key === addDays(today, 1)) return 'Tomorrow'
  const d = fromKey(key)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
