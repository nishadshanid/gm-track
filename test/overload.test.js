import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  workSets,
  hitTopOfRange,
  topSet,
  lastPerformance,
  suggest,
  formatPrev,
} from '../src/utils/overload.ts'
import { setsByMuscle, tonnage } from '../src/utils/volume.ts'

const bench = {
  id: 'e-bench',
  updatedAt: '',
  name: 'Barbell bench press',
  muscleGroups: ['chest', 'triceps'],
  mode: 'weight-reps',
}
const squat = {
  id: 'e-squat',
  updatedAt: '',
  name: 'Squat',
  muscleGroups: ['quads', 'glutes'],
  mode: 'weight-reps',
}
const pullup = {
  id: 'e-pullup',
  updatedAt: '',
  name: 'Pull-up',
  muscleGroups: ['back'],
  mode: 'weighted-bodyweight',
}
const deadBug = {
  id: 'e-dead-bug',
  updatedAt: '',
  name: 'Dead bug',
  muscleGroups: ['abs'],
  mode: 'bodyweight-reps',
}
const plank = { id: 'e-plank', updatedAt: '', name: 'Plank', muscleGroups: ['abs'], mode: 'time' }

const SCHEME = { sets: 3, repMin: 8, repMax: 12 }

const set = (reps, weightKg = 40, extra = {}) => ({
  id: `s${Math.random()}`,
  index: 0,
  weightKg,
  reps,
  kind: 'work',
  done: true,
  updatedAt: '',
  ...extra,
})

const entry = (exerciseId, sets, scheme = SCHEME) => ({
  id: 'en1',
  exerciseId,
  exerciseName: exerciseId,
  scheme,
  order: 0,
  sets,
  updatedAt: '',
})

const session = (date, entries, id = 's1') => ({
  id,
  updatedAt: '',
  personId: 'p-him',
  date,
  templateName: 'Test',
  entries,
  loggedBy: 'p-him',
  createdAt: '',
})

// ── which sets count ───────────────────────────────────────────────────────

test('warm-ups, undone and deleted sets are not working sets', () => {
  const e = entry('e-bench', [
    set(12, 20, { kind: 'warmup' }),
    set(12, 40),
    set(12, 40, { done: false }),
    set(12, 40, { deletedAt: '2026-09-22T00:00:00Z' }),
  ])
  assert.equal(workSets(e).length, 1)
})

test('all sets at the top of the range earns the increase', () => {
  assert.equal(hitTopOfRange(entry('e-bench', [set(12), set(12), set(12)])), true)
})

test('one set short of the top does not', () => {
  assert.equal(hitTopOfRange(entry('e-bench', [set(12), set(12), set(11)])), false)
})

test('stopping early does not read as success', () => {
  // 12, 12 of a prescribed three sets is two hard sets, not the prescription.
  assert.equal(hitTopOfRange(entry('e-bench', [set(12), set(12)])), false)
})

test('exceeding the top of the range still counts', () => {
  assert.equal(hitTopOfRange(entry('e-bench', [set(14), set(13), set(12)])), true)
})

test('a timed exercise is judged in seconds', () => {
  const scheme = { sets: 3, repMin: 30, repMax: 60 }
  const hold = (seconds) => set(0, null, { seconds })
  assert.equal(hitTopOfRange(entry('e-plank', [hold(60), hold(60), hold(60)], scheme), true), true)
  assert.equal(hitTopOfRange(entry('e-plank', [hold(60), hold(45), hold(60)], scheme), true), false)
})

test('topSet prefers weight, then reps', () => {
  const e = entry('e-bench', [set(10, 40), set(8, 45), set(10, 45)])
  assert.equal(topSet(e).weightKg, 45)
  assert.equal(topSet(e).reps, 10)
})

// ── suggestions ────────────────────────────────────────────────────────────

test('a first-ever session suggests picking a controllable load', () => {
  const s = suggest(bench, SCHEME, undefined)
  assert.equal(s.kind, 'first-time')
  assert.match(s.message, /1–3 reps in reserve/)
})

test('maxing out a loaded lift adds load, upper body 2.5 kg', () => {
  const prev = { session: session('2026-09-15', []), entry: entry('e-bench', [set(12), set(12), set(12)]) }
  const s = suggest(bench, SCHEME, prev)
  assert.equal(s.kind, 'add-load')
  assert.equal(s.deltaKg, 2.5)
  assert.equal(s.targetKg, 42.5)
  assert.match(s.message, /42.5 kg/)
})

test('lower body gets the bigger jump', () => {
  const prev = {
    session: session('2026-09-15', []),
    entry: entry('e-squat', [set(12, 60), set(12, 60), set(12, 60)]),
  }
  const s = suggest(squat, SCHEME, prev)
  assert.equal(s.deltaKg, 5)
  assert.equal(s.targetKg, 65)
})

