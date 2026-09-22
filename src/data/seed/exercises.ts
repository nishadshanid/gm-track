import type { Exercise, ExerciseMode } from '../../types'

/**
 * Starter exercise library — everything the two seeded splits reference, plus
 * the common substitutions ("Pull-ups / Lat pulldown", "Squat / Goblet squat")
 * so swapping mid-session does not require adding an exercise first.
 *
 * `mode` is what makes the set row correct: a plank is logged in seconds, a
 * pull-up has no load until it is weighted, and a lunge is per side.
 */

interface Def {
  id: string
  name: string
  groups: string[]
  mode?: ExerciseMode
  equipment?: string
  unilateral?: boolean
  /** Default sets × repMin–repMax, as written in the source programmes. */
  scheme?: [number, number, number]
  cues?: string
}

const DEFS: Def[] = [
  // ── Chest ────────────────────────────────────────────────────────────────
  { id: 'e-bench', name: 'Barbell bench press', groups: ['chest', 'triceps'], equipment: 'barbell', scheme: [3, 6, 10] },
  { id: 'e-incline-db-press', name: 'Incline dumbbell press', groups: ['chest'], equipment: 'dumbbell', scheme: [3, 8, 12] },
  { id: 'e-cable-fly', name: 'Cable fly', groups: ['chest'], equipment: 'cable', scheme: [3, 10, 15] },
  { id: 'e-pec-deck', name: 'Pec deck', groups: ['chest'], equipment: 'machine', scheme: [3, 10, 15] },
  { id: 'e-chest-press', name: 'Machine chest press', groups: ['chest'], equipment: 'machine', scheme: [3, 8, 12] },

  // ── Back ─────────────────────────────────────────────────────────────────
  { id: 'e-lat-pulldown', name: 'Lat pulldown', groups: ['back', 'biceps'], equipment: 'cable', scheme: [3, 8, 12] },
  { id: 'e-pullup', name: 'Pull-up', groups: ['back', 'biceps'], mode: 'weighted-bodyweight', equipment: 'bodyweight', scheme: [3, 5, 10] },
  { id: 'e-barbell-row', name: 'Barbell row', groups: ['back'], equipment: 'barbell', scheme: [3, 8, 12] },
  { id: 'e-chest-supported-row', name: 'Chest-supported row', groups: ['back'], equipment: 'machine', scheme: [3, 8, 12] },
  { id: 'e-cable-row', name: 'Seated cable row', groups: ['back'], equipment: 'cable', scheme: [3, 8, 12] },
  { id: 'e-db-row', name: 'Single-arm dumbbell row', groups: ['back'], equipment: 'dumbbell', unilateral: true, scheme: [2, 10, 12] },

  // ── Shoulders ────────────────────────────────────────────────────────────
  { id: 'e-ohp', name: 'Overhead shoulder press', groups: ['shoulders'], equipment: 'barbell', scheme: [3, 6, 10] },
  { id: 'e-db-shoulder-press', name: 'Dumbbell shoulder press', groups: ['shoulders'], equipment: 'dumbbell', scheme: [2, 8, 12] },
  { id: 'e-lateral-raise', name: 'Dumbbell lateral raise', groups: ['shoulders'], equipment: 'dumbbell', scheme: [3, 12, 15] },
  { id: 'e-rear-delt-fly', name: 'Rear delt fly', groups: ['shoulders', 'back'], equipment: 'machine', scheme: [3, 12, 15] },
  { id: 'e-face-pull', name: 'Face pull', groups: ['shoulders', 'back'], equipment: 'cable', scheme: [2, 12, 15] },

  // ── Arms ─────────────────────────────────────────────────────────────────
  { id: 'e-curl', name: 'Barbell / dumbbell curl', groups: ['biceps'], equipment: 'barbell', scheme: [3, 8, 12] },
  { id: 'e-hammer-curl', name: 'Hammer curl', groups: ['biceps'], equipment: 'dumbbell', scheme: [2, 10, 15] },
  { id: 'e-rope-pushdown', name: 'Rope triceps pushdown', groups: ['triceps'], equipment: 'cable', scheme: [3, 10, 15] },
  { id: 'e-overhead-ext', name: 'Overhead cable triceps extension', groups: ['triceps'], equipment: 'cable', scheme: [2, 10, 15] },

  // ── Legs ─────────────────────────────────────────────────────────────────
  { id: 'e-squat', name: 'Squat', groups: ['quads', 'glutes'], equipment: 'barbell', scheme: [3, 6, 10] },
  { id: 'e-goblet-squat', name: 'Goblet squat', groups: ['quads', 'glutes'], equipment: 'dumbbell', scheme: [3, 8, 12] },
  { id: 'e-front-squat', name: 'Front squat', groups: ['quads'], equipment: 'barbell', scheme: [3, 8, 12] },
  { id: 'e-leg-press', name: 'Leg press', groups: ['quads', 'glutes'], equipment: 'machine', scheme: [3, 8, 12] },
  { id: 'e-rdl', name: 'Romanian deadlift', groups: ['hamstrings', 'glutes'], equipment: 'barbell', scheme: [3, 8, 12] },
  { id: 'e-hip-thrust', name: 'Hip thrust', groups: ['glutes'], equipment: 'barbell', scheme: [3, 10, 15] },
  { id: 'e-bulgarian', name: 'Bulgarian split squat', groups: ['quads', 'glutes'], equipment: 'dumbbell', unilateral: true, scheme: [3, 8, 10] },
  { id: 'e-leg-extension', name: 'Leg extension', groups: ['quads'], equipment: 'machine', scheme: [2, 10, 15] },
  { id: 'e-leg-curl', name: 'Leg curl', groups: ['hamstrings'], equipment: 'machine', scheme: [2, 10, 15] },
  { id: 'e-calf-raise', name: 'Calf raise', groups: ['calves'], equipment: 'machine', scheme: [3, 12, 15] },
  { id: 'e-abduction', name: 'Hip abduction machine', groups: ['glutes'], equipment: 'machine', scheme: [2, 12, 15] },
  { id: 'e-walking-lunge', name: 'Walking lunge', groups: ['quads', 'glutes'], equipment: 'dumbbell', unilateral: true, scheme: [2, 10, 10] },

  // ── Core ─────────────────────────────────────────────────────────────────
  { id: 'e-cable-crunch', name: 'Cable crunch', groups: ['abs'], equipment: 'cable', scheme: [3, 10, 15] },
  { id: 'e-hanging-knee-raise', name: 'Hanging knee raise', groups: ['abs'], mode: 'bodyweight-reps', equipment: 'bodyweight', scheme: [3, 8, 15] },
  { id: 'e-plank', name: 'Plank', groups: ['abs'], mode: 'time', equipment: 'bodyweight', scheme: [3, 30, 60], cues: 'Logged in seconds, not reps.' },
  { id: 'e-dead-bug', name: 'Dead bug', groups: ['abs'], mode: 'bodyweight-reps', equipment: 'bodyweight', unilateral: true, scheme: [2, 10, 10] },

  // ── Cardio ───────────────────────────────────────────────────────────────
  { id: 'e-incline-walk', name: 'Incline treadmill walk', groups: ['cardio'], mode: 'distance', equipment: 'treadmill' },
  { id: 'e-cycling', name: 'Cycling', groups: ['cardio'], mode: 'distance', equipment: 'bike' },
  { id: 'e-elliptical', name: 'Elliptical', groups: ['cardio'], mode: 'distance', equipment: 'elliptical' },
]

export function seedExercises(at: string): Exercise[] {
  return DEFS.map((d) => ({
    id: d.id,
    updatedAt: at,
    name: d.name,
    muscleGroups: d.groups,
    equipment: d.equipment,
    mode: d.mode ?? 'weight-reps',
    unilateral: d.unilateral,
    defaultScheme: d.scheme
      ? { sets: d.scheme[0], repMin: d.scheme[1], repMax: d.scheme[2] }
      : undefined,
    cues: d.cues,
  }))
}
