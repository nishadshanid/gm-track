import { useState } from 'react'
import type { Food, LoggedAmount } from '../../types'
import { macrosOfFood } from '../../utils/macros'
import { Sheet } from '../ui/Sheet'
import { SearchList } from '../ui/SearchList'
import { UnitInput } from '../ui/UnitInput'
import { unitsFor } from '../../utils/macros'

interface Props {
  open: boolean
  foods: Food[]
  onAdd: (food: Food, amount: LoggedAmount) => void
  onClose: () => void
  onQuickAdd?: () => void
}

/** Add something to a meal that the plan did not include. */
export function FoodPicker({ open, foods, onAdd, onClose, onQuickAdd }: Props) {
  const [picked, setPicked] = useState<Food | null>(null)
  const [amount, setAmount] = useState<LoggedAmount>({ value: 100, unit: 'g' })

  const choose = (food: Food) => {
    setPicked(food)
    // Default to one of whatever the food is quoted in — one idli, 100 g rice.
    setAmount({ value: food.basis.qty, unit: food.basis.unit })
  }

  const close = () => {
    setPicked(null)
    onClose()
  }

  const preview = picked ? macrosOfFood(picked, amount) : null

  return (
    <Sheet
      open={open}
      title={picked ? picked.name : 'Add food'}
      onClose={close}
      footer={
        picked ? (
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setPicked(null)}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                onAdd(picked, amount)
                close()
              }}
            >
              Add
            </button>
          </div>
        ) : (
          onQuickAdd && (
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => {
                onQuickAdd()
                close()
              }}
            >
              Not in the list — enter macros by hand
            </button>
          )
        )
      }
    >
      {picked ? (
        <div className="space-y-4">
          <UnitInput
            value={amount.value}
            unit={amount.unit}
            units={unitsFor(picked)}
            onChange={(value, unit) => setAmount({ value, unit })}
          />
          <div className="rounded-xl bg-slate-100 p-3 text-sm tabular-nums dark:bg-slate-800">
            {preview ? (
              <div className="flex justify-between">
                <span className="font-semibold">{Math.round(preview.kcal)} kcal</span>
                <span className="text-slate-400">
                  {Math.round(preview.proteinG * 10) / 10} g protein
                </span>
              </div>
            ) : (
              <p className="text-xs text-warning">No conversion from {amount.unit}.</p>
            )}
          </div>
        </div>
      ) : (
        <SearchList
          items={foods}
          keyOf={(f) => `${f.name} ${f.category ?? ''} ${(f.tags ?? []).join(' ')}`}
          placeholder="Search foods…"
          searchFrom={1}
          empty="No foods in the library yet."
          render={(f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => choose(f)}
                className="flex w-full items-baseline justify-between gap-2 rounded-xl px-1 py-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                <span className="flex-none text-xs tabular-nums text-slate-400">
                  {Math.round(f.basis.kcal)} kcal /{' '}
                  {f.basis.qty === 1 ? f.basis.unit : `${f.basis.qty} ${f.basis.unit}`}
                </span>
              </button>
            </li>
          )}
        />
      )}
    </Sheet>
  )
}
