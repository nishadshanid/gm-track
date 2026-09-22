import type { Food, LoggedAmount, LoggedItem, MacroBasis, Macros, Unit } from '../types'

/**
 * The single multiplication site.
 *
 * Nothing stores a computed kcal or protein figure. A logged item stores the
 * amount and a frozen copy of the food's *basis*, and every total in the app
 * comes back through here. That removes a whole class of bug where one code
 * path edits a portion and forgets to recompute, so the displayed total
 * quietly disagrees with the items under it.
 */

export const ZERO: Macros = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 }

/**
 * Convert a logged amount into the units the basis is quoted in.
 *
 * `conversions[unit]` is "basis units per 1 of `unit`". An idli is quoted per
 * piece with `conversions.g = 1/45`, so 135 g resolves to 3 pieces.
 *
 * Returns null when the conversion is unknown — 200 ml of chicken means
 * nothing. Callers must render that as "—" rather than fall back to 0, or the
 * day's total silently understates what was eaten.
 */
export function toBasisUnits(
  amount: LoggedAmount,
  basis: MacroBasis,
  conversions?: Partial<Record<Unit, number>>,
): number | null {
  if (amount.unit === basis.unit) return amount.value
  const factor = conversions?.[amount.unit]
  if (factor == null || !Number.isFinite(factor)) return null
  return amount.value * factor
}

function scale(basis: MacroBasis, basisUnits: number): Macros {
  // basis.qty is "per 100 g" / "per 1 piece"; never divide by zero.
  const k = basis.qty > 0 ? basisUnits / basis.qty : 0
  return {
    kcal: basis.kcal * k,
    proteinG: basis.proteinG * k,
    carbG: (basis.carbG ?? 0) * k,
    fatG: (basis.fatG ?? 0) * k,
  }
}

/**
 * Macros for one logged item.
 *
 * Deliberately takes no Food: a log is self-contained. Correcting a food in the
 * library changes what future logs record, and the explicit "Recompute from
 * library" action is what pulls a correction into existing logs — so a fix to
 * idli's calories never silently rewrites last month's totals.
 */
export function macrosOf(item: LoggedItem): Macros | null {
  const units = toBasisUnits(item.amount, item.basisSnapshot, item.conversionsSnapshot)
  if (units == null) return null
  return scale(item.basisSnapshot, units)
}

/** Macros for a food at a given amount — used while logging, before an item exists. */
export function macrosOfFood(food: Food, amount: LoggedAmount): Macros | null {
  const units = toBasisUnits(amount, food.basis, food.conversions)
  if (units == null) return null
  return scale(food.basis, units)
}

export interface MacroTotal {
  total: Macros
  /** True when at least one item could not be resolved — show "≥" or a warning. */
  incomplete: boolean
}

/**
 * Sum unrounded. Rounding each item and then adding visibly drifts across six
 * eating occasions, so every total rounds exactly once, at display.
 */
export function sumMacros(values: (Macros | null)[]): MacroTotal {
  let incomplete = false
  const total = values.reduce<Macros>((acc, m) => {
    if (!m) {
      incomplete = true
      return acc
    }
    return {
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbG: acc.carbG + m.carbG,
      fatG: acc.fatG + m.fatG,
    }
  }, ZERO)
  return { total, incomplete }
}

export function itemsMacros(items: LoggedItem[]): MacroTotal {
  return sumMacros(items.filter((i) => !i.deletedAt).map(macrosOf))
}

/**
 * Refresh an item's frozen basis from the current library — the explicit
 * "Recompute from library" action. Returns the item unchanged when the food is
 * gone, so a deleted food cannot blank out a historical entry.
 */
export function recomputeFrom(item: LoggedItem, food: Food | undefined): LoggedItem {
  if (!food) return item
  return {
    ...item,
    foodName: food.name,
    basisSnapshot: { ...food.basis },
    conversionsSnapshot: food.conversions ? { ...food.conversions } : undefined,
  }
}

/** Which units a food can actually be logged in. */
export function unitsFor(food: Food): Unit[] {
  const units: Unit[] = [food.basis.unit]
  for (const u of Object.keys(food.conversions ?? {}) as Unit[]) {
    if (!units.includes(u)) units.push(u)
  }
  return units
}
