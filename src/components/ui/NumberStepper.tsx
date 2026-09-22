import { Minus, Plus } from 'lucide-react'

interface Props {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  /** Shown after the number — "g", "kcal", "reps". */
  suffix?: string
  'aria-label'?: string
}

/**
 * Thumb-first numeric input. It gets used standing between sets, so the
 * steppers matter more than the keyboard — but the field stays typable for the
 * cases where +/- would take twenty taps.
 */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  suffix,
  'aria-label': ariaLabel,
}: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  // Avoid 0.30000000000000004 when stepping by 2.5 or 0.1.
  const round = (v: number) => Math.round(v * 1000) / 1000

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(clamp(round(value - step)))}
        className="grid w-11 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-slate-100 dark:border-slate-700 dark:active:bg-slate-800"
      >
        <Minus size={16} />
      </button>

      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          aria-label={ariaLabel}
          value={Number.isFinite(value) ? value : ''}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value)
            onChange(e.target.value === '' ? min : clamp(n))
          }}
          className="field text-center font-semibold tabular-nums"
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(clamp(round(value + step)))}
        className="grid w-11 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-slate-100 dark:border-slate-700 dark:active:bg-slate-800"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
