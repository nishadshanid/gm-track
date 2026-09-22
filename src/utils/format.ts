/** Display formatting. Values are summed unrounded and rounded once, here. */

export const kcal = (v: number) => `${Math.round(v)}`
export const grams = (v: number) => `${Math.round(v * 10) / 10} g`
export const kg = (v: number) => `${Math.round(v * 10) / 10} kg`
export const cm = (v: number) => `${Math.round(v * 10) / 10} cm`

/** Millilitres as litres once past 1 L, which is how the targets are written. */
export function litres(ml: number): string {
  return ml >= 1000 ? `${Math.round((ml / 1000) * 10) / 10} L` : `${Math.round(ml)} ml`
}

/** A macro value that could not be computed shows as an em dash, never 0. */
export const orDash = (v: number | null | undefined, fmt: (n: number) => string) =>
  v == null ? '—' : fmt(v)

export function range(min: number, max: number, fmt: (n: number) => string = String): string {
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`
}

/** "3 × 8–12" */
export function scheme(sets: number, repMin: number, repMax: number): string {
  return `${sets} × ${repMin === repMax ? repMin : `${repMin}–${repMax}`}`
}

export const pct = (v: number) => `${Math.round(v * 100)}%`

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
