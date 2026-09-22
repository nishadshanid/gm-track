import { useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { PeopleEditor } from '../components/setup/PeopleEditor'
import { TargetEditor } from '../components/setup/TargetEditor'
import { FoodEditor } from '../components/setup/FoodEditor'
import { ExerciseEditor } from '../components/setup/ExerciseEditor'
import { MealSlotEditor } from '../components/setup/MealSlotEditor'
import { DayTemplateEditor } from '../components/setup/DayTemplateEditor'
import { ScheduleEditor } from '../components/setup/ScheduleEditor'
import { CoachingRulesEditor } from '../components/setup/CoachingRulesEditor'
import { Download, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { selectable } from '../services/selectors'
import { store } from '../services/store'
import { missingSeed, topUpSeed } from '../services/seed'

const TABS = [
  { id: 'people', label: 'People' },
  { id: 'meals', label: 'Meals' },
  { id: 'workouts', label: 'Gym' },
  { id: 'foods', label: 'Foods' },
  { id: 'exercises', label: 'Exercises' },
] as const

type Tab = (typeof TABS)[number]['id']

/** Setup is where "nothing is hardcoded" is actually true. */
export function Setup() {
  const [tab, setTab] = useState<Tab>('people')
  const data = useData()

  const missing = missingSeed(data)

  const counts: Record<Tab, number> = {
    people: selectable(data.people).length,
    meals: selectable(data.mealSlots).length,
    workouts: selectable(data.dayTemplates).length,
    foods: selectable(data.foods).length,
    exercises: selectable(data.exercises).length,
  }

  return (
    <PageTransition>
      <h1 className="text-2xl font-bold tracking-tight">Setup</h1>
      <p className="mt-1 text-sm text-slate-400">
        Everything the app uses lives here and can be changed.
      </p>

      {missing.length > 0 && (
        <div className="card mt-5 border-accent/40">
          <p className="text-sm font-semibold">Starter content missing</p>
          <p className="mt-1 text-xs text-slate-400">
            This device has no {missing.join(', ')}. Loading the starter plan fills only what is
            empty — your logs and anything you have already edited are left alone.
          </p>
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={() => store.replaceAll(topUpSeed(data))}
          >
            <Download size={16} /> Load starter plan
          </button>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Setup sections"
        className="mt-5 flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl px-1.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
              tab === t.id
                ? 'bg-white text-accent shadow-soft dark:bg-slate-900'
                : 'text-slate-400'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs font-normal text-slate-400">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <Link to="/settings" className="btn-ghost mt-4 w-full justify-start text-sm">
        <Settings2 size={15} /> Sync, PIN and data
      </Link>

      <div className="mt-6">
        {tab === 'people' && (
          <>
            <PeopleEditor />
            <TargetEditor />
            <CoachingRulesEditor />
          </>
        )}
        {tab === 'meals' && <MealSlotEditor />}
        {tab === 'workouts' && (
          <>
            <DayTemplateEditor />
            <ScheduleEditor />
          </>
        )}
        {tab === 'foods' && <FoodEditor />}
        {tab === 'exercises' && <ExerciseEditor />}
      </div>
    </PageTransition>
  )
}
