/**
 * The whole persisted contract.
 *
 * Written in full up front — including collections no screen touches until a
 * later phase — because the sync merge in Phase 7 depends on every record
 * already carrying identity and last-write-wins metadata. Retrofitting that is
 * the one change that would ripple through every file.
 *
 * See docs/00-overview.md for the reasoning behind each decision.
 */

// ---------------------------------------------------------------------------
// Base contract
// ---------------------------------------------------------------------------

export type Id = string

/** "YYYY-MM-DD" in LOCAL time. Only ever produced by src/utils/date.ts. */
export type DateKey = string

/**
 * Every persisted record. `updatedAt` is stamped in exactly one place
 * (store.emit) and is what the merge resolves conflicts by; `updatedBy` is a
 * device id that breaks ties deterministically when two stamps are identical.
 *
 * `deletedAt` is a tombstone: the store never splices an array, because a
 * delete that removes the record locally is resurrected by the other device on
 * the next merge. A tombstone competes on `updatedAt` like any other field, so
 * a delete only wins if it is newer than the edit it races.
 */
export interface Rec {
  id: Id
  updatedAt: string
  updatedBy?: string
  deletedAt?: string
}

// ---------------------------------------------------------------------------
// Units, amounts, macros
// ---------------------------------------------------------------------------

export type Unit = 'g' | 'ml' | 'piece'

/** Macros as quoted on the food: "per 100 g", "per 1 piece". */
export interface MacroBasis {
  qty: number
  unit: Unit
  kcal: number
  proteinG: number
  carbG?: number
  fatG?: number
}

export interface Macros {
  kcal: number
  proteinG: number
  carbG: number
  fatG: number
}

/**
 * A planned amount may be a range — "200–300 g rice". Deliberately a different
 * type from LoggedAmount rather than one optional field, so the compiler stops
 * a range ever reaching a log.
 */
export interface PlannedAmount {
  value: number
  max?: number
  unit: Unit
}

/** A logged amount is always a single number. */
export interface LoggedAmount {
  value: number
  unit: Unit
}

/** How a person collapses a planned range when logging. */
export type PortionPref = 'min' | 'mid' | 'max'

// ---------------------------------------------------------------------------
// People, targets, coaching rules
// ---------------------------------------------------------------------------

export interface Person extends Rec {
  name: string
  /** Short label for the switcher — "Him", "Her". */
  short: string
  /** Tailwind-independent accent, applied as a CSS custom property. */
  color: string
  emoji?: string
  sex?: 'm' | 'f'
  heightCm?: number
  birthYear?: number
  /** Gain plans default to 'max', fat-loss plans to 'min'. */
  portionDefault: PortionPref
  order: number
  archived?: boolean
}

export interface Range {
  min: number
  max: number
}

/**
 * Targets are a history, not a row. Applying a coaching suggestion writes a new
 * profile with a later `effectiveFrom`, so a day in the past is still judged
 * against the target that was in force when it was logged.
 */
export interface TargetProfile extends Rec {
  personId: Id
  effectiveFrom: DateKey
  kcal: Range
  proteinG: Range
  waterMl: number
  steps: number
  goalWeightKg?: number
  note?: string
}

export type Goal = 'gain' | 'loss' | 'recomp'

export interface ProgressionRules {
  /** All working sets at the top of the rep range earns a load increase. */
  rule: 'top-of-range-all-sets'
  incrementKgUpper: number
  incrementKgLower: number
  deloadPct?: number
}

/** The adjustment rules from the source plans — editable, like everything else. */
export interface CoachingRules extends Rec {
  personId: Id
  goal: Goal
  /** Target rate of change, kg/week. Gain: +0.25..+0.5. Loss: -0.25..-0.5. */
  weeklyDeltaKg: Range
  /** How much to move calories by when the trend says to, kcal/day. */
  kcalAdjustStep: Range
  /** Weeks of flat trend before suggesting a change. */
  lookbackWeeks: number
  /** Minimum weight readings in a window before any verdict is offered. */
  minReadingsPerWeek: number
  progression: ProgressionRules
}

