import type { MealOption } from '../../types'
import type { Food, PortionPref } from '../../types'
import { byId } from '../../services/selectors'
import { macrosOfFood } from '../../utils/macros'
import { resolvePlanned, formatPlanned } from '../../utils/portion'

interface Props {
  options: MealOption[]
  foods: Food[]
  pref: PortionPref
  chosenId?: string
  onChoose: (option: MealOption) => void
}

/**
 * The option list for a slot — "Option A — Idli", "B — Dosa", "C — Puttu".
 *
 * Each option previews its own calories at this person's portion preference,
 * so the choice is informed before it is made. The same option shows different
 * numbers for him and for her, which is the whole point of one shared plan.
 */
export function OptionPicker({ options, foods, pref, chosenId, onChoose }: Props) {
  return (
    <ul className="space-y-2">
      {options.map((option) => {
        let kcal = 0
        let unknown = false
        const parts: string[] = []

        for (const pi of option.items) {
          const food = byId(foods, pi.foodId)
          if (!food) {
            unknown = true
            continue
          }
          const m = macrosOfFood(food, resolvePlanned(pi.amount, pref))
          if (m) kcal += m.kcal
          else unknown = true
          parts.push(`${formatPlanned(pi.amount)} ${food.name.toLowerCase()}`)
        }

        const chosen = option.id === chosenId
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onChoose(option)}
              aria-pressed={chosen}
              className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                chosen
                  ? 'border-accent bg-accent/5'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  <span className="text-accent">{option.label}</span> · {option.name}
                </span>
                <span className="flex-none text-xs tabular-nums text-slate-400">
                  {unknown ? '≥ ' : ''}
                  {Math.round(kcal)} kcal
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{parts.join(' · ')}</p>
              {option.note && <p className="mt-1 text-xs italic text-slate-500">{option.note}</p>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
