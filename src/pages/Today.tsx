import { useState } from 'react'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { EmptyState } from '../components/ui/EmptyState'
import { PersonDayCard } from '../components/daily/PersonDayCard'
import { WaterRing } from '../components/daily/WaterRing'
import { StepsCard } from '../components/daily/StepsCard'
import { useData } from '../hooks/useData'
import { usePerson } from '../hooks/usePerson'
import { useDaily } from '../hooks/useDaily'
import { peopleInOrder } from '../services/selectors'
import { addDays, friendlyDate, todayKey } from '../utils/date'

/**
 * The home screen: both people's day at a glance, then the active person's
 * quick counters.
 */
export function Today() {
  const data = useData()
  const { person, setPerson } = usePerson()
  const [date, setDate] = useState(todayKey())
  const people = peopleInOrder(data)

  const { waterMl, steps, target, addWater, undoWater, setSteps } = useDaily(person?.id, date)

  if (people.length === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={Users}
          title="Nobody set up yet"
          hint="Add the people this app tracks in Setup."
        />
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{friendlyDate(date)}</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {people.length === 2 ? 'Both of you' : `${people.length} people`}
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

      <div className="mt-5 space-y-3">
        {people.map((p) => (
          <PersonDayCard key={p.id} person={p} date={date} onFocus={() => setPerson(p.id)} />
        ))}
      </div>

      {person && target && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400">
            {person.emoji} {person.name} · today
          </h2>
          <WaterRing
            ml={waterMl}
            targetMl={target.waterMl}
            stepMl={data.settings.waterStepMl}
            onAdd={addWater}
            onUndo={undoWater}
          />
          <StepsCard steps={steps} target={target.steps} onChange={setSteps} />
        </div>
      )}
    </PageTransition>
  )
}