// ---------------------------------------------------------------------------
// Food library
// ---------------------------------------------------------------------------

export interface NamedServing {
  label: string
  qty: number
  unit: Unit
}

export interface Food extends Rec {
  name: string
  category?: string
  /** The unit this food is normally logged in. */
  unit: Unit
  basis: MacroBasis
  /**
   * Units-of-`basis.unit` per 1 of the key unit. An idli with basis
   * {qty:1, unit:'piece'} and conversions {g: 1/45} resolves both "3 idli" and
   * "135 g idli". A missing conversion yields null macros, never a silent 0.
   */
  conversions?: Partial<Record<Unit, number>>
  servings?: NamedServing[]
  tags?: string[]
  /** Hidden from pickers, still resolvable by history. Not a tombstone. */
  archived?: boolean
}

// ---------------------------------------------------------------------------
// Diet plan: slots -> options -> logs
// ---------------------------------------------------------------------------

export interface MealSlot extends Rec {
  personId: Id
  name: string
  order: number
  /** Display only — "7:30–9:00 AM". */
  timeHint?: string
  targetKcal?: number
  targetProteinG?: number
  /** Her 11 AM slot: there is no requirement to eat every 2–3 hours. */
  optional?: boolean
  /** Coaching line from the plan, e.g. "Don't make breakfast tiny". */
  note?: string
  archived?: boolean
}

export interface PlannedItem {
  id: Id
  foodId: Id
  amount: PlannedAmount
  optional?: boolean
  note?: string
}

/** "Option A — Idli". A slot with a single option is just a fixed meal. */
export interface MealOption extends Rec {
  slotId: Id
  label: string
  name: string
  items: PlannedItem[]
  note?: string
  order: number
  archived?: boolean
}

export interface LoggedItem {
  id: Id
  /** null for a quick-add / restaurant entry with inline macros. */
  foodId: Id | null
  /** Snapshot: renaming or archiving a food never rewrites history. */
  foodName: string
  amount: LoggedAmount
  /**
   * Frozen copy of the food's macro BASIS at log time — not the computed
   * total. Totals are always derived, so there is nothing to drift.
   */
  basisSnapshot: MacroBasis
  conversionsSnapshot?: Partial<Record<Unit, number>>
  /** Sub-record LWW: two phones can edit one meal. */
  updatedAt: string
  deletedAt?: string
}

export type MealStatus = 'planned' | 'eaten' | 'skipped'

export interface MealLog extends Rec {
  personId: Id
  date: DateKey
  slotId: Id
  /** Snapshot of the slot name at log time. */
  slotName: string
  /** Provenance only — never used to render the log. */
  sourceOptionId?: Id
  sourceOptionName?: string
  /** Fully materialised copy of the chosen option, then freely edited. */
  items: LoggedItem[]
  status: MealStatus
  /** Set once the copy diverges; warns before an option swap overwrites it. */
  manuallyEdited?: boolean
  note?: string
  /** Which person entered it — either phone logs for either person. */
  loggedBy: Id
  createdAt: string
}

// ---------------------------------------------------------------------------
// Workouts: template -> session
// ---------------------------------------------------------------------------

export type ExerciseMode =
  | 'weight-reps'
  | 'bodyweight-reps'
  | 'weighted-bodyweight'
  | 'time'
  | 'distance'

export interface Exercise extends Rec {
  name: string
  muscleGroups: string[]
  equipment?: string
  mode: ExerciseMode
  unilateral?: boolean
  defaultScheme?: SetScheme
  cues?: string
  archived?: boolean
}

/** "3 × 8–12". repMin === repMax is a fixed count; `time` mode uses seconds. */
export interface SetScheme {
  sets: number
  repMin: number
  repMax: number
  restSec?: number
}

