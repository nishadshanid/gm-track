import type { CoachingRules, Goal } from '../../types'
import { store } from '../../services/store'
import { useData } from '../../hooks/useData'
import { usePerson } from '../../hooks/usePerson'
import { live } from '../../services/selectors'
import { uid } from '../../utils/id'
import { Field, FieldRow, Select } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SectionHeader } from '../ui/SectionHeader'

const DEFAULTS: Record<Goal, Pick<CoachingRules, 'weeklyDeltaKg' | 'kcalAdjustStep' | 'lookbackWeeks'>> = {
  gain: { weeklyDeltaKg: { min: 0.25, max: 0.5 }, kcalAdjustStep: { min: 150, max: 250 }, lookbackWeeks: 3 },
  loss: { weeklyDeltaKg: { min: -0.5, max: -0.2 }, kcalAdjustStep: { min: 100, max: 150 }, lookbackWeeks: 4 },
  recomp: { weeklyDeltaKg: { min: -0.1, max: 0.1 }, kcalAdjustStep: { min: 100, max: 150 }, lookbackWeeks: 4 },
}

/**
 * The coaching rules themselves.
 *
 * The advice on the Insights screen is computed from these numbers, so they are
 * editable like everything else — the plan's "0.25–0.5 kg/week" and
 * "150–250 kcal" are its starting recommendations, not constants in the code.
 */
export function CoachingRulesEditor() {
  const data = useData()
  const { person } = usePerson()
  if (!person) return null

  const rules = live(data.coaching).find((c) => c.personId === person.id)

  const write = (patch: Partial<CoachingRules>) => {
    if (rules) {
      store.update('coaching', rules.id, (rec) => ({ ...rec, ...patch }))
      return
    }
    store.upsert('coaching', {
      id: uid(),
      updatedAt: '',
      personId: person.id,
      goal: 'gain',
      ...DEFAULTS.gain,
      minReadingsPerWeek: 3,
      progression: { rule: 'top-of-range-all-sets', incrementKgUpper: 2.5, incrementKgLower: 5 },
      ...patch,
    } as CoachingRules)
  }

  if (!rules) {
    return (
      <section className="mt-8">
        <SectionHeader title={`Coaching rules · ${person.short}`} />
        <button type="button" onClick={() => write({})} className="btn-primary w-full">
          Set up coaching rules
        </button>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <SectionHeader title={`Coaching rules · ${person.short}`} />
      <div className="card space-y-4">
        <Field label="Goal" hint="Decides which direction counts as progress.">
          <Select
            value={rules.goal}
            onChange={(e) => {
              const goal = e.target.value as Goal
              // Flip the band with the goal, or a loss plan would be judged
              // against a gain target.
              write({ goal, ...DEFAULTS[goal] })
            }}
          >
            <option value="gain">Gain weight and muscle</option>
            <option value="loss">Lose fat, keep muscle</option>
            <option value="recomp">Hold weight, recompose</option>
          </Select>
        </Field>

        <FieldRow>
          <Field label="Rate min" hint="kg/week">
            <NumberStepper
              value={rules.weeklyDeltaKg.min}
              step={0.05}
              min={-3}
              onChange={(v) => write({ weeklyDeltaKg: { ...rules.weeklyDeltaKg, min: v } })}
              aria-label="Minimum weekly change"
            />
          </Field>
          <Field label="Rate max" hint="kg/week">
            <NumberStepper
              value={rules.weeklyDeltaKg.max}
              step={0.05}
              min={-3}
              onChange={(v) => write({ weeklyDeltaKg: { ...rules.weeklyDeltaKg, max: v } })}
              aria-label="Maximum weekly change"
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Adjust by min" hint="kcal/day">
            <NumberStepper
              value={rules.kcalAdjustStep.min}
              step={25}
              onChange={(v) => write({ kcalAdjustStep: { ...rules.kcalAdjustStep, min: v } })}
              aria-label="Minimum calorie adjustment"
            />
          </Field>
          <Field label="Adjust by max" hint="kcal/day">
            <NumberStepper
              value={rules.kcalAdjustStep.max}
              step={25}
              onChange={(v) => write({ kcalAdjustStep: { ...rules.kcalAdjustStep, max: v } })}
              aria-label="Maximum calorie adjustment"
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Wait" hint="weeks before changing anything">
            <NumberStepper
              value={rules.lookbackWeeks}
              min={1}
              max={12}
              onChange={(v) => write({ lookbackWeeks: v })}
              aria-label="Lookback weeks"
            />
          </Field>
          <Field label="Weigh-ins" hint="minimum per week to judge">
            <NumberStepper
              value={rules.minReadingsPerWeek}
              min={1}
              max={7}
              onChange={(v) => write({ minReadingsPerWeek: v })}
              aria-label="Minimum weigh-ins per week"
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Upper-body jump" hint="kg when a lift maxes out">
            <NumberStepper
              value={rules.progression.incrementKgUpper}
              step={1.25}
              onChange={(v) =>
                write({ progression: { ...rules.progression, incrementKgUpper: v } })
              }
              suffix="kg"
              aria-label="Upper body increment"
            />
          </Field>
          <Field label="Lower-body jump" hint="kg when a lift maxes out">
            <NumberStepper
              value={rules.progression.incrementKgLower}
              step={2.5}
              onChange={(v) =>
                write({ progression: { ...rules.progression, incrementKgLower: v } })
              }
              suffix="kg"
              aria-label="Lower body increment"
            />
          </Field>
        </FieldRow>
      </div>
    </section>
  )
}
