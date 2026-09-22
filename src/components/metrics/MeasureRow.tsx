import { NumberStepper } from '../ui/NumberStepper'

interface Props {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  hint?: string
}

/**
 * A tape measurement. Waist and hip matter for her specifically: the scale can
 * sit still for weeks while the tape keeps moving, and the plan says to track
 * both rather than only the weight.
 */
export function MeasureRow({ label, value, onChange, hint }: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
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
      <div className="mt-1.5">
        <NumberStepper
          value={value ?? 0}
          step={0.5}
          onChange={(v) => onChange(v || undefined)}
          suffix="cm"
          aria-label={`${label} in centimetres`}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
