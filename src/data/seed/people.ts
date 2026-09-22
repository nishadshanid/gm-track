import type { CoachingRules, Person, TargetProfile } from '../../types'

/**
 * The two starting profiles, straight from the source plans.
 *
 * Seed data is a starting point, never a hardcode: every field here is editable
 * in Setup, and nothing in the app reads these ids directly.
 */

export const HIM = 'p-him'
export const HER = 'p-her'

export function seedPeople(at: string): Person[] {
  return [
    {
      id: HIM,
      updatedAt: at,
      name: 'Nishad',
      short: 'Him',
      color: '37 99 235', // blue-600
      emoji: '👨',
      sex: 'm',
      // Gaining: when the plan says "200–300 g rice", take the top of the range.
      portionDefault: 'max',
      order: 0,
    },
    {
      id: HER,
      updatedAt: at,
      name: 'Wife',
      short: 'Her',
      color: '219 39 119', // pink-600
      emoji: '👩',
      sex: 'f',
      heightCm: 152,
      // Losing: take the bottom of the range.
      portionDefault: 'min',
      order: 1,
    },
  ]
}

export function seedTargets(at: string, from: string): TargetProfile[] {
  return [
    {
      id: 't-him-1',
      updatedAt: at,
      personId: HIM,
      effectiveFrom: from,
      kcal: { min: 2200, max: 2400 },
      proteinG: { min: 90, max: 100 },
      waterMl: 2750,
      steps: 7000,
      note: 'Weight gain + muscle. If the weekly average is flat for 2–3 weeks, add 150–250 kcal.',
    },
    {
      id: 't-her-1',
      updatedAt: at,
      personId: HER,
      effectiveFrom: from,
      kcal: { min: 1400, max: 1600 },
      proteinG: { min: 85, max: 100 },
      waterMl: 2250,
      steps: 8500,
      note: 'Fat loss + muscle. Moderate deficit, high protein, strength training, steps, sleep.',
    },
  ]
}

export function seedCoaching(at: string): CoachingRules[] {
  return [
    {
      id: 'c-him',
      updatedAt: at,
      personId: HIM,
      goal: 'gain',
      weeklyDeltaKg: { min: 0.25, max: 0.5 },
      kcalAdjustStep: { min: 150, max: 250 },
      lookbackWeeks: 3,
      minReadingsPerWeek: 3,
      progression: {
        rule: 'top-of-range-all-sets',
        incrementKgUpper: 2.5,
        incrementKgLower: 5,
      },
    },
    {
      id: 'c-her',
      updatedAt: at,
      personId: HER,
      goal: 'loss',
      weeklyDeltaKg: { min: -0.5, max: -0.2 },
      kcalAdjustStep: { min: 100, max: 150 },
      lookbackWeeks: 4,
      minReadingsPerWeek: 3,
      progression: {
        rule: 'top-of-range-all-sets',
        incrementKgUpper: 2.5,
        incrementKgLower: 5,
      },
    },
  ]
}
