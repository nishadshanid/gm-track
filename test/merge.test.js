import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeData, mergeCollection, purgeTombstones, differsFrom } from '../src/services/merge.ts'

const T = (n) => `2026-09-22T10:${String(n).padStart(2, '0')}:00.000Z`

const empty = () => ({
  schemaVersion: 1,
  people: [], targets: [], coaching: [], foods: [], mealSlots: [], mealOptions: [],
  exercises: [], dayTemplates: [], schedules: [], mealLogs: [], workoutSessions: [],
  bodyMetrics: [], waterEntries: [], stepLogs: [],
  settings: { id: 'settings', updatedAt: T(0), pinEnabled: false, weightUnit: 'kg',
    lengthUnit: 'cm', weekStartsOn: 1, waterStepMl: 250, appName: 'Gm2' },
})

const food = (id, name, at, by = 'phoneA', extra = {}) => ({
  id, name, updatedAt: at, updatedBy: by, unit: 'g',
  basis: { qty: 100, unit: 'g', kcal: 100, proteinG: 5 }, ...extra,
})

const set = (id, index, reps, at, by = 'phoneA', extra = {}) => ({
  id, index, weightKg: 40, reps, kind: 'work', done: true, updatedAt: at, ...extra,
  updatedBy: by,
})

const session = (id, at, entries, by = 'phoneA') => ({
  id, updatedAt: at, updatedBy: by, personId: 'p-him', date: '2026-09-22',
  templateName: 'Chest + Triceps', entries, loggedBy: 'p-him', createdAt: T(0),
})

const entry = (id, exerciseId, sets, at, by = 'phoneA') => ({
  id, exerciseId, exerciseName: exerciseId, scheme: { sets: 3, repMin: 8, repMax: 12 },
  order: 0, sets, updatedAt: at, updatedBy: by,
})

// ── the case FTrack destroys ───────────────────────────────────────────────

test('records that exist on only one side all survive', () => {
  const remote = { ...empty(), foods: [food('a', 'Idli', T(1))] }
  const local = { ...empty(), foods: [food('b', 'Dosa', T(2), 'phoneB')] }
  const merged = mergeData(remote, local)
  assert.deepEqual(merged.foods.map((f) => f.id).sort(), ['a', 'b'])
})

test('the newer edit of the same record wins', () => {
  const remote = { ...empty(), foods: [food('a', 'Idli', T(5))] }
  const local = { ...empty(), foods: [food('a', 'Idli (steamed)', T(9), 'phoneB')] }
  assert.equal(mergeData(remote, local).foods[0].name, 'Idli (steamed)')
  // and the same the other way round
  assert.equal(mergeData(local, remote).foods[0].name, 'Idli (steamed)')
})

test('identical stamps resolve the same way on both devices', () => {
  const a = { ...empty(), foods: [food('a', 'From A', T(5), 'phoneA')] }
  const b = { ...empty(), foods: [food('a', 'From B', T(5), 'phoneB')] }
  assert.equal(mergeData(a, b).foods[0].name, mergeData(b, a).foods[0].name)
})

// ── tombstones ─────────────────────────────────────────────────────────────

test('a newer delete beats an older edit', () => {
  const remote = { ...empty(), foods: [food('a', 'Idli', T(5))] }
  const local = { ...empty(), foods: [food('a', 'Idli', T(9), 'phoneB', { deletedAt: T(9) })] }
  assert.ok(mergeData(remote, local).foods[0].deletedAt)
})

test('a newer edit beats an older delete — the record comes back', () => {
  const remote = { ...empty(), foods: [food('a', 'Idli', T(5), 'phoneA', { deletedAt: T(5) })] }
  const local = { ...empty(), foods: [food('a', 'Idli fixed', T(9), 'phoneB')] }
  const merged = mergeData(remote, local)
  assert.equal(merged.foods[0].deletedAt, undefined)
  assert.equal(merged.foods[0].name, 'Idli fixed')
})

