import { useState } from 'react'
import { Archive, Pencil, Users } from 'lucide-react'
import type { Person, PortionPref } from '../../types'
import { useRegistry } from '../../hooks/useRegistry'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, Select, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SectionHeader } from '../ui/SectionHeader'
import { EmptyState } from '../ui/EmptyState'
import { Chip } from '../ui/Chip'

const COLORS: { label: string; rgb: string }[] = [
  { label: 'Blue', rgb: '37 99 235' },
  { label: 'Pink', rgb: '219 39 119' },
  { label: 'Emerald', rgb: '5 150 105' },
  { label: 'Amber', rgb: '217 119 6' },
  { label: 'Violet', rgb: '124 58 237' },
  { label: 'Rose', rgb: '225 29 72' },
]

type Draft = Omit<Person, 'id' | 'updatedAt'> & { id?: string }

function blank(order: number): Draft {
  return { name: '', short: '', color: COLORS[0].rgb, emoji: '🙂', portionDefault: 'mid', order }
}

/**
 * People are a registry, not a constant. Adding a third person here makes them
 * appear in the switcher, in the plans and in the logs with no code change —
 * which is the point of keeping the two seeded profiles as ordinary data.
 */
export function PeopleEditor() {
  const { items, all, create, update, archive } = useRegistry('people')
  const [draft, setDraft] = useState<Draft | null>(null)

  const save = () => {
    if (!draft || !draft.name.trim()) return
    const rec = { ...draft, name: draft.name.trim(), short: draft.short.trim() || draft.name.trim() }
    if (rec.id) update(rec.id, rec)
    else create(rec)
    setDraft(null)
  }

  const archived = all.filter((p) => p.archived)

  return (
    <section>
      <SectionHeader
        title="People"
        count={items.length}
        onAdd={() => setDraft(blank(items.length))}
      />

      {items.length === 0 ? (
        <EmptyState icon={Users} title="No one yet" hint="Add the people this app tracks." />
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="card flex items-center gap-3">
              <span
                className="grid h-10 w-10 flex-none place-items-center rounded-xl text-lg"
                style={{ backgroundColor: `rgb(${p.color} / 0.15)` }}
              >
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-xs text-slate-400">
                  {p.short} · portions: {p.portionDefault}
                  {p.heightCm ? ` · ${p.heightCm} cm` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Edit ${p.name}`}
                onClick={() => setDraft({ ...p })}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                aria-label={`Archive ${p.name}`}
                onClick={() => archive(p.id)}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Archive size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Archived:</span>
          {archived.map((p) => (
            <Chip key={p.id} label={`${p.name} · restore`} onClick={() => archive(p.id, false)} />
          ))}
        </div>
      )}

      <Sheet
        open={draft !== null}
        title={draft?.id ? 'Edit person' : 'Add person'}
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
            <FieldRow>
              <Field label="Name">
                <TextInput
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Nishad"
                />
              </Field>
              <Field label="Short label" hint="Shown on the switcher">
                <TextInput
                  value={draft.short}
                  onChange={(e) => setDraft({ ...draft, short: e.target.value })}
                  placeholder="Him"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="Emoji">
                <TextInput
                  value={draft.emoji ?? ''}
                  onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                  placeholder="👨"
                />
              </Field>
              <Field label="Colour">
                <Select
                  value={draft.color}
                  onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                >
                  {COLORS.map((c) => (
                    <option key={c.rgb} value={c.rgb}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldRow>

            <Field
              label="Default portion"
              hint="How a planned range like “200–300 g rice” is filled in when logging. Gaining takes the top, losing takes the bottom."
            >
              <Select
                value={draft.portionDefault}
                onChange={(e) =>
                  setDraft({ ...draft, portionDefault: e.target.value as PortionPref })
                }
              >
                <option value="min">Minimum — fat loss</option>
                <option value="mid">Middle</option>
                <option value="max">Maximum — weight gain</option>
              </Select>
            </Field>

            <FieldRow>
              <Field label="Height (cm)">
                <NumberStepper
                  value={draft.heightCm ?? 0}
                  step={1}
                  onChange={(v) => setDraft({ ...draft, heightCm: v || undefined })}
                  aria-label="Height in centimetres"
                />
              </Field>
              <Field label="Sex">
                <Select
                  value={draft.sex ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, sex: (e.target.value || undefined) as 'm' | 'f' | undefined })
                  }
                >
                  <option value="">Not set</option>
                  <option value="m">Male</option>
                  <option value="f">Female</option>
                </Select>
              </Field>
            </FieldRow>
          </div>
        )}
      </Sheet>
    </section>
  )
}
