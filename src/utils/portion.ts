import type { LoggedAmount, PlannedAmount, PortionPref } from '../types'

/**
 * Planned amounts carry a range — "200–300 g rice", "½–1 banana". A log cannot.
 * This is where the range collapses, using the person's own preference: the
 * gain plan takes the top of every range, the fat-loss plan the bottom. That
 * one setting is most of what separates the two plans from the same recipe.
 */
export function resolvePlanned(amount: PlannedAmount, pref: PortionPref): LoggedAmount {
  const max = amount.max ?? amount.value
  const min = amount.value
  const value = pref === 'min' ? min : pref === 'max' ? max : (min + max) / 2
  // A half-idli is nonsense; a half-gram is fine.
  const rounded = amount.unit === 'piece' ? Math.round(value * 2) / 2 : Math.round(value)
  return { value: rounded, unit: amount.unit }
}

export function isRange(amount: PlannedAmount): boolean {
  return amount.max != null && amount.max !== amount.value
}

/** "200–300 g", "2 piece" */
export function formatPlanned(amount: PlannedAmount): string {
  const unit = amount.unit === 'piece' ? '' : ` ${amount.unit}`
  return isRange(amount)
    ? `${amount.value}–${amount.max}${unit}`
    : `${amount.value}${unit}`
}
