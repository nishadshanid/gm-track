import type { Exercise, Food, LoggedAmount, Unit } from '../types'
import { unitsFor } from './macros.ts'

/**
 * Names from the model, resolved locally against the library.
 *
 * The model is given the library as vocabulary, but it is still a language
 * model: it can return "steamed rice cake" for idli, or invent "protein bar"
 * outright. Nothing it says becomes a food id — matching happens here, against
 * the real library, and anything that does not match is surfaced as unmatched
 * for the person to fix. A confidently wrong guess silently logged as 500 kcal
 * is worse than an honest "I didn't recognise that".
 */

export interface Match<T> {
  item: T
  /** 'exact' and 'prefix' are safe to apply; 'fuzzy' is shown for confirmation. */
  how: 'exact' | 'prefix' | 'fuzzy'
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // drop qualifiers: "Egg (whole)" -> "egg"
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokens = (s: string) => new Set(norm(s).split(' ').filter(Boolean))

function shared(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const t of a) if (b.has(t)) n++
  return n
}

/**
 * Best match for a name, or undefined.
 *
 * Tried in order of confidence. The fuzzy pass requires one name's words to be
 * a complete subset of the other's, which catches "boiled egg" -> Egg while
 * rejecting "protein bar" against Whey protein.
 *
 * It cannot tell a preparation from a different ingredient: "boiled egg" -> Egg
 * is right and "quinoa salad" -> Salad is wrong, and both are the same shape to
 * a string matcher. Rather than refuse both, a subset match is returned as
 * 'fuzzy' and the review sheet shows what it swapped, so the person corrects it
 * before anything is written. Losing an entry is worse than showing a guess
 * that is visibly a guess.
 */
export function matchByName<T extends { name: string }>(
  name: string,
  items: T[],
): Match<T> | undefined {
  const q = norm(name)
  if (!q) return undefined

  const exact = items.find((i) => norm(i.name) === q)
  if (exact) return { item: exact, how: 'exact' }

  const prefix = items.find((i) => norm(i.name).startsWith(q) || q.startsWith(norm(i.name)))
  if (prefix) return { item: prefix, how: 'prefix' }

  const qt = tokens(q)
  let best: { item: T; hits: number; extra: number } | undefined
  for (const item of items) {
    const it = tokens(item.name)
    const hits = shared(qt, it)
    if (hits === 0) continue
    // One name's words must fully contain the other's.
    if (hits < Math.min(qt.size, it.size)) continue
    const extra = Math.abs(qt.size - it.size)
    if (!best || hits > best.hits || (hits === best.hits && extra < best.extra)) {
      best = { item, hits, extra }
    }
  }
  return best ? { item: best.item, how: 'fuzzy' } : undefined
}

export interface ResolvedItem {
  food: Food
  amount: LoggedAmount
  how: Match<Food>['how']
  /** What the model called it, kept so the review sheet can show the swap. */
  said: string
}

export interface UnresolvedItem {
  said: string
  qty?: number
  unit?: string
  reason: 'no-such-food' | 'no-such-unit'
}

export interface ResolveResult {
  items: ResolvedItem[]
  unresolved: UnresolvedItem[]
}

/** Coerce whatever the model wrote into a unit the food actually supports. */
function resolveUnit(food: Food, said: string | undefined): Unit | undefined {
  const allowed = unitsFor(food)
  if (!said) return food.basis.unit
  const s = norm(said)
  const map: Record<string, Unit> = {
    g: 'g', gram: 'g', grams: 'g', gm: 'g',
    ml: 'ml', millilitre: 'ml', milliliter: 'ml', l: 'ml',
    piece: 'piece', pieces: 'piece', pc: 'piece', nos: 'piece', no: 'piece', count: 'piece',
  }
  const unit = map[s]
  if (!unit) return food.basis.unit
  return allowed.includes(unit) ? unit : food.basis.unit
}

export function resolveFoodItems(
  said: { food: string; qty?: number; unit?: string }[],
  foods: Food[],
): ResolveResult {
  const items: ResolvedItem[] = []
  const unresolved: UnresolvedItem[] = []

  for (const entry of said) {
    const match = matchByName(entry.food, foods)
    if (!match) {
      unresolved.push({ said: entry.food, qty: entry.qty, unit: entry.unit, reason: 'no-such-food' })
      continue
    }
    const unit = resolveUnit(match.item, entry.unit)
    if (!unit) {
      unresolved.push({ said: entry.food, qty: entry.qty, unit: entry.unit, reason: 'no-such-unit' })
      continue
    }
    // A missing or nonsensical quantity falls back to one of whatever the food
    // is quoted in, rather than guessing a number.
    const value =
      typeof entry.qty === 'number' && Number.isFinite(entry.qty) && entry.qty > 0
        ? entry.qty
        : match.item.basis.qty
    items.push({ food: match.item, amount: { value, unit }, how: match.how, said: entry.food })
  }

  return { items, unresolved }
}

export function resolveExercise(said: string, exercises: Exercise[]): Match<Exercise> | undefined {
  return matchByName(said, exercises)
}
