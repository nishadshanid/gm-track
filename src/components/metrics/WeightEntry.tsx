import { Scale } from 'lucide-react'
import { NumberStepper } from '../ui/NumberStepper'

interface Props {
  value: number | undefined
  onChange: (value: number | undefined) => void
  label?: string
}

/**
 * This morning's weight.
 *
 * 0.1 kg steps, because that is the resolution people actually care about and
 * the resolution a bathroom scale reports.
 */
export function WeightEntry({ value, onChange, label = 'Weight' }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-400">
          <Scale size={14} /> {label}
        </h2>
        {value != null && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-slate-400 hover:text-danger"
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-3">
        <NumberStepper
          value={value ?? 0}
          step={0.1}
          onChange={(v) => onChange(v || undefined)}
          suffix="kg"
          aria-label="Weight in kilograms"
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Same conditions each time — morning, after the toilet, before eating.
      </p>
    </div>
  )
}
