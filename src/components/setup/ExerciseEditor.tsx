import { useState } from 'react'
import { Archive, Pencil, RotateCcw } from 'lucide-react'
import type { Exercise, ExerciseMode } from '../../types'
import { useRegistry } from '../../hooks/useRegistry'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, Select, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SectionHeader } from '../ui/SectionHeader'
import { SearchList } from '../ui/SearchList'
import { Chip } from '../ui/Chip'
import { scheme as fmtScheme } from '../../utils/format'

const MODES: { value: ExerciseMode; label: string; hint: string }[] = [
  { value: 'weight-reps', label: 'Weight × reps', hint: 'Barbell, dumbbell, machine' },
  { value: 'bodyweight-reps', label: 'Bodyweight reps', hint: 'Push-ups, knee raises' },
  { value: 'weighted-bodyweight', label: 'Bodyweight + load', hint: 'Weighted pull-ups, dips' },
  { value: 'time', label: 'Time', hint: 'Planks — logged in seconds' },
  { value: 'distance', label: 'Cardio', hint: 'Treadmill, cycling — logged in minutes' },
]

type Draft = {
  id?: string
  name: string
  groups: string
  equipment: string
  mode: ExerciseMode
  unilateral: boolean
  sets: number
  repMin: number
  repMax: number
  cues: string
}

function blank(): Draft {
  return {
    name: '',
    groups: '',
    equipment: '',
    mode: 'weight-reps',
    unilateral: false,
    sets: 3,
    repMin: 8,
    repMax: 12,
    cues: '',
  }
}

function toDraft(e: Exercise): Draft {
  return {
    id: e.id,
    name: e.name,
    groups: e.muscleGroups.join(', '),
    equipment: e.equipment ?? '',
    mode: e.mode,
    unilateral: Boolean(e.unilateral),
    sets: e.defaultScheme?.sets ?? 3,
    repMin: e.defaultScheme?.repMin ?? 8,
    repMax: e.defaultScheme?.repMax ?? 12,
    cues: e.cues ?? '',
  }
}

/**
 * The exercise library.
 *
 * `mode` is the field that matters most: it decides what a set row asks for.
 * A plank wants seconds, a pull-up has no load until it is weighted, and a
 * split squat is per side — getting that wrong makes the log meaningless.
 */
