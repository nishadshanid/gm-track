import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, applyTo } from '../src/utils/coach.ts'
import { readingsOf } from '../src/utils/stats.ts'

const ASOF = '2026-09-22'

const key = (off) => {
  const d = new Date(2026, 8, 22)
  d.setDate(d.getDate() - off)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Weights over `days` days ending today, changing `perDay` kg each day. */
const weights = (days, start, perDay) =>
  readingsOf(
    Array.from({ length: days }, (_, i) => ({
      id: `m${i}`,
      updatedAt: '',
      personId: 'p',
      date: key(days - 1 - i),
      weightKg: start + perDay * i,
    })),
    'weightKg',
  )

const waists = (days, start, perDay) =>
  readingsOf(
    Array.from({ length: days }, (_, i) => ({
      id: `w${i}`,
      updatedAt: '',
      personId: 'p',
      date: key(days - 1 - i),
      waistCm: start + perDay * i,
    })),
    'waistCm',
  )

const intake = (days, kcal, proteinG, logged = true) =>
  Array.from({ length: days }, (_, i) => ({
    date: key(days - 1 - i),
    kcal,
    proteinG,
    complete: true,
    logged,
  }))

const HIM_RULES = {
  id: 'c', updatedAt: '', personId: 'p', goal: 'gain',
  weeklyDeltaKg: { min: 0.25, max: 0.5 },
  kcalAdjustStep: { min: 150, max: 250 },
  lookbackWeeks: 3, minReadingsPerWeek: 3,
  progression: { rule: 'top-of-range-all-sets', incrementKgUpper: 2.5, incrementKgLower: 5 },
}
const HER_RULES = {
  ...HIM_RULES, goal: 'loss',
  weeklyDeltaKg: { min: -0.5, max: -0.2 },
  kcalAdjustStep: { min: 100, max: 150 },
  lookbackWeeks: 4,
}

const HIM_TARGET = {
  id: 't', updatedAt: '', personId: 'p', effectiveFrom: '2026-08-01',
  kcal: { min: 2200, max: 2400 }, proteinG: { min: 90, max: 100 },
  waterMl: 2750, steps: 7000,
}
const HER_TARGET = {
  ...HIM_TARGET, kcal: { min: 1400, max: 1600 }, proteinG: { min: 85, max: 100 }, steps: 8500,
}

const run = (over) =>
  evaluate({
    asOf: ASOF, rules: HIM_RULES, target: HIM_TARGET,
    weights: [], waists: [], steps: [], intake: intake(14, 2300, 95),
    ...over,
  })

const kinds = (list) => list.map((a) => a.kind)
const find = (list, kind) => list.find((a) => a.kind === kind)

// ── data sufficiency ───────────────────────────────────────────────────────

test('no weigh-ins produces "keep logging", never a verdict', () => {
  const a = run({})
  assert.deepEqual(kinds(a), ['log-more'])
  assert.equal(a[0].severity, 'info')
  assert.equal(a[0].apply, undefined)
})

test('two weigh-ins this week is still not enough', () => {
  const a = run({ weights: weights(2, 62, 0.1) })
  assert.equal(kinds(a)[0], 'log-more')
  assert.match(a[0].detail, /2 of 3 weigh-ins/)
})

test('every piece of advice carries its evidence', () => {
  const a = run({ weights: weights(28, 62, 0.01) })
  for (const item of a) assert.ok(item.evidence.length > 0, `${item.kind} has no evidence`)
})

// ── gain plan ──────────────────────────────────────────────────────────────

test('gaining inside the band says change nothing', () => {
  // 0.05 kg/day = 0.35 kg/week, inside 0.25-0.5.
  const a = run({ weights: weights(28, 62, 0.05) })
  const hold = find(a, 'hold')
  assert.ok(hold)
  assert.equal(hold.severity, 'info')
  assert.equal(hold.apply, undefined)
  assert.match(hold.detail, /Keep the diet and the training the same/)
})

test('a flat three weeks proposes adding calories, not protein', () => {
  const a = run({ weights: weights(28, 62, 0) })
  const add = find(a, 'increase-kcal')
  assert.ok(add)
  assert.equal(add.severity, 'action')
  assert.equal(add.apply.kcalDelta, 200)
  // The documented failure mode for him is reaching for protein instead of food.
  assert.match(add.detail, /more total food, not more protein/)
  assert.match(add.title, /Add about 200 kcal a day/)
})

test('gaining too fast proposes easing off', () => {
  const a = run({ weights: weights(28, 62, 0.15) })
  const ease = find(a, 'eating-too-fast')
  assert.ok(ease)
  assert.equal(ease.apply.kcalDelta, -200)
})

test('the adjustment step comes from the rules, not a constant', () => {
  const a = evaluate({
    asOf: ASOF,
    rules: { ...HIM_RULES, kcalAdjustStep: { min: 300, max: 400 } },
    target: HIM_TARGET, weights: weights(28, 62, 0), waists: [], steps: [],
    intake: intake(14, 2300, 95),
  })
  assert.equal(find(a, 'increase-kcal').apply.kcalDelta, 350)
})

test('the lookback window comes from the rules too', () => {
  // A one-week lookback compares against last week rather than three weeks ago.
  const a = evaluate({
    asOf: ASOF, rules: { ...HIM_RULES, lookbackWeeks: 1 }, target: HIM_TARGET,
    weights: weights(14, 62, 0), waists: [], steps: [], intake: intake(14, 2300, 95),
  })
  assert.ok(find(a, 'increase-kcal'))
})

// ── fat-loss plan ──────────────────────────────────────────────────────────

test('losing inside the band says change nothing', () => {
  const a = evaluate({
    asOf: ASOF, rules: HER_RULES, target: HER_TARGET,
    weights: weights(35, 66, -0.05), waists: [], steps: [], intake: intake(14, 1500, 92),
  })
  assert.ok(find(a, 'hold'))
})

test('a stalled fat loss offers BOTH a small cut and more steps', () => {
  const a = evaluate({
    asOf: ASOF, rules: HER_RULES, target: HER_TARGET,
    weights: weights(35, 64, 0), waists: [], steps: [], intake: intake(14, 1500, 92),
  })
  const cut = find(a, 'decrease-kcal')
  const walk = find(a, 'add-steps')
  assert.ok(cut, 'expected a calorie suggestion')
  assert.ok(walk, 'expected a steps suggestion as an alternative')
  assert.equal(cut.apply.kcalDelta, -125)
  // The documented failure mode for her is slashing calories and adding cardio.
  assert.match(cut.detail, /not 500/)
  assert.equal(walk.apply.stepsDelta, 1500)
})

test('the steps option is withheld once the target is already 10k', () => {
  const a = evaluate({
    asOf: ASOF, rules: HER_RULES, target: { ...HER_TARGET, steps: 10000 },
    weights: weights(35, 64, 0), waists: [], steps: [], intake: intake(14, 1500, 92),
  })
  assert.equal(find(a, 'add-steps'), undefined)
  assert.ok(find(a, 'decrease-kcal'))
})

test('a flat scale with a shrinking waist is recomposition, not a stall', () => {
  const a = evaluate({
    asOf: ASOF, rules: HER_RULES, target: HER_TARGET,
    weights: weights(35, 64, 0), waists: waists(35, 86, -0.03),
    steps: [], intake: intake(14, 1500, 92),
  })
  const recomp = find(a, 'recomp-progress')
  assert.ok(recomp, 'expected recomposition to be recognised')
  assert.equal(recomp.severity, 'info')
  assert.equal(recomp.apply, undefined)
  // and it must NOT also tell her to cut
  assert.equal(find(a, 'decrease-kcal'), undefined)
  assert.equal(find(a, 'add-steps'), undefined)
})

test('losing faster than intended warns without demanding a change', () => {
  const a = evaluate({
    asOf: ASOF, rules: HER_RULES, target: HER_TARGET,
    weights: weights(35, 66, -0.15), waists: [], steps: [], intake: intake(14, 1500, 92),
  })
  const fast = find(a, 'eating-too-fast')
  assert.ok(fast)
  assert.match(fast.detail, /watch strength/)
  assert.equal(fast.apply.kcalDelta, 125)
})

// ── protein and adherence ──────────────────────────────────────────────────

test('low average protein is flagged against the target floor', () => {
  const a = run({ weights: weights(28, 62, 0.05), intake: intake(14, 2300, 70) })
  const p = find(a, 'protein-low')
  assert.ok(p)
  assert.match(p.title, /averaging 70 g/)
  assert.match(p.detail, /20–30 g each/)
})

test('protein inside the band is not flagged', () => {
  const a = run({ weights: weights(28, 62, 0.05), intake: intake(14, 2300, 95) })
  assert.equal(find(a, 'protein-low'), undefined)
})

test('protein is judged only on days that were logged', () => {
  // Three logged days at 95 g, eleven unlogged: too few to judge, so silent.
  const mixed = [...intake(11, 0, 0, false), ...intake(3, 2300, 95, true)]
  const a = run({ weights: weights(28, 62, 0.05), intake: mixed })
  assert.equal(find(a, 'protein-low'), undefined)
})

test('a mostly empty fortnight says so instead of pretending', () => {
  const mixed = [...intake(10, 0, 0, false), ...intake(4, 2300, 60, true)]
  const a = run({ weights: weights(28, 62, 0.05), intake: mixed })
  const nag = a.filter((x) => x.kind === 'log-more')
  assert.equal(nag.length, 1)
  assert.match(nag[0].evidence[0], /4 of the last 14 days/)
})

// ── applying ───────────────────────────────────────────────────────────────

test('applyTo shifts the whole calorie band and never goes negative', () => {
  assert.deepEqual(applyTo(HIM_TARGET, { kcalDelta: 200 }).kcal, { min: 2400, max: 2600 })
  assert.deepEqual(applyTo(HER_TARGET, { kcalDelta: -125 }).kcal, { min: 1275, max: 1475 })
  assert.deepEqual(applyTo(HIM_TARGET, { kcalDelta: -99999 }).kcal, { min: 0, max: 0 })
})

test('applyTo shifts steps independently of calories', () => {
  const next = applyTo(HER_TARGET, { stepsDelta: 1500 })
  assert.equal(next.steps, 10000)
  assert.deepEqual(next.kcal, HER_TARGET.kcal)
})

// ── implausible intake ─────────────────────────────────────────────────────

test('an implausibly low food log is called out', () => {
  const a = run({ weights: weights(28, 62, 0), intake: intake(14, 900, 60) })
  const m = find(a, 'intake-mismatch')
  assert.ok(m)
  assert.match(m.detail, /averages 900 kcal a day/)
  assert.match(m.evidence[1], /under 70%/)
})

test('a suspect log withholds the one-tap calorie change but keeps the analysis', () => {
  const a = run({ weights: weights(28, 62, 0), intake: intake(14, 900, 60) })
  const add = find(a, 'increase-kcal')
  assert.ok(add, 'the trend analysis is still shown')
  assert.equal(add.apply, undefined, 'but it cannot be applied')
})

test('a suspect log also suppresses the protein notice', () => {
  // 60 g is under the 90 g floor, but the whole log is untrustworthy.
  const a = run({ weights: weights(28, 62, 0), intake: intake(14, 900, 60) })
  assert.equal(find(a, 'protein-low'), undefined)
})

test('a plausible log keeps the apply button', () => {
  const a = run({ weights: weights(28, 62, 0), intake: intake(14, 2300, 95) })
  assert.equal(find(a, 'intake-mismatch'), undefined)
  assert.equal(find(a, 'increase-kcal').apply.kcalDelta, 200)
})

test('the steps option survives a suspect log, since it changes no target band', () => {
  const a = evaluate({
    asOf: ASOF, rules: HER_RULES, target: HER_TARGET,
    weights: weights(35, 64, 0), waists: [], steps: [], intake: intake(14, 500, 40),
  })
  assert.ok(find(a, 'intake-mismatch'))
  assert.equal(find(a, 'decrease-kcal').apply, undefined)
  assert.equal(find(a, 'add-steps').apply.stepsDelta, 1500)
})
