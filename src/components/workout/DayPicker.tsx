import type { WorkoutDayTemplate } from '../../types'
import { Sheet } from '../ui/Sheet'

interface Props {
  open: boolean
  templates: WorkoutDayTemplate[]
  onPick: (template?: WorkoutDayTemplate) => void
  onClose: () => void
}

/**
 * Train a different day than the schedule says.
 *
 * Necessary rather than nice: real weeks slip, and a tracker that only lets you
 * log Monday's session on Monday gets abandoned the first time you go on
 * Tuesday instead.
 */
export function DayPicker({ open, templates, onPick, onClose }: Props) {
  return (
    <Sheet open={open} title="Which session?" onClose={onClose}>
      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onPick(t)}
              className="w-full rounded-2xl border border-slate-200 p-3 text-left dark:border-slate-700"
            >
              <span className="block font-semibold">{t.name}</span>
              <span className="block text-xs text-slate-400">
                {t.blocks.filter((b) => !b.optional).length} exercises
                {t.cardio ? ` · ${t.cardio.minutes} min ${t.cardio.label.toLowerCase()}` : ''}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onPick(undefined)}
            className="w-full rounded-2xl border border-dashed border-slate-300 p-3 text-left dark:border-slate-700"
          >
            <span className="block font-semibold">Empty session</span>
            <span className="block text-xs text-slate-400">Start blank and add exercises</span>
          </button>
        </li>
      </ul>
    </Sheet>
  )
}
