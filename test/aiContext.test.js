import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAiContext, ALLOWED_CONTEXT_KEYS } from '../src/utils/aiContext.ts'
import { seedData } from '../src/services/seed.ts'

/**
 * The data boundary.
 *
 * The free Gemini tier trains on what it receives, and this app holds two
 * people's body measurements. These tests build a context from a store full of
 * real, identifiable data and assert that none of it appears in the payload.
 */

/** A store carrying everything that must NOT leave the device. */
function loadedStore() {
  const d = seedData()
  const him = d.people[0]
  const her = d.people[1]

  d.bodyMetrics = [
    { id: 'm1', updatedAt: '', personId: him.id, date: '2026-09-22', weightKg: 62.4 },
    { id: 'm2', updatedAt: '', personId: her.id, date: '2026-09-22', weightKg: 64.7, waistCm: 86.5, hipCm: 98.25 },
  ]
  d.mealLogs = [
    {
      id: 'l1', updatedAt: '', personId: her.id, date: '2026-09-22',
      slotId: 'her-breakfast', slotName: 'Breakfast', status: 'eaten',
      loggedBy: her.id, createdAt: '', note: 'felt bloated afterwards',
      items: [{
        id: 'i1', foodId: 'f-idli', foodName: 'Idli',
        amount: { value: 7777, unit: 'piece' },
        basisSnapshot: { qty: 1, unit: 'piece', kcal: 58, proteinG: 2 }, updatedAt: '',
      }],
    },
  ]
  d.workoutSessions = [
    {
      id: 's1', updatedAt: '', personId: him.id, date: '2026-09-22',
      templateName: 'Chest + Triceps', loggedBy: him.id, createdAt: '',
      bodyweightKg: 62.4,
      entries: [{
        id: 'e1', exerciseId: 'e-bench', exerciseName: 'Barbell bench press',
        scheme: { sets: 3, repMin: 8, repMax: 12 }, order: 0, updatedAt: '',
        sets: [{ id: 'st1', index: 0, weightKg: 8888, reps: 9999, kind: 'work', done: true, updatedAt: '' }],
      }],
    },
  ]
  d.waterEntries = [{ id: 'w1', updatedAt: '', personId: him.id, date: '2026-09-22', ml: 1234, at: '' }]
  d.stepLogs = [{ id: 'p1', updatedAt: '', personId: him.id, date: '2026-09-22', steps: 4321 }]
  d.settings = { ...d.settings, pinHash: 'SECRET_PIN_HASH', pinSalt: 'SECRET_SALT' }
  return d
}

const contextJson = () => {
  const d = loadedStore()
  return JSON.stringify(buildAiContext(d, d.people[1], '2026-09-22'))
}

test('no body measurement reaches the payload', () => {
  const json = contextJson()
  for (const value of ['62.4', '64.7', '86.5', '98.25']) {
    assert.ok(!json.includes(value), `payload leaked the measurement ${value}`)
  }
})

test('no logged meal, set, water or step count reaches the payload', () => {
  const json = contextJson()
  // Deliberately absurd values, so a match cannot be a coincidence.
  for (const value of ['7777', '8888', '9999', '1234', '4321']) {
    assert.ok(!json.includes(value), `payload leaked logged value ${value}`)
  }
})

test('no free-text note and no secret reaches the payload', () => {
  const json = contextJson()
  assert.ok(!json.includes('bloated'), 'payload leaked a note')
  assert.ok(!json.includes('SECRET_PIN_HASH'), 'payload leaked the PIN hash')
  assert.ok(!json.includes('SECRET_SALT'), 'payload leaked the PIN salt')
})

test('no log-bearing collection name appears at all', () => {
  const json = contextJson()
  for (const key of [
    'bodyMetrics', 'mealLogs', 'workoutSessions', 'waterEntries',
    'stepLogs', 'targets', 'coaching', 'settings', 'ghToken', 'aiKey',
  ]) {
    assert.ok(!json.includes(key), `payload mentions ${key}`)
  }
})

test('the payload contains ONLY whitelisted keys, however AppData grows', () => {
  const d = loadedStore()
  // A field added to the model later must not ride along.
  d.foods[0].secretField = 'should-not-travel'
  d.people[1].heightCm = 152
  d.people[1].birthYear = 1995

  const ctx = buildAiContext(d, d.people[1], '2026-09-22')
  const seen = new Set()
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        seen.add(k)
        walk(v)
      }
    }
  }
  walk(ctx)

  for (const key of seen) {
    assert.ok(ALLOWED_CONTEXT_KEYS.includes(key), `unexpected key in payload: ${key}`)
  }
  const json = JSON.stringify(ctx)
  assert.ok(!json.includes('should-not-travel'), 'a new food field leaked')
  assert.ok(!json.includes('1995'), 'birth year leaked')
})

test('the vocabulary the model does need is present', () => {
  const d = loadedStore()
  const ctx = buildAiContext(d, d.people[1], '2026-09-22')
  assert.ok(ctx.foods.some((f) => f.name === 'Idli'), 'food library missing')
  assert.ok(ctx.exercises.some((e) => e.name === 'Squat'), 'exercise library missing')
  assert.ok(ctx.mealSlots.includes('Breakfast'), 'slot names missing')
  assert.ok(ctx.mealOptions.some((o) => o.startsWith('Breakfast:')), 'option names missing')
  assert.ok(ctx.workoutDays.length > 0, 'workout day names missing')
  assert.equal(ctx.person, 'Wife')
  assert.equal(ctx.portions, 'min')
})

test('a piece food carries its gram weight so portions can be sanity-checked', () => {
  const d = loadedStore()
  const ctx = buildAiContext(d, d.people[0], '2026-09-22')
  const idli = ctx.foods.find((f) => f.name === 'Idli')
  assert.equal(idli.unit, 'piece')
  assert.equal(idli.gramsEach, 45)
})

test('archived foods are not offered as vocabulary', () => {
  const d = loadedStore()
  d.foods.find((f) => f.name === 'Paneer').archived = true
  const ctx = buildAiContext(d, d.people[0], '2026-09-22')
  assert.ok(!ctx.foods.some((f) => f.name === 'Paneer'))
})
