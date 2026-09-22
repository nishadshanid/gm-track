import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchByName, resolveFoodItems, resolveExercise } from '../src/utils/aiResolve.ts'
import { seedFoods } from '../src/data/seed/foods.ts'
import { seedExercises } from '../src/data/seed/exercises.ts'

const foods = seedFoods('')
const exercises = seedExercises('')

test('an exact name matches exactly', () => {
  const m = matchByName('Idli', foods)
  assert.equal(m.item.id, 'f-idli')
  assert.equal(m.how, 'exact')
})

test('matching ignores case, punctuation and parenthesised qualifiers', () => {
  assert.equal(matchByName('chicken (cooked)', foods).item.id, 'f-chicken')
  assert.equal(matchByName('CHICKEN', foods).item.id, 'f-chicken')
  assert.equal(matchByName('rice', foods).item.id, 'f-rice')
})

test('a natural phrase resolves to the library entry', () => {
  assert.equal(matchByName('boiled egg', foods).item.id, 'f-egg')
  assert.equal(matchByName('peanut butter', foods).item.id, 'f-peanut-butter')
})

test('an invented food does NOT resolve to something real', () => {
  // The failure that matters: a hallucination silently logged as a real food.
  for (const invented of ['protein bar', 'pizza', 'zzzzz', 'lasagne']) {
    assert.equal(matchByName(invented, foods), undefined, `"${invented}" wrongly matched`)
  }
})

test('a head-noun guess is returned as fuzzy, never as certain', () => {
  // A string matcher cannot tell "boiled egg" (a preparation of a known food)
  // from "quinoa salad" (a different dish sharing a word). Both come back
  // flagged, so the review sheet shows the swap and the person fixes it.
  const guess = matchByName('quinoa salad', foods)
  assert.equal(guess.how, 'fuzzy')
  assert.equal(guess.item.name, 'Salad (raw vegetables)')
})

test('similar-sounding names do not cross-match', () => {
  assert.notEqual(matchByName('dosa', foods).item.id, 'f-dal')
  assert.equal(matchByName('dosa', foods).item.id, 'f-dosa')
})

test('resolveFoodItems separates what matched from what did not', () => {
  const { items, unresolved } = resolveFoodItems(
    [
      { food: 'idli', qty: 2 },
      { food: 'egg', qty: 2 },
      { food: 'sambar', qty: 200, unit: 'ml' },
      { food: 'protein bar', qty: 1 },
    ],
    foods,
  )
  assert.deepEqual(items.map((i) => i.food.id), ['f-idli', 'f-egg', 'f-sambar'])
  assert.deepEqual(items.map((i) => i.amount.value), [2, 2, 200])
  assert.equal(unresolved.length, 1)
  assert.equal(unresolved[0].said, 'protein bar')
  assert.equal(unresolved[0].reason, 'no-such-food')
})

test('a unit the food cannot convert falls back to its own unit, never to nothing', () => {
  // Chicken is per 100 g with no conversions: "2 pieces of chicken" is not
  // meaningful, so it logs as grams rather than producing a dash later.
  const { items } = resolveFoodItems([{ food: 'chicken', qty: 150, unit: 'pieces' }], foods)
  assert.equal(items[0].amount.unit, 'g')
})

test('a piece food keeps a piece unit', () => {
  const { items } = resolveFoodItems([{ food: 'idli', qty: 3, unit: 'nos' }], foods)
  assert.equal(items[0].amount.unit, 'piece')
  assert.equal(items[0].amount.value, 3)
})

test('a missing or absurd quantity falls back to one serving, not a guess', () => {
  const { items } = resolveFoodItems(
    [{ food: 'idli' }, { food: 'rice', qty: -5 }, { food: 'egg', qty: 0 }],
    foods,
  )
  assert.equal(items[0].amount.value, 1)   // per piece
  assert.equal(items[1].amount.value, 100) // per 100 g
  assert.equal(items[2].amount.value, 1)
})

test('how the match was made is reported, so a loose one can be confirmed', () => {
  assert.equal(resolveFoodItems([{ food: 'Idli' }], foods).items[0].how, 'exact')
  assert.equal(resolveFoodItems([{ food: 'boiled egg' }], foods).items[0].how, 'fuzzy')
})

test('exercises resolve the same way and reject inventions', () => {
  assert.equal(resolveExercise('bench press', exercises).item.id, 'e-bench')
  assert.equal(resolveExercise('lat pulldown', exercises).item.id, 'e-lat-pulldown')
  assert.equal(resolveExercise('underwater basket weaving', exercises), undefined)
})

// ── the whole translation chain, minus the model ───────────────────────────

test('a sentence resolves to the hand-checked macros from the diet plan', async () => {
  const { itemsMacros } = await import('../src/utils/macros.ts')

  // What the model would return for "2 idli, 2 eggs and a cup of sambar" —
  // her breakfast Option A, hand-checked at 350 kcal / 20.6 g in Phase 3.
  const { items, unresolved } = resolveFoodItems(
    [
      { food: 'Idli', qty: 2, unit: 'piece' },
      { food: 'Egg (whole)', qty: 2, unit: 'piece' },
      { food: 'Sambar', qty: 200, unit: 'ml' },
    ],
    foods,
  )
  assert.equal(unresolved.length, 0)

  const logged = items.map((i, n) => ({
    id: `i${n}`,
    foodId: i.food.id,
    foodName: i.food.name,
    amount: i.amount,
    basisSnapshot: i.food.basis,
    conversionsSnapshot: i.food.conversions,
    updatedAt: '',
  }))
  const { total } = itemsMacros(logged)
  assert.equal(Math.round(total.kcal), 350)
  assert.equal(Math.round(total.proteinG * 10) / 10, 20.6)
})

test('his larger portions of the same meal come out at the plan figure', async () => {
  const { itemsMacros } = await import('../src/utils/macros.ts')
  const { items } = resolveFoodItems(
    [
      { food: 'idli', qty: 4 },
      { food: 'egg', qty: 2 },
      { food: 'sambar', qty: 200, unit: 'ml' },
    ],
    foods,
  )
  const logged = items.map((i, n) => ({
    id: `i${n}`, foodId: i.food.id, foodName: i.food.name, amount: i.amount,
    basisSnapshot: i.food.basis, conversionsSnapshot: i.food.conversions, updatedAt: '',
  }))
  const { total } = itemsMacros(logged)
  assert.equal(Math.round(total.kcal), 466)
  assert.equal(Math.round(total.proteinG * 10) / 10, 24.6)
})

test('an unrecognised item is dropped from the total, not guessed at', async () => {
  const { itemsMacros } = await import('../src/utils/macros.ts')
  const { items, unresolved } = resolveFoodItems(
    [{ food: 'idli', qty: 2 }, { food: 'protein bar', qty: 1 }],
    foods,
  )
  assert.equal(unresolved.length, 1)
  const logged = items.map((i, n) => ({
    id: `i${n}`, foodId: i.food.id, foodName: i.food.name, amount: i.amount,
    basisSnapshot: i.food.basis, conversionsSnapshot: i.food.conversions, updatedAt: '',
  }))
  // 2 idli only — the bar contributes nothing rather than an invented number.
  assert.equal(Math.round(itemsMacros(logged).total.kcal), 116)
})
