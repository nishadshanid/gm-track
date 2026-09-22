import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Food, MealOption, PlannedItem, Unit } from '../../types'
import { store } from '../../services/store'
import { byId } from '../../services/selectors'
import { uid } from '../../utils/id'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SearchList } from '../ui/SearchList'

interface Props {
  option: MealOption | null
  slotId: string
  foods: Food[]
  onClose: () => void
}

/**
 * Edit one meal option — "Option A — Idli" and the items under it.
 *
 * Amounts here are planned, so they may be a range: "200–300 g rice". Leaving
 * the max at 0 means a single fixed amount.
 */
export function MealOptionEditor({ option, slotId, foods, onClose }: Props) {
  const [draft, setDraft] = useState<MealOption | null>(null)
  const [picking, setPicking] = useState(false)

  // Seed the draft the first time this opens for a given option.
  const current =
    draft && (option ? draft.id === option.id : draft.slotId === slotId)
      ? draft
      : option ?? {
          id: uid(),
          updatedAt: '',
          slotId,
          label: '',
          name: '',
          order: 99,
          items: [] as PlannedItem[],
        }

  const set = (patch: Partial<MealOption>) => setDraft({ ...current, ...patch })

  const setItem = (id: string, patch: Partial<PlannedItem>) =>
    set({ items: current.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })

  const addFood = (food: Food) => {
    const item: PlannedItem = {
      id: uid(),
      foodId: food.id,
      amount: { value: food.basis.qty, unit: food.basis.unit as Unit },
    }
    set({ items: [...current.items, item] })
    setPicking(false)
  }

  const save = () => {
    if (!current.name.trim()) return
    store.upsert('mealOptions', {
      ...current,
      label: current.label.trim() || String(current.order + 1),
      name: current.name.trim(),
    })
    setDraft(null)
    onClose()
  }

  return (
    <>
      <Sheet
        open={option !== null || draft !== null}
        title={option ? 'Edit option' : 'Add option'}
        onClose={() => {
          setDraft(null)
          onClose()
        }}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost flex-1"
              onClick={() => {
                setDraft(null)
                onClose()
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={!current.name.trim()}
              onClick={save}
            >
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <FieldRow>
            <Field label="Label" hint="A, B, C…">
              <TextInput
                value={current.label}
                onChange={(e) => set({ label: e.target.value })}
                placeholder="A"
              />
            </Field>
            <Field label="Name">
              <TextInput
                value={current.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Idli"
              />
            </Field>
          </FieldRow>

          <Field label="Note" hint="Shown under the option when choosing">
            <TextInput
              value={current.note ?? ''}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="Add a small banana if still hungry"
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Items
              </span>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="btn-ghost !py-1 text-accent"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {current.items.length === 0 ? (
              <p className="py-3 text-sm text-slate-400">Nothing in this option yet.</p>
            ) : (
              <ul className="space-y-3">
                {current.items.map((item) => {
                  const food = byId(foods, item.foodId)
                  return (
                    <li key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {food?.name ?? 'Unknown food'}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${food?.name ?? 'item'}`}
                          onClick={() =>
                            set({ items: current.items.filter((i) => i.id !== item.id) })
                          }
                          className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={`Amount (${item.amount.unit})`}>
                          <NumberStepper
                            value={item.amount.value}
                            step={item.amount.unit === 'piece' ? 1 : 10}
                            onChange={(v) =>
                              setItem(item.id, { amount: { ...item.amount, value: v } })
                            }
                            aria-label="Planned amount"
                          />
                        </Field>
                        <Field label="Up to" hint="0 = fixed amount">
                          <NumberStepper
                            value={item.amount.max ?? 0}
                            step={item.amount.unit === 'piece' ? 1 : 10}
                            onChange={(v) =>
                              setItem(item.id, {
                                amount: { ...item.amount, max: v || undefined },
                              })
                            }
                            aria-label="Planned maximum"
                          />
                        </Field>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </Sheet>

      <Sheet open={picking} title="Add item" onClose={() => setPicking(false)}>
        <SearchList
          items={foods}
          keyOf={(f) => f.name}
          searchFrom={1}
          placeholder="Search foods…"
          empty="No foods in the library."
          render={(f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => addFood(f)}
                className="w-full rounded-xl px-1 py-2 text-left text-sm font-medium"
              >
                {f.name}
              </button>
            </li>
          )}
        />
      </Sheet>
    </>
  )
}