test('a delete is never lost by being absent — it is a record, not an omission', () => {
  // Local deleted it; remote simply has the old copy. The delete must win.
  const remote = { ...empty(), foods: [food('a', 'Idli', T(1))] }
  const local = { ...empty(), foods: [food('a', 'Idli', T(8), 'phoneB', { deletedAt: T(8) })] }
  assert.ok(mergeData(remote, local).foods[0].deletedAt)
  assert.ok(mergeData(local, remote).foods[0].deletedAt)
})

// ── the gym case: one session, two phones ──────────────────────────────────

test('sets ticked on two phones in the same session all survive', () => {
  const s1 = set('s1', 0, 8, T(10), 'phoneA')
  const s2 = set('s2', 1, 8, T(11), 'phoneA')
  const s3 = set('s3', 2, 7, T(12), 'phoneB')

  const remote = { ...empty(), workoutSessions: [session('w1', T(11), [entry('e1', 'bench', [s1, s2], T(11))])] }
  const local = { ...empty(), workoutSessions: [session('w1', T(12), [entry('e1', 'bench', [s1, s3], T(12), 'phoneB')], 'phoneB')] }

  const merged = mergeData(remote, local)
  const sets = merged.workoutSessions[0].entries[0].sets
  assert.deepEqual(sets.map((s) => s.id), ['s1', 's2', 's3'])
  assert.deepEqual(sets.map((s) => s.index), [0, 1, 2])
})

test('the same set edited on both phones takes the newer value', () => {
  const remote = { ...empty(), workoutSessions: [session('w1', T(10), [entry('e1', 'bench', [set('s1', 0, 8, T(10))], T(10))])] }
  const local = { ...empty(), workoutSessions: [session('w1', T(20), [entry('e1', 'bench', [set('s1', 0, 12, T(20), 'phoneB')], T(20), 'phoneB')], 'phoneB')] }
  assert.equal(mergeData(remote, local).workoutSessions[0].entries[0].sets[0].reps, 12)
})

test('two different exercises added on two phones both survive', () => {
  const remote = { ...empty(), workoutSessions: [session('w1', T(10), [entry('e1', 'bench', [set('s1', 0, 8, T(10))], T(10))])] }
  const local = { ...empty(), workoutSessions: [session('w1', T(11), [entry('e2', 'fly', [set('s2', 0, 12, T(11), 'phoneB')], T(11), 'phoneB')], 'phoneB')] }
  const merged = mergeData(remote, local)
  assert.deepEqual(merged.workoutSessions[0].entries.map((e) => e.exerciseId), ['bench', 'fly'])
})

test('a whole session logged on only one phone survives', () => {
  const remote = { ...empty(), workoutSessions: [session('w1', T(10), [])] }
  const local = { ...empty(), workoutSessions: [session('w2', T(11), [], 'phoneB')] }
  assert.deepEqual(mergeData(remote, local).workoutSessions.map((s) => s.id).sort(), ['w1', 'w2'])
})

// ── meals ──────────────────────────────────────────────────────────────────

const item = (id, name, value, at, by = 'phoneA', extra = {}) => ({
  id, foodId: 'f', foodName: name, amount: { value, unit: 'piece' },
  basisSnapshot: { qty: 1, unit: 'piece', kcal: 58, proteinG: 2 },
  updatedAt: at, updatedBy: by, ...extra,
})
const meal = (id, at, items, by = 'phoneA') => ({
  id, updatedAt: at, updatedBy: by, personId: 'p-him', date: '2026-09-22',
  slotId: 'breakfast', slotName: 'Breakfast', items, status: 'eaten',
  loggedBy: 'p-him', createdAt: T(0),
})

test('items added to one meal from two phones both survive', () => {
  const remote = { ...empty(), mealLogs: [meal('m1', T(10), [item('i1', 'Idli', 4, T(10))])] }
  const local = { ...empty(), mealLogs: [meal('m1', T(11), [item('i2', 'Egg', 2, T(11), 'phoneB')], 'phoneB')] }
  const merged = mergeData(remote, local)
  assert.deepEqual(merged.mealLogs[0].items.map((i) => i.foodName).sort(), ['Egg', 'Idli'])
})