export function ExerciseEditor() {
  const { items, all, create, update, archive } = useRegistry('exercises')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [group, setGroup] = useState<string | null>(null)

  const archived = all.filter((e) => e.archived)
  const groups = [...new Set(items.flatMap((e) => e.muscleGroups))].sort()
  const base = showArchived ? archived : items
  const shown = group ? base.filter((e) => e.muscleGroups.includes(group)) : base

  const save = () => {
    if (!draft || !draft.name.trim()) return
    const repMax = Math.max(draft.repMin, draft.repMax)
    const rec = {
      id: draft.id,
      name: draft.name.trim(),
      muscleGroups: draft.groups
        .split(',')
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean),
      equipment: draft.equipment.trim() || undefined,
      mode: draft.mode,
      unilateral: draft.unilateral || undefined,
      defaultScheme: { sets: draft.sets, repMin: draft.repMin, repMax },
      cues: draft.cues.trim() || undefined,
    }
    if (rec.id) update(rec.id, rec as Partial<Exercise>)
    else create(rec as Omit<Exercise, 'id' | 'updatedAt'>)
    setDraft(null)
  }

  return (
    <section>
      <SectionHeader title="Exercises" count={items.length} onAdd={() => setDraft(blank())} />

      <div className="mb-3 flex gap-2">
        <Chip label="Active" active={!showArchived} onClick={() => setShowArchived(false)} />
        <Chip
          label={`Archived ${archived.length}`}
          active={showArchived}
          onClick={() => setShowArchived(true)}
        />
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip label="All" active={group === null} onClick={() => setGroup(null)} />
        {groups.map((g) => (
          <Chip key={g} label={g} active={group === g} onClick={() => setGroup(g)} />
        ))}
      </div>

      <SearchList
        items={shown}
        keyOf={(e) => `${e.name} ${e.muscleGroups.join(' ')} ${e.equipment ?? ''}`}
        placeholder="Search exercises…"
        empty={showArchived ? 'Nothing archived.' : 'No exercises yet.'}
        render={(e) => (
          <li key={e.id} className="card flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{e.name}</p>
              <p className="text-xs text-slate-400">
                {e.muscleGroups.join(' · ')}
                {e.defaultScheme
                  ? ` · ${fmtScheme(e.defaultScheme.sets, e.defaultScheme.repMin, e.defaultScheme.repMax)}`
                  : ''}
                {e.mode === 'time' ? ' sec' : ''}
                {e.unilateral ? ' · per side' : ''}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Edit ${e.name}`}
              onClick={() => setDraft(toDraft(e))}
              className="grid h-9 w-9 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              aria-label={e.archived ? `Restore ${e.name}` : `Archive ${e.name}`}
              onClick={() => archive(e.id, !e.archived)}
              className="grid h-9 w-9 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {e.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
            </button>
          </li>
        )}
      />

      <Sheet
        open={draft !== null}
        title={draft?.id ? 'Edit exercise' : 'Add exercise'}
        onClose={() => setDraft(null)}
        footer={
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={!draft?.name.trim()}
              onClick={save}
            >
              Save
            </button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Name">
              <TextInput
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Incline dumbbell press"
              />
            </Field>

            <FieldRow>
              <Field label="Muscle groups" hint="Comma separated">
                <TextInput
                  value={draft.groups}
                  onChange={(e) => setDraft({ ...draft, groups: e.target.value })}
                  placeholder="chest, triceps"
                />
              </Field>
              <Field label="Equipment">
                <TextInput
                  value={draft.equipment}
                  onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
                  placeholder="dumbbell"
                />
              </Field>
            </FieldRow>

            <Field
              label="How it is logged"
              hint={MODES.find((m) => m.value === draft.mode)?.hint}
            >
              <Select
                value={draft.mode}
                onChange={(e) => setDraft({ ...draft, mode: e.target.value as ExerciseMode })}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Sets">
                <NumberStepper
                  value={draft.sets}
                  min={1}
                  onChange={(v) => setDraft({ ...draft, sets: v })}
                  aria-label="Default sets"
                />
              </Field>
              <Field label={draft.mode === 'time' ? 'Sec min' : 'Reps min'}>
                <NumberStepper
                  value={draft.repMin}
                  min={1}
                  step={draft.mode === 'time' ? 5 : 1}
                  onChange={(v) => setDraft({ ...draft, repMin: v })}
                  aria-label="Minimum reps"
                />
              </Field>
              <Field label={draft.mode === 'time' ? 'Sec max' : 'Reps max'}>
                <NumberStepper
                  value={draft.repMax}
                  min={1}
                  step={draft.mode === 'time' ? 5 : 1}
                  onChange={(v) => setDraft({ ...draft, repMax: v })}
                  aria-label="Maximum reps"
                />
              </Field>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <input
                type="checkbox"
                checked={draft.unilateral}
                onChange={(e) => setDraft({ ...draft, unilateral: e.target.checked })}
                className="h-4 w-4 accent-current text-accent"
              />
              <span className="text-sm">
                One side at a time
                <span className="block text-xs text-slate-400">
                  Split squats, single-arm rows — reps are per side
                </span>
              </span>
            </label>

            <Field label="Cues">
              <TextInput
                value={draft.cues}
                onChange={(e) => setDraft({ ...draft, cues: e.target.value })}
                placeholder="Keep 1–3 reps in reserve"
              />
            </Field>
          </div>
        )}
      </Sheet>
    </section>
  )
}
