import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toBasisUnits,
  macrosOf,
  macrosOfFood,
  sumMacros,
  itemsMacros,
  recomputeFrom,
  unitsFor,
} from '../src/utils/macros.ts'
import { resolvePlanned, formatPlanned, isRange } from '../src/utils/portion.ts'

// Per-piece food with a gram conversion, as the seed builds it.
const idli = {
  id: 'f-idli',
  updatedAt: '',
  name: 'Idli',
  unit: 'piece',
  basis: { qty: 1, unit: 'piece', kcal: 58, proteinG: 2, carbG: 12, fatG: 0.2 },
  conversions: { g: 1 / 45 },
}
const rice = {
  id: 'f-rice',
  updatedAt: '',
  name: 'Rice (cooked)',
  unit: 'g',
  basis: { qty: 100, unit: 'g', kcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3 },
}
const chicken = {
  id: 'f-chicken',
  updatedAt: '',
  name: 'Chicken (cooked)',
  unit: 'g',
  basis: { qty: 100, unit: 'g', kcal: 165, proteinG: 31 },
}

const item = (food, value, unit) => ({
  id: 'i1',
  foodId: food.id,
  foodName: food.name,
  amount: { value, unit: unit ?? food.basis.unit },
  basisSnapshot: food.basis,
  conversionsSnapshot: food.conversions,
  updatedAt: '',
})

test('a piece food scales per piece', () => {
  const m = macrosOf(item(idli, 4))
  assert.equal(m.kcal, 232)
  assert.equal(m.proteinG, 8)
})

test('the same piece food resolves when logged by weight', () => {
  // 135 g of idli is three of them.
  assert.equal(toBasisUnits({ value: 135, unit: 'g' }, idli.basis, idli.conversions), 3)
  assert.equal(macrosOf(item(idli, 135, 'g')).kcal, 174)
})

test('a per-100 g food scales by weight', () => {
  assert.equal(macrosOf(item(rice, 250)).kcal, 325)
  assert.equal(Math.round(macrosOf(item(rice, 250)).proteinG * 10) / 10, 6.8)
})

test('an unconvertible unit yields null, never a silent zero', () => {
  // Millilitres of chicken is meaningless — the UI must show a dash.
  assert.equal(toBasisUnits({ value: 200, unit: 'ml' }, chicken.basis, chicken.conversions), null)
  assert.equal(macrosOf(item(chicken, 200, 'ml')), null)
})

test('a zero basis quantity cannot divide by zero', () => {
  const broken = { ...item(rice, 100), basisSnapshot: { ...rice.basis, qty: 0 } }
  assert.equal(macrosOf(broken).kcal, 0)
})

test('sumMacros flags an unresolved item instead of hiding it', () => {
  const { total, incomplete } = sumMacros([
    macrosOf(item(idli, 4)),
    macrosOf(item(chicken, 200, 'ml')),
  ])
  assert.equal(total.kcal, 232)
  assert.equal(incomplete, true)
})

test('totals sum unrounded so six meals do not drift', () => {
  // 3 × 2.7 g protein per 100 g of rice at 50 g each = 4.05 g.
  const items = [item(rice, 50), { ...item(rice, 50), id: 'i2' }, { ...item(rice, 50), id: 'i3' }]
  assert.equal(itemsMacros(items).total.proteinG, 4.050000000000001)
  // Rounding once at display gives 4.1, not the 4.5 that per-item rounding would.
  assert.equal(Math.round(itemsMacros(items).total.proteinG * 10) / 10, 4.1)
})

test('deleted items are excluded from a meal total', () => {
  const items = [item(idli, 4), { ...item(idli, 4), id: 'i2', deletedAt: '2026-09-22T00:00:00Z' }]
  assert.equal(itemsMacros(items).total.kcal, 232)
})

test('a log ignores later library corrections until recomputed', () => {
  const logged = item(idli, 4)
  const corrected = { ...idli, basis: { ...idli.basis, kcal: 70 } }
  // The log keeps what it recorded...
  assert.equal(macrosOf(logged).kcal, 232)
  // ...until the explicit recompute pulls the correction in.
  assert.equal(macrosOf(recomputeFrom(logged, corrected)).kcal, 280)
  // A missing food leaves the item untouched rather than blanking it.
  assert.equal(macrosOf(recomputeFrom(logged, undefined)).kcal, 232)
})

test('macrosOfFood matches macrosOf for the same amount', () => {
  assert.deepEqual(macrosOfFood(rice, { value: 250, unit: 'g' }), macrosOf(item(rice, 250)))
})

test('unitsFor offers only what a food can convert', () => {
  assert.deepEqual(unitsFor(idli), ['piece', 'g'])
  assert.deepEqual(unitsFor(rice), ['g'])
})

// ── portion ranges ─────────────────────────────────────────────────────────

test('a planned range collapses by the person preference', () => {
  const ricePlan = { value: 200, max: 300, unit: 'g' }
  assert.equal(resolvePlanned(ricePlan, 'min').value, 200) // her plate
  assert.equal(resolvePlanned(ricePlan, 'mid').value, 250)
  assert.equal(resolvePlanned(ricePlan, 'max').value, 300) // his plate
})

test('pieces resolve to halves, weights to whole numbers', () => {
  // Her pre-workout "1/2 to 1 banana": she takes the bottom, he takes the top.
  const banana = { value: 0.5, max: 1, unit: 'piece' }
  assert.equal(resolvePlanned(banana, 'min').value, 0.5)
  assert.equal(resolvePlanned(banana, 'max').value, 1)
  // Midpoint is 0.75, which rounds up to a whole banana at half granularity.
  assert.equal(resolvePlanned(banana, 'mid').value, 1)
  assert.equal(resolvePlanned({ value: 2, max: 3, unit: 'piece' }, 'mid').value, 2.5)
  assert.equal(resolvePlanned({ value: 120, max: 150, unit: 'g' }, 'mid').value, 135)
})

test('a fixed amount is unaffected by preference', () => {
  const egg = { value: 2, unit: 'piece' }
  for (const pref of ['min', 'mid', 'max']) {
    assert.equal(resolvePlanned(egg, pref).value, 2)
  }
  assert.equal(isRange(egg), false)
  assert.equal(formatPlanned(egg), '2')
  assert.equal(formatPlanned({ value: 200, max: 300, unit: 'g' }), '200–300 g')
})