test('short of the top, it asks for reps and names last time', () => {
  const prev = {
    session: session('2026-09-15', []),
    entry: entry('e-bench', [set(8), set(8), set(7)]),
  }
  const s = suggest(bench, SCHEME, prev)
  assert.equal(s.kind, 'add-reps')
  assert.equal(s.deltaKg, undefined)
  assert.match(s.message, /8, 8, 7 at 40 kg/)
})

test('a bodyweight exercise never suggests adding load', () => {
  const prev = {
    session: session('2026-09-15', []),
    entry: entry('e-dead-bug', [set(12, null), set(12, null), set(12, null)]),
  }
  const s = suggest(deadBug, SCHEME, prev)
  assert.equal(s.kind, 'add-reps')
  assert.equal(s.deltaKg, undefined)
})

test('an unloaded pull-up progresses reps; a weighted one gains load', () => {
  const unloaded = {
    session: session('2026-09-15', []),
    entry: entry('e-pullup', [set(12, null), set(12, null), set(12, null)]),
  }
  assert.equal(suggest(pullup, SCHEME, unloaded).kind, 'add-reps')

  const weighted = {
    session: session('2026-09-15', []),
    entry: entry('e-pullup', [set(12, 5), set(12, 5), set(12, 5)]),
  }
  const s = suggest(pullup, SCHEME, weighted)
  assert.equal(s.kind, 'add-load')
  assert.equal(s.targetKg, 7.5)
})

test('a maxed plank is told to hold longer, not to add plates', () => {
  const scheme = { sets: 3, repMin: 30, repMax: 60 }
  const prev = {
    session: session('2026-09-15', []),
    entry: entry('e-plank', [set(0, null, { seconds: 60 }), set(0, null, { seconds: 60 }), set(0, null, { seconds: 60 })], scheme),
  }
  const s = suggest(plank, scheme, prev)
  assert.equal(s.kind, 'add-reps')
  assert.match(s.message, /sec/)
})

test('coaching increments are configurable, not hardcoded', () => {
  const prev = { session: session('2026-09-15', []), entry: entry('e-bench', [set(12), set(12), set(12)]) }
  const s = suggest(bench, SCHEME, prev, {
    rule: 'top-of-range-all-sets',
    incrementKgUpper: 1.25,
    incrementKgLower: 2.5,
  })
  assert.equal(s.deltaKg, 1.25)
})

// ── history lookup ─────────────────────────────────────────────────────────

test('lastPerformance skips sessions with no completed sets', () => {
  const sessions = [
    session('2026-09-22', [entry('e-bench', [set(10, 40, { done: false })])], 'newest'),
    session('2026-09-15', [entry('e-bench', [set(8, 40)])], 'older'),
  ]
  assert.equal(lastPerformance(sessions, 'e-bench').session.id, 'older')
})

test('lastPerformance can exclude the session being logged right now', () => {
  const sessions = [
    session('2026-09-22', [entry('e-bench', [set(10, 45)])], 'today'),
    session('2026-09-15', [entry('e-bench', [set(8, 40)])], 'lastweek'),
  ]
  assert.equal(lastPerformance(sessions, 'e-bench', 'today').session.id, 'lastweek')
})

test('formatPrev collapses a same-weight session and expands a mixed one', () => {
  const same = { session: session('x', []), entry: entry('e-bench', [set(10, 40), set(9, 40)]) }
  assert.equal(formatPrev(same), '40 kg × 10, 9')
  const mixed = { session: session('x', []), entry: entry('e-bench', [set(10, 40), set(8, 45)]) }
  assert.equal(formatPrev(mixed), '40×10, 45×8')
})

// ── volume ─────────────────────────────────────────────────────────────────

test('sets count against the primary muscle only, as the plan counts them', () => {
  // Bench is chest volume; its triceps involvement is not counted again.
  const s = session('2026-09-22', [
    entry('e-bench', [set(10), set(10), set(10)]),
    entry('e-squat', [set(8), set(8)]),
  ])
  const v = setsByMuscle([s], [bench, squat], '2026-09-21', '2026-09-23')
  assert.equal(v.chest, 3)
  assert.equal(v.quads, 2)
  assert.equal(v.triceps, undefined)
})

test('volume respects the date window', () => {
  const s = session('2026-09-01', [entry('e-bench', [set(10)])])
  assert.deepEqual(setsByMuscle([s], [bench], '2026-09-21', '2026-09-23'), {})
})

test('tonnage ignores bodyweight sets with no load', () => {
  const s = session('2026-09-22', [
    entry('e-bench', [set(10, 40)]),
    entry('e-dead-bug', [set(10, null)]),
  ])
  assert.equal(tonnage(s), 400)
})
