import { useState } from 'react'
import { Archive, ChevronDown, Pencil, Plus, UtensilsCrossed } from 'lucide-react'
import type { MealOption, MealSlot } from '../../types'
import { store } from '../../services/store'
import { useData } from '../../hooks/useData'
import { usePerson } from '../../hooks/usePerson'
import { live, selectable } from '../../services/selectors'
import { uid } from '../../utils/id'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SectionHeader } from '../ui/SectionHeader'
import { EmptyState } from '../ui/EmptyState'
import { Chip } from '../ui/Chip'
import { MealOptionEditor } from './MealOptionEditor'

type SlotDraft = Omit<MealSlot, 'updatedAt'>

function blank(personId: string, order: number): SlotDraft {
  return { id: uid(), personId, name: '', order, timeHint: '', options: undefined } as SlotDraft
}

/**
 * The meal plan for the active person: slots, and the options under each.
 *
 * This is what makes the two seeded plans ordinary data. Rename "Mid-morning",
 * mark it optional, add a fifth breakfast option, drop the wake-up slot — the
 * Diet screen follows immediately, because it renders from here.
 */
export function MealSlotEditor() {
  const data = useData()
  const { person } = usePerson()
  const [slotDraft, setSlotDraft] = useState<SlotDraft | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [optionEdit, setOptionEdit] = useState<{ slotId: string; option: MealOption | null } | null>(
    null,
  )

  if (!person) return null

  const slots = selectable(data.mealSlots)
    .filter((s) => s.personId === person.id)
    .sort((a, b) => a.order - b.order)
  const allOptions = live(data.mealOptions)
  const optionsOf = (slotId: string) =>
    allOptions.filter((o) => o.slotId === slotId && !o.archived).sort((a, b) => a.order - b.order)

  const saveSlot = () => {
    if (!slotDraft || !slotDraft.name.trim()) return
    store.upsert('mealSlots', {
      ...slotDraft,
      updatedAt: '',
      name: slotDraft.name.trim(),
      timeHint: slotDraft.timeHint?.trim() || undefined,
    } as MealSlot)
    setSlotDraft(null)
  }

  const move = (slot: MealSlot, delta: number) => {
    const i = slots.findIndex((s) => s.id === slot.id)
    const j = i + delta
    if (j < 0 || j >= slots.length) return
    // Swap the two order values rather than renumbering everything.
    store.patch('mealSlots', slots[i].id, { order: slots[j].order })
    store.patch('mealSlots', slots[j].id, { order: slots[i].order })
  }

  return (
    <section>
      <SectionHeader
        title={`Meals · ${person.short}`}
        count={slots.length}
        onAdd={() => setSlotDraft(blank(person.id, slots.length))}
      />

      {slots.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No meal slots"
          hint={`Add ${person.name}'s eating occasions.`}
        />
      ) : (
        <ul className="space-y-2">
          {slots.map((slot, i) => {
            const options = optionsOf(slot.id)
            const open = expanded === slot.id
            return (
              <li key={slot.id} className="card !p-0 overflow-hidden">
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : slot.id)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">{slot.name}</span>
                        {slot.optional && <Chip label="optional" tone="muted" />}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {slot.timeHint ? `${slot.timeHint} · ` : ''}
                        {options.length} {options.length === 1 ? 'option' : 'options'}
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`flex-none text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <div className="flex flex-none flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${slot.name} earlier`}
                      disabled={i === 0}
                      onClick={() => move(slot, -1)}
                      className="px-1 text-xs text-slate-400 disabled:opacity-20"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${slot.name} later`}
                      disabled={i === slots.length - 1}
                      onClick={() => move(slot, 1)}
                      className="px-1 text-xs text-slate-400 disabled:opacity-20"
                    >
                      ▼
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-label={`Edit ${slot.name}`}
                    onClick={() => setSlotDraft({ ...slot })}
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Archive ${slot.name}`}
                    onClick={() => store.patch('mealSlots', slot.id, { archived: true })}
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400"
                  >
                    <Archive size={14} />
                  </button>
                </div>

                {open && (
                  <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
                    {slot.note && <p className="text-xs italic text-slate-500">{slot.note}</p>}
                    {options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setOptionEdit({ slotId: slot.id, option: o })}
                        className="flex w-full items-baseline gap-2 rounded-xl border border-slate-200 p-2.5 text-left dark:border-slate-700"
                      >
                        <span className="flex-none text-sm font-bold text-accent">{o.label}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{o.name}</span>
                          <span className="block text-xs text-slate-400">
                            {o.items.length} {o.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </span>
                        <Pencil size={13} className="flex-none text-slate-400" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setOptionEdit({ slotId: slot.id, option: null })}
                      className="btn-ghost w-full !py-1.5 text-accent"
                    >
                      <Plus size={14} /> Add option
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Sheet
        open={slotDraft !== null}
        title={slotDraft && slots.some((s) => s.id === slotDraft.id) ? 'Edit slot' : 'Add slot'}
        onClose={() => setSlotDraft(null)}
        footer={
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setSlotDraft(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={!slotDraft?.name.trim()}
              onClick={saveSlot}
            >
              Save
            </button>
          </div>
        }
      >
        {slotDraft && (
          <div className="space-y-4">
            <FieldRow>
              <Field label="Name">
                <TextInput
                  value={slotDraft.name}
                  onChange={(e) => setSlotDraft({ ...slotDraft, name: e.target.value })}
                  placeholder="Breakfast"
                />
              </Field>
              <Field label="Time">
                <TextInput
                  value={slotDraft.timeHint ?? ''}
                  onChange={(e) => setSlotDraft({ ...slotDraft, timeHint: e.target.value })}
                  placeholder="7:30–9:00 AM"
                />
              </Field>
            </FieldRow>

            <Field label="Note" hint="The reasoning behind this meal, shown while logging">
              <TextInput
                value={slotDraft.note ?? ''}
                onChange={(e) => setSlotDraft({ ...slotDraft, note: e.target.value })}
                placeholder="Don't make breakfast tiny"
              />
            </Field>

            <FieldRow>
              <Field label="Target kcal" hint="0 = no per-meal target">
                <NumberStepper
                  value={slotDraft.targetKcal ?? 0}
                  step={25}
                  onChange={(v) => setSlotDraft({ ...slotDraft, targetKcal: v || undefined })}
                  aria-label="Slot calorie target"
                />
              </Field>
              <Field label="Target protein">
                <NumberStepper
                  value={slotDraft.targetProteinG ?? 0}
                  step={5}
                  onChange={(v) => setSlotDraft({ ...slotDraft, targetProteinG: v || undefined })}
                  aria-label="Slot protein target"
                />
              </Field>
            </FieldRow>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <input
                type="checkbox"
                checked={Boolean(slotDraft.optional)}
                onChange={(e) => setSlotDraft({ ...slotDraft, optional: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm">
                Optional
                <span className="block text-xs text-slate-400">
                  Skipping it is not a miss — there is no need to eat every 2–3 hours
                </span>
              </span>
            </label>
          </div>
        )}
      </Sheet>

      {optionEdit && (
        <MealOptionEditor
          option={optionEdit.option}
          slotId={optionEdit.slotId}
          foods={selectable(data.foods)}
          onClose={() => setOptionEdit(null)}
        />
      )}
    </section>
  )
}
