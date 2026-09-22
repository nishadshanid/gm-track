import type { Unit } from '../../types'
import { NumberStepper } from './NumberStepper'
import { Select } from './Field'

const UNITS: Unit[] = ['g', 'ml', 'piece']

interface Props {
  value: number
  unit: Unit
  onChange: (value: number, unit: Unit) => void
  /** Restrict the offered units — a food only offers what it can convert. */
  units?: Unit[]
  step?: number
}

export function UnitInput({ value, unit, onChange, units = UNITS, step }: Props) {
  // Grams and millilitres move in tens; pieces move one at a time.
  const guessedStep = step ?? (unit === 'piece' ? 1 : 10)

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <NumberStepper
          value={value}
          step={guessedStep}
          onChange={(v) => onChange(v, unit)}
          aria-label="Amount"
        />
      </div>
      <Select
        value={unit}
        onChange={(e) => onChange(value, e.target.value as Unit)}
        aria-label="Unit"
        className="w-24 flex-none"
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </Select>
    </div>
  )
}