export interface TemplateBlock {
  id: Id
  exerciseId: Id
  scheme: SetScheme
  /** Blocks sharing a group id are performed as a superset. */
  supersetGroup?: string
  order: number
  optional?: boolean
  note?: string
}

export interface WorkoutDayTemplate extends Rec {
  personId: Id
  name: string
  order: number
  blocks: TemplateBlock[]
  /** Her cardio finisher — "20–25 min incline walk". */
  cardio?: { label: string; minutes: number }
  archived?: boolean
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WeekSchedule extends Rec {
  personId: Id
  /** templateId, an explicit rest day, or nothing planned. */
  days: Record<Weekday, Id | 'rest' | null>
}

export type SetKind = 'work' | 'warmup' | 'drop' | 'failure'

export interface SetLog {
  id: Id
  index: number
  /** null for pure bodyweight work. */
  weightKg: number | null
  reps: number
  seconds?: number
  rpe?: number
  kind: SetKind
  done: boolean
  /** Set-level LWW — two phones, one gym, one shared session. */
  updatedAt: string
  deletedAt?: string
}

export interface SessionExercise {
  id: Id
  exerciseId: Id
  /** Snapshot. */
  exerciseName: string
  /** Snapshot of the target at session time. */
  scheme: SetScheme
  order: number
  sets: SetLog[]
  note?: string
  updatedAt: string
  deletedAt?: string
}

export interface WorkoutSession extends Rec {
  personId: Id
  date: DateKey
  templateId?: Id
  /** Snapshot. */
  templateName: string
  entries: SessionExercise[]
  cardioMinutes?: number
  startedAt?: string
  finishedAt?: string
  bodyweightKg?: number
  note?: string
  loggedBy: Id
  createdAt: string
}

// ---------------------------------------------------------------------------
// Body metrics and daily counters
// ---------------------------------------------------------------------------

export interface BodyMetric extends Rec {
  personId: Id
  date: DateKey
  weightKg?: number
  waistCm?: number
  hipCm?: number
  neckCm?: number
  chestCm?: number
  armCm?: number
  thighCm?: number
  note?: string
}

/**
 * Append-only events, not a mutable scalar. Two simultaneous "+250 ml" taps on
 * two phones must both survive; a number would lose one. Union-merges for free.
 */
export interface WaterEntry extends Rec {
  personId: Id
  date: DateKey
  ml: number
  at: string
}

/** Typed once from a phone's health app, so a LWW scalar is fine here. */
export interface StepLog extends Rec {
  personId: Id
  date: DateKey
  steps: number
}

// ---------------------------------------------------------------------------
// Settings and root
// ---------------------------------------------------------------------------

export interface Settings extends Rec {
  /** SHA-256(pin + salt). An accident-guard, not security — see the README. */
  pinHash?: string
  pinSalt?: string
  pinEnabled: boolean
  weightUnit: 'kg' | 'lb'
  lengthUnit: 'cm' | 'in'
  weekStartsOn: 0 | 1
  waterStepMl: number
  appName: string
}

export interface AppData {
  schemaVersion: number
  // registries — all editable in-app, none hardcoded in components
  people: Person[]
  targets: TargetProfile[]
  coaching: CoachingRules[]
  foods: Food[]
  mealSlots: MealSlot[]
  mealOptions: MealOption[]
  exercises: Exercise[]
  dayTemplates: WorkoutDayTemplate[]
  schedules: WeekSchedule[]
  // logs
  mealLogs: MealLog[]
  workoutSessions: WorkoutSession[]
  bodyMetrics: BodyMetric[]
  waterEntries: WaterEntry[]
  stepLogs: StepLog[]
  settings: Settings
}

/** The keys of AppData that hold an array of records — what the store and the
 *  merge operate on generically. */
export type CollectionKey = {
  [K in keyof AppData]: AppData[K] extends Rec[] ? K : never
}[keyof AppData]

/** The record type held by a given collection. */
export type RecordOf<K extends CollectionKey> = AppData[K][number]
