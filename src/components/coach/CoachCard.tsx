import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleCheck,
  Footprints,
  Info,
  Ruler,
  TriangleAlert,
} from 'lucide-react'
import type { Advice } from '../../utils/coach'

interface Props {
  advice: Advice
  onApply?: () => void
}

const ICONS = {
  hold: CircleCheck,
  'increase-kcal': ArrowUp,
  'decrease-kcal': ArrowDown,
  'eating-too-fast': ArrowDown,
  'add-steps': Footprints,
  'protein-low': Info,
  'recomp-progress': Ruler,
  'log-more': Info,
  'intake-mismatch': TriangleAlert,
} as const

/**
 * One piece of advice, with its evidence.
 *
 * The evidence is collapsible but always present. A recommendation to eat 200
 * more calories a day is worth acting on only if you can see the weeks and the
 * weigh-ins it was computed from — and if it looks wrong, that is exactly how
 * you find out why.
 */
export function CoachCard({ advice, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const Icon = ICONS[advice.kind] ?? Info
  const action = advice.severity === 'action'

  return (
    <section
      className={`card ${action ? 'border-accent/40' : ''}`}
      aria-label={advice.title}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`grid h-8 w-8 flex-none place-items-center rounded-xl ${
            advice.kind === 'hold' || advice.kind === 'recomp-progress'
              ? 'bg-success/15 text-success'
              : action
                ? 'bg-accent/10 text-accent'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          }`}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{advice.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{advice.detail}</p>
        </div>
      </div>

      {advice.apply && onApply && (
        <button type="button" onClick={onApply} className="btn-primary mt-3 w-full">
          {advice.apply.kcalDelta != null
            ? `Apply ${advice.apply.kcalDelta > 0 ? '+' : ''}${advice.apply.kcalDelta} kcal to the target`
            : `Raise the step target by ${advice.apply.stepsDelta?.toLocaleString()}`}
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-2 flex items-center gap-1 text-xs text-slate-400"
      >
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
        {open ? 'Hide' : 'Why'}
      </button>

      {open && (
        <ul className="mt-1.5 space-y-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-500 dark:border-slate-700">
          {advice.evidence.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
