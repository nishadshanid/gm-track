import { useEffect, useState } from 'react'
import type { Food, LoggedAmount, LoggedItem, Unit } from '../../types'
import { macrosOf, unitsFor } from '../../utils/macros'
import { Sheet } from '../ui/Sheet'
import { UnitInput } from '../ui/UnitInput'
import { Chip } from '../ui/Chip'

interface Props {
  item: LoggedItem | null
  food?: Food
  onSave: (amount: LoggedAmount) => void
  onClose: () => void
}

/** Edit how much of one thing was actually eaten. */
export function PortionSheet({ item, food, onSave, onClose }: Props) {
  const [amount, setAmount] = useState<LoggedAmount>({ value: 0, unit: 'g' })

  useEffect(() => {
    if (item) setAmount(item.amount)
  }, [item])

  // Only offer units this food can convert; anything else would compute to a
  // dash rather than a number.
  const units: Unit[] = food ? unitsFor(food) : [amount.unit]
  const preview = item ? macrosOf({ ...item, amount }) : null

  return (
    <Sheet
      open={item !== null}
      title={item?.foodName ?? 'Portion'}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-1" onClick={() => onSave(amount)}>
            Save
          </button>
        </div>
      }
    >
      {item && (
        <div className="space-y-4">
          <UnitInput
            value={amount.value}
            unit={amount.unit}
            units={units}
            onChange={(value, unit) => setAmount({ value, unit })}
          />

          {food?.servings && food.servings.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {food.servings.map((s) => (
                <Chip
                  key={s.label}
                  label={s.label}
                  onClick={() => setAmount({ value: s.qty, unit: s.unit })}
                />
              ))}
            </div>
          )}

          <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
            {preview ? (
              <div className="flex justify-between tabular-nums">
                <span className="font-semibold">{Math.round(preview.kcal)} kcal</span>
                <span className="text-slate-400">
                  {Math.round(preview.proteinG * 10) / 10} g protein
                </span>
              </div>
            ) : (
              <p className="text-xs text-warning">
                No conversion from {amount.unit} for this food, so it cannot be counted. Pick
                another unit, or add the conversion in Setup → Foods.
              </p>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
