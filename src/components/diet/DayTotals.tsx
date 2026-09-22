import { AlertTriangle } from 'lucide-react'
import type { Range } from '../../types'
import type { MacroTotal } from '../../utils/macros'
import { MacroBar } from './MacroBar'

interface Props {
  macros: MacroTotal
  kcal: Range
  proteinG: Range
}

export function DayTotals({ macros, kcal, proteinG }: Props) {
  const { total, incomplete } = macros
  return (
    <section className="card space-y-3">
      <MacroBar
        label="Calories"
        value={total.kcal}
        target={kcal}
        unit="kcal"
        atLeast={incomplete}
      />
      <MacroBar
        label="Protein"
        value={total.proteinG}
        target={proteinG}
        unit="g"
        atLeast={incomplete}
      />
      <div className="flex gap-4 text-xs text-slate-400">
        <span>Carbs {Math.round(total.carbG)} g</span>
        <span>Fat {Math.round(total.fatG)} g</span>
      </div>
      {incomplete && (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle size={12} className="mt-0.5 flex-none" />
          An item has no macros for the unit it was logged in, so the real total is higher.
        </p>
      )}
    </section>
  )
}
