import type { TemplateBlock, WeekSchedule, WorkoutDayTemplate } from '../../types'
import { HER, HIM } from './people.ts'

/**
 * Both training splits, as data.
 *
 * Transcribed from the two source programmes, including their set and rep
 * prescriptions. Notable deliberate choices carried over from the source:
 *
 * - Friday is lighter on purpose — "don't make Friday another extremely heavy
 *   bodybuilding session", it exists for additional quality volume.
 * - Her programme is strength-led, not a cardio programme. The cardio is a
 *   finisher on three days, and her core work is not ab-focused fat loss.
 * - Optional accessories are marked optional rather than dropped, because the
 *   source says not to add every exercise if the session is already long.
 *
 * Everything here is editable in Setup → Workouts.
 */

/** [exerciseId, sets, repMin, repMax] with an optional trailing flag/note. */
type BlockDef = [string, number, number, number] | [string, number, number, number, 'optional']

interface DayDef {
  id: string
  name: string
  blocks: BlockDef[]
  cardio?: { label: string; minutes: number }
}

// ─────────────────────────────────────────────────────────────────────────────
// Him — 5 training days, 2 rest
// ─────────────────────────────────────────────────────────────────────────────

const HIS_DAYS: DayDef[] = [
  {
    id: 'chest-tri',
    name: 'Chest + Triceps',
    blocks: [
      ['e-bench', 3, 6, 10],
      ['e-incline-db-press', 3, 8, 12],
      ['e-cable-fly', 3, 10, 15],
      ['e-chest-press', 2, 10, 12],
      ['e-rope-pushdown', 3, 10, 15],
      ['e-overhead-ext', 2, 10, 15],
    ],
  },
  {
    id: 'back-bi',
    name: 'Back + Biceps',
    blocks: [
      ['e-lat-pulldown', 3, 8, 12],
      ['e-barbell-row', 3, 8, 12],
      ['e-cable-row', 3, 8, 12],
      ['e-db-row', 2, 10, 12],
      ['e-curl', 3, 8, 12],
      ['e-hammer-curl', 2, 10, 15],
    ],
  },
  {
    id: 'shoulders-abs',
    name: 'Shoulders + Abs',
    blocks: [
      ['e-ohp', 3, 6, 10],
      ['e-lateral-raise', 3, 12, 15],
      ['e-rear-delt-fly', 3, 12, 15],
      ['e-face-pull', 2, 12, 15],
      ['e-cable-crunch', 3, 10, 15],
      ['e-hanging-knee-raise', 3, 8, 15],
      ['e-plank', 3, 30, 60],
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    blocks: [
      ['e-squat', 3, 6, 10],
      ['e-leg-press', 3, 8, 12],
      ['e-rdl', 3, 8, 12],
      ['e-leg-extension', 2, 10, 15],
      ['e-leg-curl', 2, 10, 15],
      ['e-calf-raise', 3, 12, 15],
      ['e-walking-lunge', 2, 10, 10, 'optional'],
    ],
  },
  {
    id: 'full',
    name: 'Full Body',
    blocks: [
      ['e-goblet-squat', 3, 8, 12],
      ['e-incline-db-press', 3, 8, 12],
      ['e-lat-pulldown', 3, 8, 12],
      ['e-rdl', 2, 8, 12],
      ['e-lateral-raise', 2, 12, 15],
      ['e-curl', 2, 10, 15],
      ['e-rope-pushdown', 2, 10, 15],
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Her — 5 training days, 2 rest. Strength-led, cardio as a finisher.
// ─────────────────────────────────────────────────────────────────────────────

const HER_DAYS: DayDef[] = [
  {
    id: 'lower-glutes',
    name: 'Lower Body + Glutes',
    cardio: { label: 'Incline walking', minutes: 12 },
    blocks: [
      ['e-goblet-squat', 3, 8, 12],
      ['e-leg-press', 3, 10, 12],
      ['e-rdl', 3, 8, 12],
      ['e-hip-thrust', 3, 10, 15],
      ['e-leg-curl', 2, 10, 15],
      ['e-calf-raise', 2, 12, 15],
      ['e-abduction', 2, 12, 15, 'optional'],
    ],
  },
  {
    id: 'upper',
    name: 'Upper Body',
    blocks: [
      ['e-lat-pulldown', 3, 8, 12],
      ['e-cable-row', 3, 8, 12],
      ['e-chest-press', 3, 8, 12],
      ['e-db-shoulder-press', 2, 8, 12],
      ['e-lateral-raise', 2, 12, 15],
      ['e-curl', 2, 10, 15],
      ['e-rope-pushdown', 2, 10, 15],
    ],
  },
  {
    id: 'lower-core',
    name: 'Lower Body + Core',
    cardio: { label: 'Walking', minutes: 12 },
    blocks: [
      ['e-leg-press', 3, 10, 12],
      ['e-bulgarian', 3, 8, 10],
      ['e-hip-thrust', 3, 10, 15],
      ['e-leg-extension', 2, 12, 15],
      ['e-leg-curl', 2, 12, 15],
      ['e-cable-crunch', 3, 10, 15],
      ['e-plank', 3, 30, 60],
      ['e-dead-bug', 2, 10, 10],
    ],
  },
  {
    id: 'upper-cardio',
    name: 'Upper Body + Cardio',
    cardio: { label: 'Moderate cardio', minutes: 22 },
    blocks: [
      ['e-lat-pulldown', 3, 10, 12],
      ['e-db-row', 3, 10, 12],
      ['e-chest-press', 3, 10, 12],
      ['e-lateral-raise', 3, 12, 15],
      ['e-face-pull', 2, 12, 15],
      ['e-curl', 2, 10, 15],
      ['e-rope-pushdown', 2, 10, 15],
    ],
  },
  {
    id: 'full-cardio',
    name: 'Full Body + Cardio',
    cardio: { label: 'Cardio', minutes: 25 },
    blocks: [
      ['e-goblet-squat', 3, 10, 10],
      ['e-rdl', 3, 10, 10],
      ['e-chest-press', 3, 10, 10],
      ['e-lat-pulldown', 3, 10, 10],
      ['e-hip-thrust', 2, 12, 12],
      ['e-db-shoulder-press', 2, 10, 10],
      ['e-cable-crunch', 3, 12, 15],
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────

function blocksOf(dayId: string, defs: BlockDef[]): TemplateBlock[] {
  return defs.map((d, i) => ({
    id: `${dayId}-b${i}`,
    exerciseId: d[0],
    scheme: { sets: d[1], repMin: d[2], repMax: d[3] },
    order: i,
    optional: d[4] === 'optional' || undefined,
  }))
}

function build(personId: string, prefix: string, defs: DayDef[], at: string) {
  const templates: WorkoutDayTemplate[] = defs.map((day, order) => ({
    id: `${prefix}-${day.id}`,
    updatedAt: at,
    personId,
    name: day.name,
    order,
    blocks: blocksOf(`${prefix}-${day.id}`, day.blocks),
    cardio: day.cardio,
  }))

  // Monday to Friday train, weekend rests. 0 = Sunday.
  const schedule: WeekSchedule = {
    id: `${prefix}-schedule`,
    updatedAt: at,
    personId,
    days: {
      0: 'rest',
      1: templates[0]?.id ?? null,
      2: templates[1]?.id ?? null,
      3: templates[2]?.id ?? null,
      4: templates[3]?.id ?? null,
      5: templates[4]?.id ?? null,
      6: 'rest',
    },
  }

  return { templates, schedule }
}

export function seedSplits(at: string): {
  templates: WorkoutDayTemplate[]
  schedules: WeekSchedule[]
} {
  const his = build(HIM, 'him', HIS_DAYS, at)
  const hers = build(HER, 'her', HER_DAYS, at)
  return {
    templates: [...his.templates, ...hers.templates],
    schedules: [his.schedule, hers.schedule],
  }
}
