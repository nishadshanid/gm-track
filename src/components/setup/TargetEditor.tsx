import { useState } from 'react'
import { History, Pencil, Target } from 'lucide-react'
import type { TargetProfile } from '../../types'
import { useData } from '../../hooks/useData'
import { usePerson } from '../../hooks/usePerson'
import { store } from '../../services/store'
import { live, targetOn } from '../../services/selectors'
import { todayKey, friendlyDate } from '../../utils/date'
import { uid } from '../../utils/id'
import { kcal, litres, range } from '../../utils/format'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'
import { SectionHeader } from '../ui/SectionHeader'

type Draft = {
  kcalMin: number
  kcalMax: number
  proteinMin: number
  proteinMax: number
  waterMl: number
  steps: number
  note: string
}

function draftFrom(t: TargetProfile | undefined): Draft {
  return {
    kcalMin: t?.kcal.min ?? 2000,
    kcalMax: t?.kcal.max ?? 2200,
    proteinMin: t?.proteinG.min ?? 90,
    proteinMax: t?.proteinG.max ?? 100,
    waterMl: t?.waterMl ?? 2500,
    steps: t?.steps ?? 8000,
    note: t?.note ?? '',
  }
}

/**
 * Targets for the active person.
 *
 * Saving does NOT edit the current profile — it writes a new one effective
 * today. That is what lets the coaching engine change a target in Phase 6 while
 * a day logged last month is still judged against last month's numbers.
 */
export function TargetEditor() {
  const data = useData()
  const { person } = usePerson()
  const [draft, setDraft] = useState<Draft | null>(null)

  if (!person) return null

  const today = todayKey()
  const current = targetOn(data, person.id, today)
  const history = live(data.targets)
    .filter((t) => t.personId === person.id)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))

  const save = () => {
    if (!draft) return
    const existingToday = history.find((t) => t.effectiveFrom === today)
    const next: TargetProfile = {
      id: existingToday?.id ?? uid(),
      updatedAt: '',
      personId: person.id,
      effectiveFrom: today,
      kcal: { min: draft.kcalMin, max: Math.max(draft.kcalMin, draft.kcalMax) },
      proteinG: { min: draft.proteinMin, max: Math.max(draft.proteinMin, draft.proteinMax) },
      waterMl: draft.waterMl,
      steps: draft.steps,
      note: draft.note.trim() || undefined,
    }
    // Editing again on the same day replaces that day's profile rather than
    // stacking a second one with the same effectiveFrom.
    store.upsert('targets', next)
    setDraft(null)
  }

  return (
    <section className="mt-8">
      <SectionHeader
        title={`Targets · ${person.short}`}
        onAdd={() => setDraft(draftFrom(current))}
        addLabel={current ? 'Change' : 'Set'}
        addIcon={current ? Pencil : undefined}
      />

      {current ? (
        <div className="card">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Calories</dt>
              <dd className="font-semibold tabular-nums">
                {range(current.kcal.min, current.kcal.max, kcal)} kcal
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Protein</dt>
              <dd className="font-semibold tabular-nums">
                {range(current.proteinG.min, current.proteinG.max)} g
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Water</dt>
              <dd className="font-semibold tabular-nums">{litres(current.waterMl)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Steps</dt>
              <dd className="font-semibold tabular-nums">{current.steps.toLocaleString()}</dd>
            </div>
          </dl>
          {current.note && <p className="mt-3 text-xs text-slate-400">{current.note}</p>}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Target size={12} /> In force since {friendlyDate(current.effectiveFrom)}
          </p>
        </div>
      ) : (
        <div className="card text-sm text-slate-400">No targets set for {person.name} yet.</div>
      )}

      {history.length > 1 && (
        <details className="mt-3">
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
            <History size={12} /> {history.length - 1} earlier{' '}
            {history.length === 2 ? 'version' : 'versions'}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {history.slice(1).map((t) => (
              <li key={t.id} className="flex justify-between text-xs text-slate-400">
                <span>from {t.effectiveFrom}</span>
                <span className="tabular-nums">
                  {range(t.kcal.min, t.kcal.max, kcal)} kcal · {range(t.proteinG.min, t.proteinG.max)} g
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Sheet
        open={draft !== null}
        title={`Targets · ${person.name}`}
        onClose={() => setDraft(null)}
        footer={
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary flex-1" onClick={save}>
              Save
            </button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Saving creates a new target effective today. Days already logged keep the target they
              were judged against.
            </p>

            <FieldRow>
              <Field label="Calories min">
                <NumberStepper
                  value={draft.kcalMin}
                  step={50}
                  onChange={(v) => setDraft({ ...draft, kcalMin: v })}
                  suffix="kcal"
                  aria-label="Minimum calories"
                />
              </Field>
              <Field label="Calories max">
                <NumberStepper
                  value={draft.kcalMax}
                  step={50}
                  onChange={(v) => setDraft({ ...draft, kcalMax: v })}
                  suffix="kcal"
                  aria-label="Maximum calories"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="Protein min">
                <NumberStepper
                  value={draft.proteinMin}
                  step={5}
                  onChange={(v) => setDraft({ ...draft, proteinMin: v })}
                  suffix="g"
                  aria-label="Minimum protein"
                />
              </Field>
              <Field label="Protein max">
                <NumberStepper
                  value={draft.proteinMax}
                  step={5}
                  onChange={(v) => setDraft({ ...draft, proteinMax: v })}
                  suffix="g"
                  aria-label="Maximum protein"
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="Water">
                <NumberStepper
                  value={draft.waterMl}
                  step={250}
                  onChange={(v) => setDraft({ ...draft, waterMl: v })}
                  suffix="ml"
                  aria-label="Water target"
                />
              </Field>
              <Field label="Steps">
                <NumberStepper
                  value={draft.steps}
                  step={500}
                  onChange={(v) => setDraft({ ...draft, steps: v })}
                  aria-label="Step target"
                />
              </Field>
            </FieldRow>

            <Field label="Note">
              <TextInput
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="Why these numbers"
              />
            </Field>
          </div>
        )}
      </Sheet>
    </section>
  )
}
