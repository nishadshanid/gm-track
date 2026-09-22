import type { MealOption, MealSlot, PlannedItem, Unit } from '../../types'
import { FOOD_UNITS } from './foods.ts'
import { HER, HIM } from './people.ts'

/**
 * Both diet plans, as data.
 *
 * Transcribed from the two source documents, including their coaching lines —
 * "Don't make breakfast tiny", "Don't use all three options together, pick
 * one", "There is no requirement to eat every 2–3 hours". Those notes are the
 * reasoning behind the numbers, and they belong in the app rather than in a
 * chat transcript nobody reopens.
 *
 * Every slot, option, item and quantity here is editable in Setup → Meals.
 */

/** [foodId, amount] or [foodId, min, max] — the unit comes from the food. */
type ItemDef = [string, number] | [string, number, number]

interface OptionDef {
  label: string
  name: string
  note?: string
  items: ItemDef[]
}

interface SlotDef {
  id: string
  name: string
  timeHint: string
  optional?: boolean
  note?: string
  options: OptionDef[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Him — weight gain, 5–6 eating occasions
// ─────────────────────────────────────────────────────────────────────────────

const HIS_SLOTS: SlotDef[] = [
  {
    id: 'wake',
    name: 'Wake-up',
    timeHint: '6:30–7:00 AM',
    note: '300–500 ml water first. No need for a big meal straight after waking.',
    options: [{ label: 'A', name: 'Dates & almonds', items: [['f-date', 2], ['f-almond', 8, 10]] }],
  },
  {
    id: 'breakfast',
    name: 'Breakfast',
    timeHint: '7:30–9:00 AM',
    note: 'Pick one carbohydrate base. Don’t make breakfast tiny — this is one of your best chances to get calories in.',
    options: [
      {
        label: 'A',
        name: 'Idli',
        note: 'Add a small banana if still hungry.',
        items: [['f-idli', 4], ['f-egg', 2], ['f-sambar', 200]],
      },
      { label: 'B', name: 'Dosa', items: [['f-dosa', 2, 3], ['f-egg', 2], ['f-sambar', 200]] },
      {
        label: 'C',
        name: 'Puttu',
        items: [['f-puttu', 150, 180], ['f-egg', 2], ['f-kadala', 100, 200]],
      },
      {
        label: 'D',
        name: 'Appam',
        items: [['f-appam', 3], ['f-egg', 2], ['f-chicken-curry', 150]],
      },
    ],
  },
  {
    id: 'mid-morning',
    name: 'Mid-morning',
    timeHint: '11:00–11:30 AM',
    note: 'One of the most useful meals for you, because you are trying to eat more. Pick one option — not all three.',
    options: [
      {
        label: 'A',
        name: 'Weight-gain smoothie',
        note: 'Blend it. Carbohydrate + protein + fat in one glass.',
        items: [
          ['f-milk', 250],
          ['f-banana', 1],
          ['f-oats', 30, 40],
          ['f-peanut-butter', 15, 20],
          ['f-date', 2],
        ],
      },
      { label: 'B', name: 'Simple', items: [['f-banana', 1], ['f-egg', 2], ['f-milk', 250]] },
      { label: 'C', name: 'Banana & peanuts', items: [['f-banana', 1], ['f-egg', 2], ['f-peanuts', 25]] },
    ],
  },
  {
    id: 'lunch',
    name: 'Lunch',
    timeHint: '12:30–1:30 PM',
    note: 'One of your largest meals. If you are struggling to gain, raise the rice before adding more protein.',
    options: [
      {
        label: 'A',
        name: 'Rice, chicken & veg',
        items: [
          ['f-rice', 200, 300],
          ['f-chicken', 120, 150],
          ['f-egg', 1],
          ['f-veg-cooked', 150],
          ['f-dal', 100, 200],
          ['f-curd', 100],
        ],
      },
      {
        label: 'B',
        name: 'No chicken — eggs & dal',
        note: 'Swap in fish, kadala, paneer or curd just as readily.',
        items: [
          ['f-rice', 200, 300],
          ['f-egg', 3],
          ['f-dal', 200],
          ['f-veg-cooked', 150],
          ['f-curd', 100],
        ],
      },
    ],
  },
  {
    id: 'snack',
    name: 'Afternoon snack',
    timeHint: '4:00–4:30 PM',
    note: 'Another chance to add calories without making the main meals enormous.',
    options: [
      { label: 'A', name: 'Banana & milk', items: [['f-banana', 1], ['f-milk', 250]] },
      { label: 'B', name: 'Fruit & peanuts', items: [['f-apple', 1], ['f-peanuts', 20, 25]] },
      {
        label: 'C',
        name: 'Milk, dates & peanuts',
        items: [['f-milk', 250], ['f-date', 2], ['f-peanuts', 20]],
      },
    ],
  },
  {
    id: 'pre-workout',
    name: 'Pre-workout',
    timeHint: '6:30–7:00 PM',
    note: 'Keep it easy to digest. Two or three eggs immediately before training is unnecessary.',
    options: [
      { label: 'A', name: 'Banana & coffee', items: [['f-banana', 1], ['f-coffee-black', 150]] },
      { label: 'B', name: 'Banana & egg', items: [['f-banana', 1], ['f-egg', 1]] },
    ],
  },
  {
    id: 'dinner',
    name: 'Dinner / post-workout',
    timeHint: '9:15–10:00 PM',
    note: 'Another substantial meal. If you are still short on calories, 150–200 ml milk before bed.',
    options: [
      {
        label: 'A',
        name: 'Rice',
        items: [
          ['f-rice', 200, 250],
          ['f-chicken', 120, 150],
          ['f-egg', 1, 2],
          ['f-veg-cooked', 150],
          ['f-milk', 250],
        ],
      },
      {
        label: 'B',
        name: 'Chapathi',
        items: [
          ['f-chapathi', 3],
          ['f-chicken', 120, 150],
          ['f-egg', 1, 2],
          ['f-veg-cooked', 150],
          ['f-milk', 250],
        ],
      },
      {
        label: 'C',
        name: 'Dosa',
        items: [
          ['f-dosa', 2, 3],
          ['f-chicken', 120, 150],
          ['f-egg', 1, 2],
          ['f-sambar', 200],
          ['f-milk', 250],
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Her — fat loss, 3 meals + 1 optional snack
// ─────────────────────────────────────────────────────────────────────────────

const HER_SLOTS: SlotDef[] = [
  {
    id: 'wake',
    name: 'Morning',
    timeHint: '6:30–7:00 AM',
    optional: true,
    note: 'Water, and tea or coffee if you want it. No need for the dates-and-almonds meal unless you enjoy it.',
    options: [
      { label: 'A', name: 'Tea or coffee', items: [['f-tea-milk', 150]] },
      { label: 'B', name: 'Black coffee', items: [['f-coffee-black', 150]] },
    ],
  },
  {
    id: 'breakfast',
    name: 'Breakfast',
    timeHint: '7:30–9:00 AM',
    note: 'The same foods as his, in a controlled portion. There is no need to cut out dosa, idli or puttu.',
    options: [
      { label: 'A', name: 'Idli', items: [['f-idli', 2], ['f-egg', 2], ['f-sambar', 200]] },
      { label: 'B', name: 'Dosa', items: [['f-dosa', 1, 2], ['f-egg', 2], ['f-sambar', 200]] },
      {
        label: 'C',
        name: 'Puttu',
        items: [['f-puttu', 100, 120], ['f-egg', 1, 2], ['f-kadala', 100]],
      },
      { label: 'D', name: 'Appam', items: [['f-appam', 2], ['f-egg', 2], ['f-veg-cooked', 100]] },
    ],
  },
  {
    id: 'mid-morning',
    name: 'Mid-morning',
    timeHint: '11:00 AM',
    optional: true,
    note: 'The big difference from his plan: no mandatory meal here. If you are not hungry, skip it. There is no requirement to eat every 2–3 hours.',
    options: [
      { label: 'A', name: 'Small banana', items: [['f-banana-small', 1]] },
      { label: 'B', name: 'Curd', items: [['f-curd', 100, 150]] },
      { label: 'C', name: 'Egg & fruit', items: [['f-egg', 1], ['f-apple', 1]] },
    ],
  },
  {
    id: 'lunch',
    name: 'Lunch',
    timeHint: '12:30–1:30 PM',
    note: 'Plate rule: half vegetables or salad, a quarter chicken/egg/dal, a quarter rice. A useful default, not a daily obligation.',
    options: [
      {
        label: 'A',
        name: 'Rice, chicken & veg',
        items: [
          ['f-rice', 100, 150],
          ['f-chicken', 100, 120],
          ['f-egg', 1],
          ['f-veg-cooked', 200, 300],
          ['f-dal', 100, 200],
          ['f-curd', 100],
        ],
      },
    ],
  },
  {
    id: 'snack',
    name: 'Afternoon snack',
    timeHint: '4:00–5:00 PM',
    optional: true,
    note: 'Pick one. Avoid making tea + biscuits + fried mixture a habit — those calories add up without much protein or satiety.',
    options: [
      { label: 'A', name: 'Fruit & tea', items: [['f-apple', 1], ['f-tea-milk', 150]] },
      { label: 'B', name: 'Curd & fruit', items: [['f-curd', 100, 150], ['f-apple', 1]] },
      { label: 'C', name: 'Buttermilk & fruit', items: [['f-buttermilk', 200], ['f-apple', 1]] },
      { label: 'D', name: 'Peanuts & fruit', items: [['f-peanuts', 10, 15], ['f-apple', 1]] },
    ],
  },
  {
    id: 'pre-workout',
    name: 'Pre-workout',
    timeHint: '6:30–7:00 PM',
    note: 'Enough for most workouts. No large meal needed here.',
    options: [
      {
        label: 'A',
        name: 'Banana & coffee',
        items: [['f-banana-small', 0.5, 1], ['f-coffee-black', 150]],
      },
    ],
  },
  {
    id: 'dinner',
    name: 'Dinner',
    timeHint: '9:00–9:30 PM',
    note: 'Carbohydrates at night are fine. Eating rice in the evening does not itself cause belly fat — total daily intake is what matters.',
    options: [
      {
        label: 'A',
        name: 'Chapathi',
        items: [
          ['f-chapathi', 2],
          ['f-chicken', 100, 120],
          ['f-egg', 1],
          ['f-veg-cooked', 200],
          ['f-curd', 100],
        ],
      },
      {
        label: 'B',
        name: 'Rice',
        items: [
          ['f-rice', 100, 150],
          ['f-chicken', 100, 120],
          ['f-egg', 1],
          ['f-veg-cooked', 200],
        ],
      },
      {
        label: 'C',
        name: 'Dosa',
        items: [
          ['f-dosa', 1, 2],
          ['f-chicken', 100, 120],
          ['f-egg', 1],
          ['f-sambar', 200],
          ['f-veg-cooked', 150],
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────

const unitOf = (foodId: string): Unit => FOOD_UNITS[foodId] ?? 'g'

function itemsOf(optionId: string, defs: ItemDef[]): PlannedItem[] {
  return defs.map((d, i) => ({
    id: `${optionId}-i${i}`,
    foodId: d[0],
    amount: { value: d[1], max: d[2], unit: unitOf(d[0]) },
  }))
}

function build(personId: string, prefix: string, defs: SlotDef[], at: string) {
  const slots: MealSlot[] = []
  const options: MealOption[] = []

  defs.forEach((slot, order) => {
    const slotId = `${prefix}-${slot.id}`
    slots.push({
      id: slotId,
      updatedAt: at,
      personId,
      name: slot.name,
      order,
      timeHint: slot.timeHint,
      optional: slot.optional,
      note: slot.note,
    })
    slot.options.forEach((opt, oOrder) => {
      const optionId = `${slotId}-${opt.label.toLowerCase()}`
      options.push({
        id: optionId,
        updatedAt: at,
        slotId,
        label: opt.label,
        name: opt.name,
        note: opt.note,
        order: oOrder,
        items: itemsOf(optionId, opt.items),
      })
    })
  })

  return { slots, options }
}

export function seedMealPlans(at: string): { slots: MealSlot[]; options: MealOption[] } {
  const his = build(HIM, 'him', HIS_SLOTS, at)
  const hers = build(HER, 'her', HER_SLOTS, at)
  return {
    slots: [...his.slots, ...hers.slots],
    options: [...his.options, ...hers.options],
  }
}
