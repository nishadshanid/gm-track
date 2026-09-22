import type { Range } from '../../types'
import type { MacroTotal } from '../../utils/macros'
import { clamp } from '../../utils/format'

interface Props {
  macros: MacroTotal
  kcal: Range
  proteinG: Range
  waterMl: number
  waterTargetMl: number
}

interface RingProps {
  label: string
  value: number
  band: Range
  unit: string
  atLeast?: boolean
}

/**
 * Three compact meters: calories, protein, water.
 *
 * Bands, not single numbers — both plans prescribe a range, and 2,300 of
 * 2,200–2,400 is a hit rather than a near miss. Inside the band is green;
 * over the top is amber, not red, because eating 2,500 on a gain plan is not
 * a failure.
 */
function Ring({ label, value, band, unit, atLeast }: RingProps) {
  const scaleMax = band.max * 1.15
  const pct = (n: number) => clamp((n / scaleMax) * 100, 0, 100)
  const inBand = value >= band.min && value <= band.max
  const tone = value > band.max ? 'bg-warning' : inBand ? 'bg-success' : 'bg-accent'

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold tabular-nums">
          {atLeast && <span className="font-normal text-slate-400">≥ </span>}
          {Math.round(value)}
          <span className="ml-0.5 font-normal text-slate-400">
            /{band.max} {unit}
          </span>
        </span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="absolute inset-y-0 bg-slate-300/70 dark:bg-slate-700"
          style={{ left: `${pct(band.min)}%`, width: `${pct(band.max) - pct(band.min)}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${tone}`}
          style={{ width: `${pct(value)}%` }}
        />
      </div>
    </div>
  )
}

export function TodayRings({ macros, kcal, proteinG, waterMl, waterTargetMl }: Props) {
  return (
    <div className="space-y-2">
      <Ring
        label="Calories"
        value={macros.total.kcal}
        band={kcal}
        unit="kcal"
        atLeast={macros.incomplete}
      />
      <Ring
        label="Protein"
        value={macros.total.proteinG}
        band={proteinG}
        unit="g"
        atLeast={macros.incomplete}
      />
      <Ring
        label="Water"
        value={waterMl}
        band={{ min: waterTargetMl, max: waterTargetMl }}
        unit="ml"
      />
    </div>
  )
}
