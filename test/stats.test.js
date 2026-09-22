import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  readingsOf,
  windowMean,
  weeklyRate,
  rollingMeans,
  slopePerWeek,
  positionIn,
  streak,
} from '../src/utils/stats.ts'

const metric = (date, weightKg, extra = {}) => ({
  id: date,
  updatedAt: '',
  personId: 'p-him',
  date,
  weightKg,
  ...extra,
})

/** Daily weights ending 2026-09-22, noisy around a rising trend. */
function series(start, days, startWeight, perDay, noise = [0]) {
  const out = []
  for (let i = 0; i < days; i++) {
    const d = new Date(2026, 8, 22)
    d.setDate(d.getDate() - (days - 1 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
    out.push(metric(key, startWeight + perDay * i + noise[i % noise.length]))
  }
  return out
}

test('readingsOf skips missing fields, tombstones, and sorts oldest first', () => {
  const metrics = [
    metric('2026-09-20', 70),
    metric('2026-09-18', undefined, { waistCm: 80 }),
    metric('2026-09-19', 71, { deletedAt: '2026-09-19T00:00:00Z' }),
    metric('2026-09-17', 69),
  ]
  assert.deepEqual(
    readingsOf(metrics, 'weightKg').map((r) => r.date),
    ['2026-09-17', '2026-09-20'],
  )
  assert.equal(readingsOf(metrics, 'waistCm').length, 1)
})

test('windowMean includes both ends of the window', () => {
  const r = readingsOf([metric('2026-09-22', 70), metric('2026-09-16', 60)], 'weightKg')
  const w = windowMean(r, '2026-09-22', 7)
  // 09-16 .. 09-22 inclusive is 7 days, so both readings count.
  assert.equal(w.count, 2)
  assert.equal(w.mean, 65)
  assert.equal(w.min, 60)
  assert.equal(w.max, 70)
})

test('windowMean returns null with nothing in range', () => {
  const r = readingsOf([metric('2026-01-01', 70)], 'weightKg')
  assert.equal(windowMean(r, '2026-09-22', 7), null)
})

test('two readings in a week is not enough to state a rate', () => {
  const r = readingsOf([metric('2026-09-22', 70), metric('2026-09-21', 70.2)], 'weightKg')
  const t = weeklyRate(r, '2026-09-22', 3)
  assert.equal(t.status, 'not-enough-data')
  assert.match(t.reason, /2 of 3 weigh-ins/)
  assert.equal(t.kgPerWeek, undefined)
})

test('enough this week but no history is also not enough', () => {
  const r = readingsOf(series('', 5, 70, 0.05), 'weightKg')
  const t = weeklyRate(r, '2026-09-22', 3)
  assert.equal(t.status, 'not-enough-data')
  assert.match(t.reason, /3 weeks ago/)
})

test('a genuine gain reports a positive weekly rate from averages', () => {
  // 28 days rising 0.05 kg/day = 0.35 kg/week.
  const r = readingsOf(series('', 28, 68, 0.05), 'weightKg')
  const t = weeklyRate(r, '2026-09-22', 3)
  assert.equal(t.status, 'ok')
  assert.equal(Math.round(t.kgPerWeek * 100) / 100, 0.35)
  assert.equal(t.weeksApart, 3)
  assert.equal(t.current.count, 7)
  assert.equal(t.previous.count, 7)
})

test('daily noise does not swamp the weekly comparison', () => {
  // Flat underlying weight with +/-0.8 kg daily swings must read as ~0.
  const r = readingsOf(series('', 28, 64, 0, [0.8, -0.8, 0.3, -0.5, 0.6, -0.4, 0]), 'weightKg')
  const t = weeklyRate(r, '2026-09-22', 3)
  assert.equal(t.status, 'ok')
  assert.ok(Math.abs(t.kgPerWeek) < 0.05, `expected ~0, got ${t.kgPerWeek}`)
})

test('comparing last reading to last reading would have been wrong', () => {
  // Same flat series: the raw endpoints differ by a lot more than the trend.
  const r = readingsOf(series('', 28, 64, 0, [0.8, -0.8, 0.3, -0.5, 0.6, -0.4, 0]), 'weightKg')
  // A week apart, where the daily noise happens to swing the other way.
  const naive = r[r.length - 1].value - r[r.length - 7].value
  assert.ok(Math.abs(naive) > 0.5)
  assert.ok(Math.abs(weeklyRate(r, '2026-09-22', 3).kgPerWeek) < 0.05)
})

test('a loss reports a negative rate', () => {
  const r = readingsOf(series('', 28, 66, -0.06), 'weightKg')
  const t = weeklyRate(r, '2026-09-22', 3)
  assert.ok(t.kgPerWeek < 0)
  assert.equal(Math.round(t.kgPerWeek * 100) / 100, -0.42)
})

test('gaps in the history still produce an honest per-week figure', () => {
  const all = series('', 28, 68, 0.05)
  // Drop the middle fortnight entirely; the two windows still have 7 each.
  const sparse = all.filter((m) => m.date <= '2026-09-01' || m.date >= '2026-09-16')
  const t = weeklyRate(readingsOf(sparse, 'weightKg'), '2026-09-22', 3)
  assert.equal(t.status, 'ok')
  assert.equal(Math.round(t.kgPerWeek * 100) / 100, 0.35)
})

test('rollingMeans leaves a null where a window has no readings', () => {
  const r = readingsOf([metric('2026-09-22', 70)], 'weightKg')
  const line = rollingMeans(r, '2026-09-22', 14)
  assert.equal(line.length, 14)
  assert.equal(line[0].mean, null)
  assert.equal(line[13].mean, 70)
})

test('slopePerWeek needs two points and reports per-week units', () => {
  assert.equal(slopePerWeek(readingsOf([metric('2026-09-22', 70)], 'weightKg'), '2026-09-22', 14), null)
  const r = readingsOf(series('', 14, 68, 0.1), 'weightKg')
  assert.equal(Math.round(slopePerWeek(r, '2026-09-22', 14) * 100) / 100, 0.7)
})

test('positionIn places a rate against the target band', () => {
  const gain = { min: 0.25, max: 0.5 }
  assert.equal(positionIn(0.1, gain), 'below')
  assert.equal(positionIn(0.35, gain), 'inside')
  assert.equal(positionIn(0.9, gain), 'above')
  // A loss band is negative: -0.7 is faster than intended, so it is 'below'.
  const loss = { min: -0.5, max: -0.2 }
  assert.equal(positionIn(-0.7, loss), 'below')
  assert.equal(positionIn(-0.3, loss), 'inside')
  assert.equal(positionIn(0.1, loss), 'above')
})

test('streak counts back from today and stops at the first gap', () => {
  const logged = new Set(['2026-09-22', '2026-09-21', '2026-09-20', '2026-09-18'])
  assert.equal(streak('2026-09-22', (d) => logged.has(d)), 3)
  assert.equal(streak('2026-09-19', (d) => logged.has(d)), 0)
})
