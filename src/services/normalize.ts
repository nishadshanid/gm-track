import type { AppData } from '../types'
import { emptyData, SCHEMA_VERSION } from './seed.ts'

export { SCHEMA_VERSION }

/**
 * Fill in anything missing so the UI always receives a well-shaped object —
 * an old snapshot, a hand-edited JSON import, or a partial write all normalise
 * to something renderable rather than crashing a screen.
 */
export function normalize(data: Partial<AppData> | undefined): AppData {
  const base = emptyData()
  if (!data) return base
  const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback)
  return {
    schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : SCHEMA_VERSION,
    people: arr(data.people, base.people),
    targets: arr(data.targets, base.targets),
    coaching: arr(data.coaching, base.coaching),
    foods: arr(data.foods, base.foods),
    mealSlots: arr(data.mealSlots, base.mealSlots),
    mealOptions: arr(data.mealOptions, base.mealOptions),
    exercises: arr(data.exercises, base.exercises),
    dayTemplates: arr(data.dayTemplates, base.dayTemplates),
    schedules: arr(data.schedules, base.schedules),
    mealLogs: arr(data.mealLogs, base.mealLogs),
    workoutSessions: arr(data.workoutSessions, base.workoutSessions),
    bodyMetrics: arr(data.bodyMetrics, base.bodyMetrics),
    waterEntries: arr(data.waterEntries, base.waterEntries),
    stepLogs: arr(data.stepLogs, base.stepLogs),
    settings: data.settings ?? base.settings,
  }
}