test('a portion edited on both phones takes the newer amount', () => {
  const remote = { ...empty(), mealLogs: [meal('m1', T(10), [item('i1', 'Idli', 4, T(10))])] }
  const local = { ...empty(), mealLogs: [meal('m1', T(20), [item('i1', 'Idli', 2, T(20), 'phoneB')], 'phoneB')] }
  assert.equal(mergeData(remote, local).mealLogs[0].items[0].amount.value, 2)
})

test('an item deleted on one phone stays deleted after merging', () => {
  const remote = { ...empty(), mealLogs: [meal('m1', T(10), [item('i1', 'Idli', 4, T(10))])] }
  const local = { ...empty(), mealLogs: [meal('m1', T(20), [item('i1', 'Idli', 4, T(20), 'phoneB', { deletedAt: T(20) })], 'phoneB')] }
  assert.ok(mergeData(remote, local).mealLogs[0].items[0].deletedAt)
})

// ── water ──────────────────────────────────────────────────────────────────

test('simultaneous water taps on two phones both count', () => {
  const glass = (id, at, by) => ({ id, updatedAt: at, updatedBy: by, personId: 'p-him',
    date: '2026-09-22', ml: 250, at })
  const remote = { ...empty(), waterEntries: [glass('w1', T(10), 'phoneA')] }
  const local = { ...empty(), waterEntries: [glass('w2', T(10), 'phoneB')] }
  const merged = mergeData(remote, local)
  assert.equal(merged.waterEntries.length, 2)
  assert.equal(merged.waterEntries.reduce((n, w) => n + w.ml, 0), 500)
})

// ── convergence ────────────────────────────────────────────────────────────

test('both devices reach the same snapshot regardless of merge order', () => {
  const a = {
    ...empty(),
    foods: [food('x', 'A-name', T(7), 'phoneA'), food('y', 'only-A', T(3), 'phoneA')],
    waterEntries: [{ id: 'w1', updatedAt: T(1), updatedBy: 'phoneA', personId: 'p', date: 'd', ml: 250, at: T(1) }],
  }
  const b = {
    ...empty(),
    foods: [food('x', 'B-name', T(9), 'phoneB'), food('z', 'only-B', T(4), 'phoneB')],
    waterEntries: [{ id: 'w2', updatedAt: T(2), updatedBy: 'phoneB', personId: 'p', date: 'd', ml: 250, at: T(2) }],
  }
  const ab = mergeData(a, b)
  const ba = mergeData(b, a)
  const norm = (d) => JSON.stringify({
    foods: [...d.foods].sort((x, y) => x.id.localeCompare(y.id)),
    water: [...d.waterEntries].sort((x, y) => x.id.localeCompare(y.id)),
  })
  assert.equal(norm(ab), norm(ba))
  assert.equal(ab.foods.length, 3)
})

test('merging a snapshot with itself changes nothing', () => {
  const a = { ...empty(), foods: [food('x', 'A', T(7))] }
  assert.equal(differsFrom(mergeData(a, a), a), false)
})

test('an empty remote does not wipe local work', () => {
  const local = { ...empty(), foods: [food('x', 'A', T(7))], mealLogs: [meal('m1', T(8), [item('i1', 'Idli', 4, T(8))])] }
  const merged = mergeData(empty(), local)
  assert.equal(merged.foods.length, 1)
  assert.equal(merged.mealLogs.length, 1)
})

// ── housekeeping ───────────────────────────────────────────────────────────

test('mergeCollection is stable for an empty pair', () => {
  assert.deepEqual(mergeCollection([], []), [])
})

test('purgeTombstones drops only old deletes', () => {
  const old = new Date(Date.now() - 90 * 86400000).toISOString()
  const recent = new Date(Date.now() - 2 * 86400000).toISOString()
  const data = {
    ...empty(),
    foods: [
      food('a', 'kept', T(1)),
      food('b', 'old-delete', T(1), 'x', { deletedAt: old }),
      food('c', 'recent-delete', T(1), 'x', { deletedAt: recent }),
    ],
  }
  const out = purgeTombstones(data, 60)
  assert.deepEqual(out.foods.map((f) => f.id).sort(), ['a', 'c'])
})
