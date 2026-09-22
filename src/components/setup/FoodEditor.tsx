import { useState } from 'react'
import { Apple, Archive, Pencil, RotateCcw } from 'lucide-react'
import type { Food, Unit } from '../../types'
import { useRegistry } from '../../hooks/useRegistry'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, Select, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SectionHeader } from '../ui/SectionHeader'
import { SearchList } from '../ui/SearchList'
import { Chip } from '../ui/Chip'

type Draft = {
  id?: string
  name: string
  category: string
  unit: Unit
  per: number
  kcal: number
  proteinG: number
  carbG: number
  fatG: number
  /** Grams in one piece. Only meaningful for piece-based foods. */
  gramsPerPiece: number
}

function blank(): Draft {
  return {
    name: '',
    category: '',
    unit: 'g',
    per: 100,
    kcal: 0,
    proteinG: 0,
    carbG: 0,
    fatG: 0,
    gramsPerPiece: 0,
  }
}

function toDraft(f: Food): Draft {
  return {
    id: f.id,
    name: f.name,
    category: f.category ?? '',
    unit: f.basis.unit,
    per: f.basis.qty,
    kcal: f.basis.kcal,
    proteinG: f.basis.proteinG,
    carbG: f.basis.carbG ?? 0,
    fatG: f.basis.fatG ?? 0,
    // conversions.g is "pieces per gram", so the round trip is 1/x.
    gramsPerPiece: f.conversions?.g ? Math.round((1 / f.conversions.g) * 10) / 10 : 0,
  }
}

/**
 * The food library.
 *
 * The seeded values are approximations for home cooking — how much oil goes
 * into a dosa is household-specific — so this editor is the correction
 * mechanism, not an admin afterthought. Correcting a food changes future logs;
 * past logs keep the basis they were recorded with.
 */
export function FoodEditor() {
  const { items, all, create, update, archive } = useRegistry('foods')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const archived = all.filter((f) => f.archived)
  const shown = showArchived ? archived : items

  const save = () => {
    if (!draft || !draft.name.trim()) return
    const rec = {
      id: draft.id,
      name: draft.name.trim(),
      category: draft.category.trim() || undefined,
      unit: draft.unit,
      basis: {
        qty: draft.per || 1,
        unit: draft.unit,
        kcal: draft.kcal,
        proteinG: draft.proteinG,
        carbG: draft.carbG || undefined,
        fatG: draft.fatG || undefined,
      },
      conversions:
        draft.unit === 'piece' && draft.gramsPerPiece > 0
          ? { g: 1 / draft.gramsPerPiece }
          : undefined,
    }
    if (rec.id) update(rec.id, rec as Partial<Food>)
    else create(rec as Omit<Food, 'id' | 'updatedAt'>)
    setDraft(null)
  }

  const perLabel = (f: Food) =>
    f.basis.qty === 1 ? `per ${f.basis.unit}` : `per ${f.basis.qty} ${f.basis.unit}`

  return (
    <section>
      <SectionHeader title="Foods" count={items.length} onAdd={() => setDraft(blank())} />

      <div className="mb-3 flex gap-2">
        <Chip label="Active" active={!showArchived} onClick={() => setShowArchived(false)} />
        <Chip
          label={`Archived ${archived.length}`}
          active={showArchived}
          onClick={() => setShowArchived(true)}
        />
      </div>

      <SearchList
        items={shown}
        keyOf={(f) => `${f.name} ${f.category ?? ''} ${(f.tags ?? []).join(' ')}`}
        placeholder="Search foods…"
        empty={showArchived ? 'Nothing archived.' : 'No foods yet.'}
        render={(f) => (
          <li key={f.id} className="card flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{f.name}</p>
              <p className="text-xs text-slate-400">
                {Math.round(f.basis.kcal)} kcal · {Math.round(f.basis.proteinG * 10) / 10} g protein{' '}
                {perLabel(f)}
                {f.conversions?.g ? ` · ${Math.round((1 / f.conversions.g) * 10) / 10} g each` : ''}
              </p>
            </div>
            {f.category && <Chip label={f.category} tone="muted" />}
            <button
              type="button"
              aria-label={`Edit ${f.name}`}
              onClick={() => setDraft(toDraft(f))}
              className="grid h-9 w-9 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              aria-label={f.archived ? `Restore ${f.name}` : `Archive ${f.name}`}
              onClick={() => archive(f.id, !f.archived)}
              className="grid h-9 w-9 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {f.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
            </button>
          </li>
        )}
      />

      {items.length === 0 && !showArchived && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Apple size={12} /> Add the foods you actually cook.
        </p>
      )}

      <Sheet
        open={draft !== null}
        title={draft?.id ? 'Edit food' : 'Add food'}
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
                  placeholder="Ragi puttu"
                />
              </Field>
              <Field label="Category">
                <TextInput
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="Grains"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="Measured in">
                <Select
                  value={draft.unit}
                  onChange={(e) => {
                    const unit = e.target.value as Unit
                    // A piece-based food is quoted per 1; weight and volume per 100.
                    setDraft({ ...draft, unit, per: unit === 'piece' ? 1 : 100 })
                  }}
                >
                  <option value="g">grams</option>
                  <option value="ml">millilitres</option>
                  <option value="piece">pieces</option>
                </Select>
              </Field>
              <Field label="Macros per">
                <NumberStepper
                  value={draft.per}
                  step={draft.unit === 'piece' ? 1 : 10}
                  min={1}
                  onChange={(v) => setDraft({ ...draft, per: v })}
                  suffix={draft.unit}
                  aria-label="Basis quantity"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="Calories">
                <NumberStepper
                  value={draft.kcal}
                  step={5}
                  onChange={(v) => setDraft({ ...draft, kcal: v })}
                  suffix="kcal"
                  aria-label="Calories"
                />
              </Field>
              <Field label="Protein">
                <NumberStepper
                  value={draft.proteinG}
                  step={0.5}
                  onChange={(v) => setDraft({ ...draft, proteinG: v })}
                  suffix="g"
                  aria-label="Protein"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="Carbs">
                <NumberStepper
                  value={draft.carbG}
                  step={1}
                  onChange={(v) => setDraft({ ...draft, carbG: v })}
                  suffix="g"
                  aria-label="Carbohydrate"
                />
              </Field>
              <Field label="Fat">
                <NumberStepper
                  value={draft.fatG}
                  step={0.5}
                  onChange={(v) => setDraft({ ...draft, fatG: v })}
                  suffix="g"
                  aria-label="Fat"
                />
              </Field>
            </FieldRow>

            {draft.unit === 'piece' && (
              <Field
                label="Weight of one piece"
                hint="Lets the same food be logged as “3 idli” or by weight. Leave at 0 if you only ever count pieces."
              >
                <NumberStepper
                  value={draft.gramsPerPiece}
                  step={5}
                  onChange={(v) => setDraft({ ...draft, gramsPerPiece: v })}
                  suffix="g"
                  aria-label="Grams per piece"
                />
              </Field>
            )}
          </div>
        )}
      </Sheet>
    </section>
  )
}
