import type { Food, MacroBasis, Unit } from '../../types'

/**
 * Starter food library — the Kerala staples both plans are built from.
 *
 * The numbers are ordinary approximations for home cooking, not laboratory
 * values: how much oil goes into a dosa and how thick the sambar is will always
 * be household-specific. They are here so the day's totals mean something on
 * day one, and every one of them is editable in Setup → Foods. Correcting a
 * food changes future logs; past logs keep the basis they were recorded with.
 *
 * Piece-based foods carry a gram conversion so "3 idli" and "135 g idli" both
 * resolve. Without it, logging an idli by weight yields no macros at all.
 */

interface Def {
  id: string
  name: string
  category: string
  unit: Unit
  /** kcal / protein / carbs / fat per `per` of `unit`. */
  per: number
  kcal: number
  p: number
  c?: number
  f?: number
  /** Grams in one piece — only for piece-based foods. */
  gramsPerPiece?: number
  tags?: string[]
}

const DEFS: Def[] = [
  // ── Carbohydrate bases ───────────────────────────────────────────────────
  { id: 'f-rice', name: 'Rice (cooked)', category: 'Grains', unit: 'g', per: 100, kcal: 130, p: 2.7, c: 28, f: 0.3, tags: ['carb'] },
  { id: 'f-idli', name: 'Idli', category: 'Grains', unit: 'piece', per: 1, kcal: 58, p: 2, c: 12, f: 0.2, gramsPerPiece: 45, tags: ['carb', 'breakfast'] },
  { id: 'f-dosa', name: 'Dosa (medium)', category: 'Grains', unit: 'piece', per: 1, kcal: 133, p: 3, c: 22, f: 3.7, gramsPerPiece: 60, tags: ['carb', 'breakfast'] },
  { id: 'f-puttu', name: 'Puttu (prepared)', category: 'Grains', unit: 'g', per: 100, kcal: 145, p: 2.5, c: 32, f: 0.6, tags: ['carb', 'breakfast'] },
  { id: 'f-appam', name: 'Appam', category: 'Grains', unit: 'piece', per: 1, kcal: 120, p: 2, c: 24, f: 1.8, gramsPerPiece: 60, tags: ['carb', 'breakfast'] },
  { id: 'f-chapathi', name: 'Chapathi', category: 'Grains', unit: 'piece', per: 1, kcal: 120, p: 3.5, c: 20, f: 3, gramsPerPiece: 45, tags: ['carb'] },
  { id: 'f-oats', name: 'Oats (dry)', category: 'Grains', unit: 'g', per: 100, kcal: 389, p: 17, c: 66, f: 7, tags: ['carb'] },
  { id: 'f-potato', name: 'Potato (boiled)', category: 'Vegetables', unit: 'g', per: 100, kcal: 87, p: 2, c: 20, f: 0.1, tags: ['carb'] },
  { id: 'f-sweet-potato', name: 'Sweet potato (boiled)', category: 'Vegetables', unit: 'g', per: 100, kcal: 86, p: 1.6, c: 20, f: 0.1, tags: ['carb'] },

  // ── Protein ──────────────────────────────────────────────────────────────
  { id: 'f-chicken', name: 'Chicken (cooked)', category: 'Protein', unit: 'g', per: 100, kcal: 165, p: 31, c: 0, f: 3.6, tags: ['protein'] },
  { id: 'f-chicken-curry', name: 'Chicken curry', category: 'Curry', unit: 'g', per: 100, kcal: 150, p: 12, c: 4, f: 9, tags: ['protein', 'curry'] },
  { id: 'f-egg', name: 'Egg (whole)', category: 'Protein', unit: 'piece', per: 1, kcal: 72, p: 6.3, c: 0.4, f: 5, gramsPerPiece: 50, tags: ['protein'] },
  { id: 'f-fish', name: 'Fish (cooked)', category: 'Protein', unit: 'g', per: 100, kcal: 140, p: 22, c: 0, f: 5, tags: ['protein'] },
  { id: 'f-paneer', name: 'Paneer', category: 'Protein', unit: 'g', per: 100, kcal: 265, p: 18, c: 3, f: 21, tags: ['protein', 'veg'] },
  { id: 'f-whey', name: 'Whey protein', category: 'Protein', unit: 'g', per: 30, kcal: 120, p: 24, c: 3, f: 1.5, tags: ['protein', 'supplement'] },

  // ── Dal, pulses, curries ─────────────────────────────────────────────────
  { id: 'f-dal', name: 'Dal (cooked)', category: 'Curry', unit: 'g', per: 100, kcal: 116, p: 9, c: 20, f: 0.4, tags: ['protein', 'veg'] },
  { id: 'f-sambar', name: 'Sambar', category: 'Curry', unit: 'ml', per: 100, kcal: 45, p: 2, c: 7, f: 1, tags: ['curry', 'veg'] },
  { id: 'f-kadala', name: 'Kadala curry', category: 'Curry', unit: 'g', per: 100, kcal: 130, p: 6, c: 18, f: 4, tags: ['protein', 'veg'] },
  { id: 'f-green-gram', name: 'Green gram (cooked)', category: 'Curry', unit: 'g', per: 100, kcal: 105, p: 7, c: 19, f: 0.4, tags: ['protein', 'veg'] },

  // ── Dairy ────────────────────────────────────────────────────────────────
  { id: 'f-milk', name: 'Milk (full fat)', category: 'Dairy', unit: 'ml', per: 100, kcal: 62, p: 3.2, c: 4.8, f: 3.3, tags: ['protein', 'dairy'] },
  { id: 'f-curd', name: 'Curd', category: 'Dairy', unit: 'g', per: 100, kcal: 61, p: 3.5, c: 4.7, f: 3.3, tags: ['protein', 'dairy'] },
  { id: 'f-buttermilk', name: 'Buttermilk', category: 'Dairy', unit: 'ml', per: 100, kcal: 35, p: 1.5, c: 4, f: 1 , tags: ['dairy'] },

  // ── Fats, nuts, seeds ────────────────────────────────────────────────────
  { id: 'f-peanuts', name: 'Peanuts', category: 'Nuts & fats', unit: 'g', per: 100, kcal: 567, p: 26, c: 16, f: 49, tags: ['fat', 'protein'] },
  { id: 'f-peanut-butter', name: 'Peanut butter', category: 'Nuts & fats', unit: 'g', per: 100, kcal: 588, p: 25, c: 20, f: 50, tags: ['fat', 'protein'] },
  { id: 'f-almond', name: 'Almond', category: 'Nuts & fats', unit: 'piece', per: 1, kcal: 7, p: 0.26, c: 0.24, f: 0.6, gramsPerPiece: 1.2, tags: ['fat'] },
  { id: 'f-coconut', name: 'Coconut (grated)', category: 'Nuts & fats', unit: 'g', per: 100, kcal: 354, p: 3.3, c: 15, f: 33, tags: ['fat'] },
  { id: 'f-coconut-oil', name: 'Coconut oil', category: 'Nuts & fats', unit: 'ml', per: 100, kcal: 862, p: 0, c: 0, f: 100, tags: ['fat'] },
  { id: 'f-ghee', name: 'Ghee', category: 'Nuts & fats', unit: 'g', per: 100, kcal: 900, p: 0, c: 0, f: 100, tags: ['fat'] },

  // ── Fruit ────────────────────────────────────────────────────────────────
  { id: 'f-banana', name: 'Banana (medium)', category: 'Fruit', unit: 'piece', per: 1, kcal: 105, p: 1.3, c: 27, f: 0.4, gramsPerPiece: 118, tags: ['carb', 'fruit'] },
  { id: 'f-banana-small', name: 'Banana (small)', category: 'Fruit', unit: 'piece', per: 1, kcal: 72, p: 0.9, c: 19, f: 0.3, gramsPerPiece: 81, tags: ['carb', 'fruit'] },
  { id: 'f-date', name: 'Date', category: 'Fruit', unit: 'piece', per: 1, kcal: 23, p: 0.2, c: 6, f: 0, gramsPerPiece: 8, tags: ['carb', 'fruit'] },
  { id: 'f-apple', name: 'Apple (medium)', category: 'Fruit', unit: 'piece', per: 1, kcal: 95, p: 0.5, c: 25, f: 0.3, gramsPerPiece: 180, tags: ['fruit'] },

  // ── Vegetables ───────────────────────────────────────────────────────────
  { id: 'f-veg-cooked', name: 'Mixed vegetables (cooked)', category: 'Vegetables', unit: 'g', per: 100, kcal: 60, p: 2.5, c: 10, f: 1.5, tags: ['veg'] },
  { id: 'f-thoran', name: 'Thoran / vegetable stir-fry', category: 'Vegetables', unit: 'g', per: 100, kcal: 90, p: 2, c: 8, f: 6, tags: ['veg'] },
  { id: 'f-salad', name: 'Salad (raw vegetables)', category: 'Vegetables', unit: 'g', per: 100, kcal: 25, p: 1.5, c: 4, f: 0.2, tags: ['veg'] },

  // ── Drinks ───────────────────────────────────────────────────────────────
  { id: 'f-tea-milk', name: 'Tea with milk & sugar', category: 'Drinks', unit: 'ml', per: 100, kcal: 40, p: 1.2, c: 5, f: 1.4, tags: ['drink'] },
  { id: 'f-coffee-black', name: 'Coffee (black)', category: 'Drinks', unit: 'ml', per: 100, kcal: 2, p: 0.1, c: 0, f: 0, tags: ['drink'] },
]

function basisOf(d: Def): MacroBasis {
  return { qty: d.per, unit: d.unit, kcal: d.kcal, proteinG: d.p, carbG: d.c, fatG: d.f }
}

export function seedFoods(at: string): Food[] {
  return DEFS.map((d) => ({
    id: d.id,
    updatedAt: at,
    name: d.name,
    category: d.category,
    unit: d.unit,
    basis: basisOf(d),
    // 1 g === 1/gramsPerPiece of a piece, so a gram amount converts into the
    // per-piece basis.
    conversions: d.gramsPerPiece ? { g: 1 / d.gramsPerPiece } : undefined,
    tags: d.tags,
  }))
}

/**
 * The unit each seeded food is logged in, so the seeded meal plans can write
 * "4 idli" and "250 g rice" without repeating the unit at every call site.
 */
export const FOOD_UNITS: Record<string, Unit> = Object.fromEntries(
  DEFS.map((d) => [d.id, d.unit]),
)
