import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Dumbbell,
  Moon,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import type { Exercise, WorkoutDayTemplate } from '../types'
import { PageTransition } from '../components/PageTransition'
import { AiBar } from '../components/ai/AiBar'
import { EmptyState } from '../components/ui/EmptyState'
import { Sheet } from '../components/ui/Sheet'
import { SearchList } from '../components/ui/SearchList'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { NumberStepper } from '../components/ui/NumberStepper'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { DayPicker } from '../components/workout/DayPicker'
import { RestTimer } from '../components/workout/RestTimer'
import { useWorkouts } from '../hooks/useWorkouts'
import { useData } from '../hooks/useData'
import { selectable } from '../services/selectors'
import { addDays, friendlyDate, todayKey } from '../utils/date'
import { tonnage } from '../utils/volume'

export function Workout() {
  const data = useData()
  const [date, setDate] = useState(todayKey())
  const {
    person,
    templates,
    scheduled,
    session,
    view,
    startSession,
    setSet,
    addSet,
    removeSet,
    addExercise,
    removeExercise,
    finish,
    reopen,
    deleteSession,
  } = useWorkouts(date)

  const [picking, setPicking] = useState(false)
  const [addingExercise, setAddingExercise] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cardio, setCardio] = useState(0)
  // Restarts the rest timer whenever a set is completed.
  const [lastDone, setLastDone] = useState<string>('')

  const exercises: Exercise[] = selectable(data.exercises)

  if (!person) {
    return (
      <PageTransition>
        <EmptyState icon={Dumbbell} title="No one set up" hint="Add a person in Setup." />
      </PageTransition>
    )
  }

  const begin = (template?: WorkoutDayTemplate) => {
    startSession(template)
    setPicking(false)
    if (template?.cardio) setCardio(template.cardio.minutes)
  }

  const scheduledTemplate = scheduled.kind === 'template' ? scheduled.template : undefined
  const done = Boolean(session?.finishedAt)

  return (
    <PageTransition>
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{friendlyDate(date)}</h1>
          <p className="mt-0.5 truncate text-sm text-slate-400">
            {person.emoji} {person.name}
            {session ? ` · ${session.templateName}` : ''}
          </p>
        </div>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDate(addDays(date, -1))}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next day"
            disabled={date >= todayKey()}
            onClick={() => setDate(addDays(date, 1))}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <AiBar date={date} placeholder={'Log sets — "bench 40 by 8, 8, 7"'} />

      {!session ? (
        <div className="mt-5 space-y-3">
          {scheduled.kind === 'rest' ? (
            <EmptyState
              icon={Moon}
              title="Rest day"
              hint="Two rest days a week is part of the programme — training more is not better."
              action={
                <button type="button" onClick={() => setPicking(true)} className="btn-ghost text-accent">
                  Train anyway
                </button>
              }
            />
          ) : scheduledTemplate ? (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Scheduled today
              </p>
              <h2 className="mt-1 text-lg font-bold">{scheduledTemplate.name}</h2>
              <ul className="mt-3 space-y-1">
                {scheduledTemplate.blocks
                  .filter((b) => !b.optional)
                  .sort((a, b) => a.order - b.order)
                  .map((b) => {
                    const ex = exercises.find((e) => e.id === b.exerciseId)
                    return (
                      <li key={b.id} className="flex justify-between text-sm">
                        <span className="min-w-0 truncate text-slate-500 dark:text-slate-300">
                          {ex?.name ?? 'Exercise'}
                        </span>
                        <span className="flex-none text-xs tabular-nums text-slate-400">
                          {b.scheme.sets} × {b.scheme.repMin}–{b.scheme.repMax}
                        </span>
                      </li>
                    )
                  })}
              </ul>
              {scheduledTemplate.cardio && (
                <p className="mt-3 text-xs text-slate-400">
                  Then {scheduledTemplate.cardio.minutes} min{' '}
                  {scheduledTemplate.cardio.label.toLowerCase()}
                </p>
              )}
              <button
                type="button"
                onClick={() => begin(scheduledTemplate)}
                className="btn-primary mt-4 w-full"
              >
                Start {scheduledTemplate.name}
              </button>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="btn-ghost mt-1 w-full text-xs"
              >
                Train a different day
              </button>
            </div>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="Nothing scheduled"
              hint={
                templates.length === 0
                  ? 'Add workout days in Setup → Workouts.'
                  : 'Pick a session to log.'
              }
              action={
                templates.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className="btn-primary"
                  >
                    Choose a session
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <RestTimer restartKey={lastDone} />
            <span className="text-xs tabular-nums text-slate-400">
              {Math.round(tonnage(session)).toLocaleString()} kg total
            </span>
          </div>

          <ul className="mt-3 space-y-3">
            {view.map((v) => (
              <ExerciseCard
                key={v.entry.id}
                view={v}
                onSetChange={(setId, patch) => {
                  setSet(session, v.entry.id, setId, patch)
                  if (patch.done) setLastDone(`${setId}-${Date.now()}`)
                }}
                onApplyLoad={(targetKg) => {
                  for (const set of v.entry.sets) {
                    if (set.deletedAt || set.kind !== 'work') continue
                    setSet(session, v.entry.id, set.id, { weightKg: targetKg })
                  }
                }}
                onAddSet={() => addSet(session, v.entry.id)}
                onAddWarmup={() => addSet(session, v.entry.id, 'warmup')}
                onRemoveSet={(setId) => removeSet(session, v.entry.id, setId)}
                onRemove={() => removeExercise(session, v.entry.id)}
              />
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setAddingExercise(true)}
            className="btn-ghost mt-3 w-full text-accent"
          >
            <Plus size={16} /> Add exercise
          </button>

          <div className="card mt-5">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Cardio afterwards
              </span>
              <div className="mt-1.5">
                <NumberStepper
                  value={session.cardioMinutes ?? cardio}
                  step={5}
                  onChange={setCardio}
                  suffix="min"
                  aria-label="Cardio minutes"
                />
              </div>
            </label>

            {done ? (
              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 size={16} /> Session finished
                </p>
                <button type="button" onClick={() => reopen(session)} className="btn-ghost w-full text-xs">
                  <RotateCcw size={13} /> Reopen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => finish(session, cardio || undefined)}
                className="btn-primary mt-4 w-full"
              >
                Finish workout
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost mt-1 w-full text-xs text-danger"
            >
              <Trash2 size={12} /> Delete session
            </button>
          </div>
        </>
      )}

      <DayPicker
        open={picking}
        templates={templates}
        onPick={begin}
        onClose={() => setPicking(false)}
      />

      <Sheet open={addingExercise} title="Add exercise" onClose={() => setAddingExercise(false)}>
        <SearchList
          items={exercises}
          keyOf={(e) => `${e.name} ${e.muscleGroups.join(' ')} ${e.equipment ?? ''}`}
          searchFrom={1}
          placeholder="Search exercises…"
          empty="No exercises in the library."
          render={(e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  if (session) addExercise(session, e)
                  setAddingExercise(false)
                }}
                className="flex w-full items-baseline justify-between gap-2 rounded-xl px-1 py-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.name}</span>
                <span className="flex-none text-xs text-slate-400">
                  {e.muscleGroups.slice(0, 2).join(' · ')}
                </span>
              </button>
            </li>
          )}
        />
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this session?"
        body="Everything logged for this workout will be removed."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (session) deleteSession(session)
          setConfirmDelete(false)
        }}
      />
    </PageTransition>
  )
}
