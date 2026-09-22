import type { CoachingRules, DateKey, Range, TargetProfile } from '../types'
import { positionIn, weeklyRate } from './stats.ts'
import type { Reading, Trend } from './stats.ts'

/**
 * The adjustment rules from the two source plans, applied to logged data.
 *
 * Three principles, all of which come straight from the documents:
 *
 * 1. **Never answer without evidence.** Every piece of advice carries the
 *    window, the number of readings and the computed rate. Advice with no
 *    visible basis gets ignored, or worse, followed blindly.
 * 2. **Never answer on thin data.** `stats` returns "not enough data"; this
 *    propagates it as "keep logging" rather than inventing a verdict.
 * 3. **Never auto-apply.** Every change is a proposal with an explicit Apply.
 *
 * It also encodes the two named failure modes. For him: reaching for more
 * protein when the answer is more total food. For her: cutting harder and
 * adding cardio when the answer is holding a moderate deficit, lifting, and
 * walking more.
 */

export type AdviceKind =
  | 'hold'
  | 'intake-mismatch'
  | 'increase-kcal'
  | 'decrease-kcal'
  | 'add-steps'
  | 'eating-too-fast'
  | 'protein-low'
  | 'recomp-progress'
  | 'log-more'

export interface Advice {
  kind: AdviceKind
  /** 'action' asks for a decision; 'info' is a status. */
  severity: 'action' | 'info'
  title: string
  detail: string
  /** What the conclusion is built from — always shown. */
  evidence: string[]
  /** A proposed target change, applied only when the user taps Apply. */
  apply?: { kcalDelta?: number; stepsDelta?: number }
}

export interface DayIntake {
  date: DateKey
  kcal: number
  proteinG: number
  /** False when a logged item had no resolvable macros. */
  complete: boolean
  /** True when anything at all was logged that day. */
  logged: boolean
}

export interface CoachInput {
  asOf: DateKey
  rules: CoachingRules
  target: TargetProfile
  weights: Reading[]
  waists: Reading[]
  /** The last 14 days of intake, oldest first. */
  intake: DayIntake[]
  /** Steps logged over the same window. */
  steps: Reading[]
}

const r1 = (n: number) => Math.round(n * 100) / 100
const mid = (band: Range) => Math.round((band.min + band.max) / 2)

function trendEvidence(trend: Trend): string[] {
  const out: string[] = []
  if (trend.current) {
    out.push(
      `This week: ${r1(trend.current.mean)} kg average from ${trend.current.count} weigh-ins (${trend.current.from} to ${trend.current.to}).`,
    )
  }
  if (trend.previous) {
    out.push(
      `${trend.weeksApart ?? '?'} weeks earlier: ${r1(trend.previous.mean)} kg from ${trend.previous.count} weigh-ins.`,
    )
  }
  if (trend.kgPerWeek != null) {
    out.push(`Rate: ${trend.kgPerWeek > 0 ? '+' : ''}${r1(trend.kgPerWeek)} kg/week.`)
  }
  return out
}

