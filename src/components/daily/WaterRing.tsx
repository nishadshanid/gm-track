import { Droplet, Undo2 } from 'lucide-react'
import { litres } from '../../utils/format'

interface Props {
  ml: number
  targetMl: number
  stepMl: number
  onAdd: (ml: number) => void
  onUndo: () => void
}

/**
 * Water for the day.
 *
 * Each tap appends an entry rather than incrementing a number — see
 * `useDaily.addWater`. That is what makes two taps from two phones both count.
 */
export function WaterRing({ ml, targetMl, stepMl, onAdd, onUndo }: Props) {
  const pct = targetMl > 0 ? Math.min(1, ml / targetMl) : 0
  const glasses = Math.max(1, Math.ceil(targetMl / stepMl))
  const filled = Math.floor(ml / stepMl)

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-400">
          <Droplet size={14} /> Water
        </h2>
        <span className="text-sm font-semibold tabular-nums">
          {litres(ml)}
          <span className="ml-1 text-xs font-normal text-slate-400">/ {litres(targetMl)}</span>
        </span>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Water drunk today"
      >
        {Array.from({ length: glasses }, (_, i) => (
          <span
            key={i}
            className={`h-6 flex-1 rounded-md transition-colors ${
              i < filled ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onAdd(stepMl)} className="btn-primary flex-1">
          + {stepMl} ml
        </button>
        <button type="button" onClick={() => onAdd(stepMl * 2)} className="btn-ghost flex-1">
          + {stepMl * 2} ml
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={ml === 0}
          aria-label="Undo last glass"
          className="btn-ghost flex-none disabled:opacity-30"
        >
          <Undo2 size={16} />
        </button>
      </div>
    </section>
  )
}
