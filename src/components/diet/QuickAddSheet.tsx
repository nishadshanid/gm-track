import { useState } from 'react'
import type { LoggedAmount, MacroBasis } from '../../types'
import { Sheet } from '../ui/Sheet'
import { Field, FieldRow, TextInput } from '../ui/Field'
import { NumberStepper } from '../ui/NumberStepper'

interface Props {
  open: boolean
  onAdd: (name: string, basis: MacroBasis, amount: LoggedAmount) => void
  onClose: () => void
}

/**
 * An ad-hoc entry with inline macros and no library food.
 *
 * This is not a nice-to-have. The first restaurant meal or someone's birthday
 * cake is where a tracker without it gets abandoned, because the day's total
 * becomes a known lie and there is nothing to do about it.
 */
export function QuickAddSheet({ open, onAdd, onClose }: Props) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState(300)
  const [protein, setProtein] = useState(10)

  const reset = () => {
    setName('')
    setKcal(300)
    setProtein(10)
  }

  return (
    <Sheet
      open={open}
      title="Quick add"
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!name.trim()}
            onClick={() => {
              // Quoted per serving, so the amount is simply "1".
              const basis: MacroBasis = {
                qty: 1,
                unit: 'piece',
                kcal,
                proteinG: protein,
              }
              onAdd(name.trim(), basis, { value: 1, unit: 'piece' })
              reset()
              onClose()
            }}
          >
            Add
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          For something eaten out, with no library entry. An estimate that is roughly right beats
          leaving the day short.
        </p>
        <Field label="What was it">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chicken biryani, restaurant"
          />
        </Field>
        <FieldRow>
          <Field label="Calories">
            <NumberStepper
              value={kcal}
              step={25}
              onChange={setKcal}
              suffix="kcal"
              aria-label="Calories"
            />
          </Field>
          <Field label="Protein">
            <NumberStepper
              value={protein}
              step={1}
              onChange={setProtein}
              suffix="g"
              aria-label="Protein"
            />
          </Field>
        </FieldRow>
      </div>
    </Sheet>
  )
}