/** Mean of a numeric series, or null when empty. */
function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function evaluate(input: CoachInput): Advice[] {
  const { asOf, rules, target, weights, waists, intake, steps } = input
  const advice: Advice[] = []

  const loggedDays = intake.filter((d) => d.logged)
  const trend = weeklyRate(weights, asOf, rules.lookbackWeeks, rules.minReadingsPerWeek)
  const waistTrend = weeklyRate(waists, asOf, rules.lookbackWeeks, 1)

  /**
   * Does the logged intake credibly explain the weight trend?
   *
   * Averaging 500 kcal a day while weight holds steady means the log is
   * incomplete, not that metabolism is broken. Offering a one-tap "cut 125
   * kcal" on top of that is worse than useless: it adjusts a target that
   * nothing is being measured against, and the advice compounds every time the
   * trend fails to move. When intake looks implausible the analysis is still
   * shown, but without an Apply button.
   */
  const avgKcal = loggedDays.length >= 4 ? mean(loggedDays.map((d) => d.kcal)) : null
  const intakeSuspect = avgKcal != null && avgKcal < target.kcal.min * 0.7
  const proposal = (apply: { kcalDelta?: number; stepsDelta?: number }) =>
    intakeSuspect && apply.kcalDelta != null ? undefined : apply

  if (intakeSuspect && avgKcal != null) {
    advice.push({
      kind: 'intake-mismatch',
      severity: 'action',
      title: 'The food log looks incomplete',
      detail: `Logged intake averages ${Math.round(avgKcal)} kcal a day against a ${target.kcal.min}–${target.kcal.max} target. Either meals are going unlogged or portions are underestimated. Calorie changes below are shown for information only — adjusting a target you are not measuring against just moves the goalposts.`,
      evidence: [
        `${loggedDays.length} of the last ${intake.length} days have food logged.`,
        `Average: ${Math.round(avgKcal)} kcal/day, under 70% of the ${target.kcal.min} kcal floor.`,
        ...(loggedDays.some((d) => !d.complete)
          ? ['Some logged items had no macros for their unit, so the real figure is higher.']
          : []),
      ],
    })
  }

  // ── 1. Is there enough to judge? ─────────────────────────────────────────
  if (trend.status === 'not-enough-data') {
    advice.push({
      kind: 'log-more',
      severity: 'info',
      title: 'Not enough weigh-ins yet',
      detail:
        trend.reason ??
        `The plan asks for ${rules.minReadingsPerWeek}–7 mornings a week, under the same conditions, and compares weekly averages rather than single readings.`,
      evidence: trendEvidence(trend),
    })
  } else if (trend.kgPerWeek != null) {
    const position = positionIn(trend.kgPerWeek, rules.weeklyDeltaKg)
    const step = mid(rules.kcalAdjustStep)
    const evidence = trendEvidence(trend)

    if (position === 'inside') {
      advice.push({
        kind: 'hold',
        severity: 'info',
        title: 'On track — change nothing',
        detail: `${r1(trend.kgPerWeek)} kg/week is inside your ${rules.weeklyDeltaKg.min} to ${rules.weeklyDeltaKg.max} target. Keep the diet and the training the same.`,
        evidence,
      })
    } else if (rules.goal === 'gain') {
      if (position === 'below') {
        advice.push({
          kind: 'increase-kcal',
          severity: 'action',
          title: `Add about ${step} kcal a day`,
          detail: `Weight is moving ${r1(trend.kgPerWeek)} kg/week against a ${rules.weeklyDeltaKg.min}–${rules.weeklyDeltaKg.max} target, over ${rules.lookbackWeeks} weeks. The fix is more total food, not more protein — a banana and 250 ml of milk, or another 100 g of cooked rice, gets you most of the way.`,
          evidence,
          apply: proposal({ kcalDelta: step }),
        })
      } else {
        advice.push({
          kind: 'eating-too-fast',
          severity: 'action',
          title: `Ease off about ${step} kcal a day`,
          detail: `${r1(trend.kgPerWeek)} kg/week is faster than the ${rules.weeklyDeltaKg.max} kg/week you are aiming for. Trimming slightly keeps more of the gain as muscle.`,
          evidence,
          apply: proposal({ kcalDelta: -step }),
        })
      }
    } else if (rules.goal === 'loss') {
      if (position === 'above') {
        // Not losing. Two options, deliberately — the documented mistake here
        // is slashing calories and piling on cardio.
        const waistMoving =
          waistTrend.status === 'ok' && (waistTrend.kgPerWeek ?? 0) < -0.05

        if (waistMoving) {
          advice.push({
            kind: 'recomp-progress',
            severity: 'info',
            title: 'Scale is flat but the waist is moving',
            detail: `Weight is ${r1(trend.kgPerWeek)} kg/week while the waist is coming down ${r1(Math.abs(waistTrend.kgPerWeek ?? 0))} cm/week. That is body composition changing. Hold everything and keep lifting.`,
            evidence: [
              ...evidence,
              `Waist: ${r1(waistTrend.current?.mean ?? 0)} cm now against ${r1(waistTrend.previous?.mean ?? 0)} cm ${waistTrend.weeksApart ?? '?'} weeks ago.`,
            ],
          })
        } else {
          const stepTarget = Math.min(10000, target.steps + 1500)
          advice.push({
            kind: 'decrease-kcal',
            severity: 'action',
            title: `Trim about ${step} kcal a day`,
            detail: `Nothing has moved for ${rules.lookbackWeeks} weeks. Take ${step} kcal off — not 500. A moderate deficit held for longer beats a big one abandoned in a fortnight.`,
            evidence,
            apply: proposal({ kcalDelta: -step }),
          })
          if (target.steps < 10000) {
            advice.push({
              kind: 'add-steps',
              severity: 'action',
              title: `Or walk more — target ${stepTarget.toLocaleString()} steps`,
              detail:
                'Raising daily movement instead of cutting food again is usually easier to sustain, and it protects training quality. Ten minutes after each meal is most of the way there.',
              evidence: [
                `Current step target: ${target.steps.toLocaleString()}.`,
                ...(mean(steps.map((s) => s.value)) != null
                  ? [`Recent average: ${Math.round(mean(steps.map((s) => s.value)) as number).toLocaleString()} steps/day.`]
                  : ['No step data logged yet.']),
              ],
              apply: { stepsDelta: stepTarget - target.steps },
            })
          }
        }
      } else {
        advice.push({
          kind: 'eating-too-fast',
          severity: 'action',
          title: 'Losing faster than intended',
          detail: `${r1(trend.kgPerWeek)} kg/week is quicker than the ${rules.weeklyDeltaKg.min} kg/week floor. Not automatically wrong, but watch strength in the gym and energy through the day — if either is dropping, add the calories back.`,
          evidence,
          apply: proposal({ kcalDelta: step }),
        })
      }
    }
  }

  // ── 2. Protein, judged over the logged days only ─────────────────────────
  if (loggedDays.length >= 4 && !intakeSuspect) {
    const avgProtein = mean(loggedDays.map((d) => d.proteinG))
    const anyIncomplete = loggedDays.some((d) => !d.complete)
    if (avgProtein != null && avgProtein < target.proteinG.min) {
      advice.push({
        kind: 'protein-low',
        severity: 'action',
        title: `Protein is averaging ${Math.round(avgProtein)} g`,
        detail: `Target is ${target.proteinG.min}–${target.proteinG.max} g. Spread it across the main meals — 20–30 g each — rather than trying to catch up in one sitting.${
          anyIncomplete ? ' Some logged items had no macros, so the real figure may be higher.' : ''
        }`,
        evidence: [
          `${loggedDays.length} days logged in the last ${intake.length}.`,
          `Average: ${Math.round(avgProtein)} g/day against a ${target.proteinG.min} g floor.`,
        ],
      })
    }
  }

  // ── 3. Adherence: a verdict on four logged days out of fourteen is noise ──
  if (intake.length > 0 && loggedDays.length < Math.ceil(intake.length / 2)) {
    advice.push({
      kind: 'log-more',
      severity: 'info',
      title: 'Not much logged lately',
      detail:
        'Calorie and protein advice is only as good as the days behind it. A few more logged days makes the rest of this screen worth acting on.',
      evidence: [`${loggedDays.length} of the last ${intake.length} days have anything logged.`],
    })
  }

  return advice
}

/** The new target a piece of advice would produce, without writing it. */
export function applyTo(
  target: TargetProfile,
  apply: { kcalDelta?: number; stepsDelta?: number },
): { kcal: Range; steps: number } {
  const d = apply.kcalDelta ?? 0
  return {
    kcal: { min: Math.max(0, target.kcal.min + d), max: Math.max(0, target.kcal.max + d) },
    steps: Math.max(0, target.steps + (apply.stepsDelta ?? 0)),
  }
}
