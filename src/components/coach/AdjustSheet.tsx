import { useEffect, useState } from 'react'
import type { TargetProfile } from '../../types'
import type { Advice } from '../../utils/coach'
import { applyTo } from '../../utils/coach'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { kcal, range } from '../../utils/format'

interface Props {
  advice: Advice | null
  target: TargetProfile
  onConfirm: (delta: { kcalDelta?: number; stepsDelta?: number }) => void
  onClose: () => void
}

/**
 * Confirm a target change, with the proposed number editable.
 *
 * The plan's adjustment steps are ranges — 150–250 kcal, 100–150 kcal — not
 * exact figures, so the suggestion is a starting point the person can nudge
 * before it becomes their target. Nothing is written until Apply.
 */
export function AdjustSheet({ advice, target, onConfirm, onClose }: Props) {
  const [kcalDelta, setKcalDelta] = useState(0)
  const [stepsDelta, setStepsDelta] = useState(0)

  useEffect(() => {
    setKcalDelta(advice?.apply?.kcalDelta ?? 0)
    setStepsDelta(advice?.apply?.stepsDelta ?? 0)
  }, [advice])

  const next = applyTo(target, { kcalDelta, stepsDelta })
  const changesKcal = advice?.apply?.kcalDelta != null

  return (
    <Sheet
      open={advice !== null}
      title="Change the target"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => onConfirm(changesKcal ? { kcalDelta } : { stepsDelta })}
          >
            Apply
          </button>
        </div>
      }
    >
      {advice && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{advice.detail}</p>

          {changesKcal ? (
            <Field
              label="Calorie change"
              hint="The plan gives a range, so nudge it if you prefer."
            >
              <NumberStepper
                value={kcalDelta}
                step={25}
                min={-2000}
                onChange={setKcalDelta}
                suffix="kcal"
                aria-label="Calorie change"
              />
            </Field>
          ) : (
            <Field label="Step change">
              <NumberStepper
                value={stepsDelta}
                step={500}
                min={-20000}
                onChange={setStepsDelta}
                aria-label="Step change"
              />
            </Field>
          )}

          <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
            <p className="flex justify-between tabular-nums">
              <span className="text-slate-400">Calories</span>
              <span>
                {range(target.kcal.min, target.kcal.max, kcal)} →{' '}
                <span className="font-semibold">{range(next.kcal.min, next.kcal.max, kcal)}</span>
              </span>
            </p>
            <p className="mt-1 flex justify-between tabular-nums">
              <span className="text-slate-400">Steps</span>
              <span>
                {target.steps.toLocaleString()} →{' '}
                <span className="font-semibold">{next.steps.toLocaleString()}</span>
              </span>
            </p>
          </div>

          <p className="text-xs text-slate-500">
            This creates a new target effective today. Days already logged keep the target they
            were judged against.
          </p>
        </div>
      )}
    </Sheet>
  )
}
