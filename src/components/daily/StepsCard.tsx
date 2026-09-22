import { Footprints } from 'lucide-react'
import { NumberStepper } from '../ui/NumberStepper'
import { clamp } from '../../utils/format'

interface Props {
  steps: number | undefined
  target: number
  onChange: (steps: number) => void
}

/**
 * Steps, typed in from a phone's health app.
 *
 * For her the plan treats 7–10k as load-bearing — easier to sustain than
 * burning the same energy through gym cardio, and the thing to raise before
 * cutting calories again.
 */
export function StepsCard({ steps, target, onChange }: Props) {
  const pct = target > 0 ? clamp((steps ?? 0) / target, 0, 1) : 0
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-400">
          <Footprints size={14} /> Steps
        </h2>
        <span className="text-sm font-semibold tabular-nums">
          {(steps ?? 0).toLocaleString()}
          <span className="ml-1 text-xs font-normal text-slate-400">
            / {target.toLocaleString()}
          </span>
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="mt-3">
        <NumberStepper
          value={steps ?? 0}
          step={500}
          onChange={onChange}
          aria-label="Steps today"
        />
      </div>
    </section>
  )
}
