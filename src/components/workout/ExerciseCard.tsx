import { useState } from 'react'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { SetLog } from '../../types'
import type { ExerciseView } from '../../hooks/useWorkouts'
import { scheme as fmtScheme } from '../../utils/format'
import { SetRow } from './SetRow'
import { PrevBest } from './PrevBest'
import { ProgressionHint } from './ProgressionHint'
import { Chip } from '../ui/Chip'

interface Props {
  view: ExerciseView
  onSetChange: (setId: string, patch: Partial<SetLog>) => void
  onApplyLoad: (targetKg: number) => void
  onAddSet: () => void
  onAddWarmup: () => void
  onRemoveSet: (setId: string) => void
  onRemove: () => void
}

export function ExerciseCard({
  view,
  onSetChange,
  onApplyLoad,
  onAddSet,
  onAddWarmup,
  onRemoveSet,
  onRemove,
}: Props) {
  const { entry, exercise, timed, prev, suggestion, doneSets } = view
  const [menu, setMenu] = useState(false)

  // Only exercises that actually carry load get a weight field. A dead bug
  // does not, and a pull-up does not until it is weighted.
  const loadable = exercise ? exercise.mode !== 'bodyweight-reps' && exercise.mode !== 'time' : true
  const sets = entry.sets.filter((s) => !s.deletedAt)
  const complete = doneSets >= entry.scheme.sets

  return (
    <li className="card space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-semibold">
            <span className="truncate">{entry.exerciseName}</span>
            {complete && <Chip label="done" tone="default" />}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Target {fmtScheme(entry.scheme.sets, entry.scheme.repMin, entry.scheme.repMax)}
            {timed ? ' sec' : ''}
            {exercise?.unilateral ? ' · per side' : ''}
            {' · '}
            {doneSets}/{entry.scheme.sets} logged
          </p>
        </div>
        <button
          type="button"
          aria-label={`Options for ${entry.exerciseName}`}
          onClick={() => setMenu(!menu)}
          className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {menu && (
        <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
          <button type="button" onClick={onAddWarmup} className="btn-ghost !py-1 text-xs">
            <Plus size={12} /> Warm-up set
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false)
              onRemove()
            }}
            className="btn-ghost !py-1 text-xs text-danger"
          >
            <Trash2 size={12} /> Remove exercise
          </button>
        </div>
      )}

      <PrevBest prev={prev} timed={timed} />

      <div className="space-y-2">
        {sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            index={set.kind === 'warmup' ? i : sets.filter((s, j) => j < i && s.kind !== 'warmup').length}
            timed={timed}
            loadable={loadable}
            repMax={entry.scheme.repMax}
            onChange={(patch) => onSetChange(set.id, patch)}
            onRemove={() => onRemoveSet(set.id)}
          />
        ))}
      </div>

      <button type="button" onClick={onAddSet} className="btn-ghost !py-1.5 text-xs text-accent">
        <Plus size={13} /> Add set
      </button>

      {suggestion && (
        <ProgressionHint
          suggestion={suggestion}
          onApply={loadable ? onApplyLoad : undefined}
        />
      )}

      {exercise?.cues && <p className="text-xs italic text-slate-500">{exercise.cues}</p>}
    </li>
  )
}
