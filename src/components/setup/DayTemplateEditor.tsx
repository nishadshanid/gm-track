import { useState } from 'react'
import { Archive, ChevronDown, Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Exercise, TemplateBlock, WorkoutDayTemplate } from '../../types'
import { store } from '../../services/store'
import { useData } from '../../hooks/useData'
import { usePerson } from '../../hooks/usePerson'
import { byId, selectable } from '../../services/selectors'
import { uid } from '../../utils/id'
import { scheme as fmtScheme } from '../../utils/format'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SectionHeader } from '../ui/SectionHeader'
import { SearchList } from '../ui/SearchList'
import { EmptyState } from '../ui/EmptyState'
import { Chip } from '../ui/Chip'

/**
 * Workout day templates for the active person.
 *
 * A template is the prescription: which exercises, how many sets, what rep
 * range. A logged session snapshots all of it, so editing here shapes future
 * sessions without rewriting past ones.
 */
export function DayTemplateEditor() {
  const data = useData()
  const { person } = usePerson()
  const [draft, setDraft] = useState<WorkoutDayTemplate | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  if (!person) return null

  const exercises: Exercise[] = selectable(data.exercises)
  const templates = selectable(data.dayTemplates)
    .filter((t) => t.personId === person.id)
    .sort((a, b) => a.order - b.order)

  const blank = (): WorkoutDayTemplate => ({
    id: uid(),
    updatedAt: '',
    personId: person.id,
    name: '',
    order: templates.length,
    blocks: [],
  })

  const set = (patch: Partial<WorkoutDayTemplate>) => draft && setDraft({ ...draft, ...patch })

  const setBlock = (id: string, patch: Partial<TemplateBlock>) =>
    draft &&
    setDraft({
      ...draft,
      blocks: draft.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })

  const addBlock = (exercise: Exercise) => {
    if (!draft) return
    const block: TemplateBlock = {
      id: uid(),
      exerciseId: exercise.id,
      scheme: exercise.defaultScheme ?? { sets: 3, repMin: 8, repMax: 12 },
      order: draft.blocks.length,
    }
    setDraft({ ...draft, blocks: [...draft.blocks, block] })
    setPicking(false)
  }

  const moveBlock = (id: string, delta: number) => {
    if (!draft) return
    const ordered = [...draft.blocks].sort((a, b) => a.order - b.order)
    const i = ordered.findIndex((b) => b.id === id)
    const j = i + delta
    if (j < 0 || j >= ordered.length) return
    const swapped = ordered.map((b, k) =>
      k === i ? { ...ordered[j], order: b.order } : k === j ? { ...ordered[i], order: b.order } : b,
    )
    setDraft({ ...draft, blocks: swapped })
  }

  const save = () => {
    if (!draft || !draft.name.trim()) return
    store.upsert('dayTemplates', { ...draft, name: draft.name.trim() })
    setDraft(null)
  }

  return (
    <section>
      <SectionHeader
        title={`Workout days · ${person.short}`}
        count={templates.length}
        onAdd={() => setDraft(blank())}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workout days"
          hint={`Add ${person.name}'s training days.`}
        />
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => {
            const open = expanded === t.id
            const working = t.blocks.filter((b) => !b.optional)
            return (
              <li key={t.id} className="card !p-0 overflow-hidden">
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : t.id)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{t.name}</span>
                      <span className="block truncate text-xs text-slate-400">
                        {working.length} exercises ·{' '}
                        {working.reduce((n, b) => n + b.scheme.sets, 0)} sets
                        {t.cardio ? ` · ${t.cardio.minutes} min cardio` : ''}
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`flex-none text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${t.name}`}
                    onClick={() => setDraft({ ...t })}
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Archive ${t.name}`}
                    onClick={() => store.patch('dayTemplates', t.id, { archived: true })}
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400"
                  >
                    <Archive size={14} />
                  </button>
                </div>

                {open && (
                  <ul className="space-y-1 border-t border-slate-100 p-3 dark:border-slate-800">
                    {[...t.blocks]
                      .sort((a, b) => a.order - b.order)
                      .map((b) => (
                        <li key={b.id} className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">
                            {byId(exercises, b.exerciseId)?.name ?? 'Unknown exercise'}
                            {b.optional && <span className="ml-1 text-xs text-slate-500">(optional)</span>}
                          </span>
                          <span className="flex-none text-xs tabular-nums text-slate-400">
                            {fmtScheme(b.scheme.sets, b.scheme.repMin, b.scheme.repMax)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Sheet
        open={draft !== null}
        title={draft && templates.some((t) => t.id === draft.id) ? 'Edit day' : 'Add day'}
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
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Chest + Triceps"
              />
            </Field>

            <FieldRow>
              <Field label="Cardio after" hint="0 = none">
                <NumberStepper
                  value={draft.cardio?.minutes ?? 0}
                  step={5}
                  onChange={(v) =>
                    set({
                      cardio: v
                        ? { label: draft.cardio?.label ?? 'Cardio', minutes: v }
                        : undefined,
                    })
                  }
                  suffix="min"
                  aria-label="Cardio minutes"
                />
              </Field>
              <Field label="Cardio type">
                <TextInput
                  value={draft.cardio?.label ?? ''}
                  onChange={(e) =>
                    set({
                      cardio: { label: e.target.value, minutes: draft.cardio?.minutes ?? 20 },
                    })
                  }
                  placeholder="Incline walking"
                />
              </Field>
            </FieldRow>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Exercises
                </span>
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="btn-ghost !py-1 text-accent"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {draft.blocks.length === 0 ? (
                <p className="py-3 text-sm text-slate-400">No exercises yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...draft.blocks]
                    .sort((a, b) => a.order - b.order)
                    .map((b, i, arr) => (
                      <li
                        key={b.id}
                        className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {byId(exercises, b.exerciseId)?.name ?? 'Unknown'}
                          </span>
                          <div className="flex flex-none flex-col">
                            <button
                              type="button"
                              aria-label="Move earlier"
                              disabled={i === 0}
                              onClick={() => moveBlock(b.id, -1)}
                              className="px-1 text-[10px] text-slate-400 disabled:opacity-20"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              aria-label="Move later"
                              disabled={i === arr.length - 1}
                              onClick={() => moveBlock(b.id, 1)}
                              className="px-1 text-[10px] text-slate-400 disabled:opacity-20"
                            >
                              ▼
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label="Remove exercise"
                            onClick={() =>
                              set({ blocks: draft.blocks.filter((x) => x.id !== b.id) })
                            }
                            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Field label="Sets">
                            <NumberStepper
                              value={b.scheme.sets}
                              min={1}
                              onChange={(v) =>
                                setBlock(b.id, { scheme: { ...b.scheme, sets: v } })
                              }
                              aria-label="Sets"
                            />
                          </Field>
                          <Field label="Min">
                            <NumberStepper
                              value={b.scheme.repMin}
                              min={1}
                              onChange={(v) =>
                                setBlock(b.id, { scheme: { ...b.scheme, repMin: v } })
                              }
                              aria-label="Minimum reps"
                            />
                          </Field>
                          <Field label="Max">
                            <NumberStepper
                              value={b.scheme.repMax}
                              min={1}
                              onChange={(v) =>
                                setBlock(b.id, { scheme: { ...b.scheme, repMax: v } })
                              }
                              aria-label="Maximum reps"
                            />
                          </Field>
                        </div>

                        <button
                          type="button"
                          onClick={() => setBlock(b.id, { optional: !b.optional })}
                          className="mt-2"
                        >
                          <Chip
                            label={b.optional ? 'optional' : 'required'}
                            active={!b.optional}
                            onClick={() => setBlock(b.id, { optional: !b.optional })}
                          />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={picking} title="Add exercise" onClose={() => setPicking(false)}>
        <SearchList
          items={exercises}
          keyOf={(e) => `${e.name} ${e.muscleGroups.join(' ')}`}
          searchFrom={1}
          placeholder="Search exercises…"
          empty="No exercises in the library."
          render={(e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => addBlock(e)}
                className="flex w-full items-baseline justify-between gap-2 rounded-xl px-1 py-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.name}</span>
                <span className="flex-none text-xs text-slate-400">
                  {e.muscleGroups.slice(0, 2).join(' · ')}
                </span>
              </button>
            </li>
          )}
        />
      </Sheet>
    </section>
  )
}
