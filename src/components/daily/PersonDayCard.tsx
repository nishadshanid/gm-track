import { Link } from 'react-router-dom'
import { CheckCircle2, Droplet, Dumbbell, Footprints, Moon, UtensilsCrossed } from 'lucide-react'
import type { DateKey, Person } from '../../types'
import { useDaily } from '../../hooks/useDaily'
import { useData } from '../../hooks/useData'
import { live } from '../../services/selectors'
import { weekdayOf } from '../../utils/date'
import { litres } from '../../utils/format'
import { TodayRings } from './TodayRings'
import { StreakChip } from './StreakChip'

interface Props {
  person: Person
  date: DateKey
  /** Switches the app to this person before navigating. */
  onFocus: () => void
}

/**
 * One person's day, side by side with the other's.
 *
 * Both people are on screen at once because either phone logs for either
 * person — the household runs one kitchen and one gym slot, and seeing "she
 * has 40 g of protein left and hasn't logged dinner" is the point.
 */
export function PersonDayCard({ person, date, onFocus }: Props) {
  const data = useData()
  const { macros, waterMl, steps, target, sessions, mealsLogged, loggedStreak, addWater } =
    useDaily(person.id, date)

  // What the week plans for this person today.
  const schedule = live(data.schedules).find((s) => s.personId === person.id)
  const planned = schedule?.days[weekdayOf(date)]
  const template =
    planned && planned !== 'rest'
      ? live(data.dayTemplates).find((t) => t.id === planned)
      : undefined
  const isRest = planned === 'rest'

  const session = sessions[0]
  const stepTarget = target?.steps ?? 0

  return (
    <section
      className="card space-y-3"
      style={
        {
          '--accent': person.color,
          '--accent-soft': person.color,
          '--accent-strong': person.color,
        } as React.CSSProperties
      }
    >
      <header className="flex items-center gap-2">
        <span
          className="grid h-9 w-9 flex-none place-items-center rounded-xl text-lg"
          style={{ backgroundColor: `rgb(${person.color} / 0.15)` }}
        >
          {person.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 truncate font-bold">
            {person.name}
            <StreakChip days={loggedStreak} />
          </h2>
          <p className="text-xs text-slate-400">
            {mealsLogged.eaten}/{mealsLogged.total} meals
            {steps != null ? ` · ${steps.toLocaleString()} steps` : ''}
          </p>
        </div>
      </header>

      {target ? (
        <TodayRings
          macros={macros}
          kcal={target.kcal}
          proteinG={target.proteinG}
          waterMl={waterMl}
          waterTargetMl={target.waterMl}
        />
      ) : (
        <p className="text-xs text-slate-400">No targets set. Add them in Setup.</p>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
        {session ? (
          session.finishedAt ? (
            <CheckCircle2 size={15} className="flex-none text-success" />
          ) : (
            <Dumbbell size={15} className="flex-none text-accent" />
          )
        ) : isRest ? (
          <Moon size={15} className="flex-none text-slate-400" />
        ) : (
          <Dumbbell size={15} className="flex-none text-slate-400" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs">
          {session
            ? `${session.templateName} · ${session.finishedAt ? 'done' : 'in progress'}`
            : isRest
              ? 'Rest day'
              : (template?.name ?? 'Nothing scheduled')}
        </span>
        {/* A rest day gets no call to action — resting is the plan, not a gap. */}
        {(session || !isRest) && (
          <Link
            to="/workout"
            onClick={onFocus}
            className="flex-none text-xs font-semibold text-accent"
          >
            {session ? 'Open' : 'Start'}
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <Link to="/diet" onClick={onFocus} className="btn-ghost flex-1 !py-2 text-xs">
          <UtensilsCrossed size={13} /> Log food
        </Link>
        <button
          type="button"
          onClick={() => addWater(data.settings.waterStepMl)}
          className="btn-ghost flex-1 !py-2 text-xs text-accent"
        >
          <Droplet size={13} /> +{data.settings.waterStepMl} ml
        </button>
        <Link
          to="/metrics"
          onClick={onFocus}
          aria-label={`Weight and measurements for ${person.name}`}
          title="Weight, waist, steps"
          className="btn-ghost flex-none !py-2 text-xs"
        >
          <Footprints size={13} />
        </Link>
      </div>

      {target && waterMl > 0 && waterMl < target.waterMl && (
        <p className="text-[11px] text-slate-500">
          {litres(target.waterMl - waterMl)} of water still to go.
        </p>
      )}
      {stepTarget > 0 && steps != null && steps < stepTarget && (
        <p className="text-[11px] text-slate-500">
          {(stepTarget - steps).toLocaleString()} steps short of {stepTarget.toLocaleString()}.
        </p>
      )}
    </section>
  )
}
