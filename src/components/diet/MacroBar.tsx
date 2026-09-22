import type { Range } from '../../types'
import { clamp } from '../../utils/format'

interface Props {
  label: string
  value: number
  target: Range
  unit: string
  /** An unresolved item means the real total is at least this much. */
  atLeast?: boolean
}

/**
 * Progress against a target *band*, not a single number — both plans specify a
 * range, and hitting 2,300 of 2,200–2,400 is the goal, not a near miss.
 * The band is drawn so under, inside and over are distinguishable at a glance.
 */
export function MacroBar({ label, value, target, unit, atLeast }: Props) {
  // Scale to a little past the top of the band so overshoot stays visible.
  const scaleMax = target.max * 1.15
  const pct = (n: number) => clamp((n / scaleMax) * 100, 0, 100)
  const inBand = value >= target.min && value <= target.max
  const over = value > target.max

  const tone = over ? 'bg-warning' : inBand ? 'bg-success' : 'bg-accent'

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold tabular-nums">
          {atLeast && <span className="text-slate-400">≥ </span>}
          {Math.round(value * 10) / 10}
          <span className="ml-1 text-xs font-normal text-slate-400">
            / {target.min}–{target.max} {unit}
          </span>
        </span>
      </div>

      <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        {/* The target band. */}
        <div
          className="absolute inset-y-0 bg-slate-300/70 dark:bg-slate-700"
          style={{ left: `${pct(target.min)}%`, width: `${pct(target.max) - pct(target.min)}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${tone}`}
          style={{ width: `${pct(value)}%` }}
        />
      </div>
    </div>
  )
}
