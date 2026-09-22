import { Check, Trash2 } from 'lucide-react'
import type { SetLog } from '../../types'

interface Props {
  set: SetLog
  index: number
  /** Time-based exercises log seconds, not reps. */
  timed: boolean
  /** Bodyweight work has no load field until it is weighted. */
  loadable: boolean
  repMax: number
  onChange: (patch: Partial<SetLog>) => void
  onRemove: () => void
}

/**
 * One set. Weight and reps are steppers because this is used mid-set with one
 * hand, and the tick is the thing that actually records it — an untouched row
 * is a plan, not a result.
 */
export function SetRow({ set, index, timed, loadable, repMax, onChange, onRemove }: Props) {
  const value = timed ? (set.seconds ?? 0) : set.reps
  const step = timed ? 5 : 1
  const atTop = set.done && value >= repMax

  const bump = (delta: number) => {
    const next = Math.max(0, value + delta)
    onChange(timed ? { seconds: next } : { reps: next })
  }

  const cell =
    'h-11 w-full rounded-xl border bg-transparent text-center font-semibold tabular-nums outline-none focus:border-accent'

  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid h-7 w-7 flex-none place-items-center rounded-lg text-xs font-bold ${
          set.kind === 'warmup'
            ? 'bg-slate-200 text-slate-500 dark:bg-slate-800'
            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
        }`}
        title={set.kind === 'warmup' ? 'Warm-up set' : `Working set ${index + 1}`}
      >
        {set.kind === 'warmup' ? 'W' : index + 1}
      </span>

      {loadable && (
        <div className="flex flex-1 items-center gap-1">
          <button
            type="button"
            aria-label={`Decrease weight set ${index + 1}`}
            onClick={() => onChange({ weightKg: Math.max(0, (set.weightKg ?? 0) - 2.5) })}
            className="h-11 w-8 flex-none rounded-lg text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
          >
            −
          </button>
          <input
            type="number"
            inputMode="decimal"
            aria-label={`Weight set ${index + 1}`}
            value={set.weightKg ?? ''}
            placeholder="kg"
            step={2.5}
            onChange={(e) =>
              onChange({ weightKg: e.target.value === '' ? null : Number(e.target.value) })
            }
            className={`${cell} border-slate-200 dark:border-slate-700`}
          />
          <button
            type="button"
            aria-label={`Increase weight set ${index + 1}`}
            onClick={() => onChange({ weightKg: (set.weightKg ?? 0) + 2.5 })}
            className="h-11 w-8 flex-none rounded-lg text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
          >
            +
          </button>
        </div>
      )}

      <div className="flex flex-1 items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${timed ? 'seconds' : 'reps'} set ${index + 1}`}
          onClick={() => bump(-step)}
          className="h-11 w-8 flex-none rounded-lg text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-label={`${timed ? 'Seconds' : 'Reps'} set ${index + 1}`}
          value={value || ''}
          placeholder={timed ? 'sec' : 'reps'}
          onChange={(e) => {
            const n = Number(e.target.value)
            onChange(timed ? { seconds: n } : { reps: n })
          }}
          className={`${cell} ${
            atTop ? 'border-success text-success' : 'border-slate-200 dark:border-slate-700'
          }`}
        />
        <button
          type="button"
          aria-label={`Increase ${timed ? 'seconds' : 'reps'} set ${index + 1}`}
          onClick={() => bump(step)}
          className="h-11 w-8 flex-none rounded-lg text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
        >
          +
        </button>
      </div>

      <button
        type="button"
        aria-label={`${set.done ? 'Un-complete' : 'Complete'} set ${index + 1}`}
        aria-pressed={set.done}
        onClick={() => onChange({ done: !set.done })}
        className={`grid h-11 w-11 flex-none place-items-center rounded-xl border transition-colors ${
          set.done
            ? 'border-success bg-success text-white'
            : 'border-slate-200 text-slate-300 dark:border-slate-700'
        }`}
      >
        <Check size={18} />
      </button>

      <button
        type="button"
        aria-label={`Remove set ${index + 1}`}
        onClick={onRemove}
        className="grid h-11 w-7 flex-none place-items-center rounded-lg text-slate-400"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
