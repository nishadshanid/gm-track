import type { Id, Weekday, WeekSchedule } from '../../types'
import { store } from '../../services/store'
import { useData } from '../../hooks/useData'
import { usePerson } from '../../hooks/usePerson'
import { live, selectable } from '../../services/selectors'
import { dayName } from '../../utils/date'
import { uid } from '../../utils/id'
import { Select } from '../ui/Field'
import { SectionHeader } from '../ui/SectionHeader'

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

/**
 * Which day of the week trains which session.
 *
 * Both programmes are Monday-to-Friday with the weekend off, so the week is
 * rendered Monday-first. Rest is an explicit choice rather than an absence —
 * the Workout screen says "rest day" instead of "nothing scheduled", because
 * two rest days are part of the programme, not a gap in it.
 */
export function ScheduleEditor() {
  const data = useData()
  const { person } = usePerson()
  if (!person) return null

  const templates = selectable(data.dayTemplates)
    .filter((t) => t.personId === person.id)
    .sort((a, b) => a.order - b.order)

  const schedule = live(data.schedules).find((s) => s.personId === person.id)

  const setDay = (weekday: Weekday, value: Id | 'rest' | null) => {
    if (schedule) {
      store.patch('schedules', schedule.id, {
        days: { ...schedule.days, [weekday]: value },
      })
      return
    }
    const fresh: WeekSchedule = {
      id: uid(),
      updatedAt: '',
      personId: person.id,
      days: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    }
    fresh.days[weekday] = value
    store.upsert('schedules', fresh)
  }

  return (
    <section className="mt-8">
      <SectionHeader title={`Week · ${person.short}`} />
      <ul className="space-y-2">
        {WEEK.map((weekday) => {
          const value = schedule?.days[weekday] ?? null
          return (
            <li key={weekday} className="flex items-center gap-3">
              <span className="w-24 flex-none text-sm font-medium">{dayName(weekday)}</span>
              <Select
                aria-label={`${dayName(weekday)} session`}
                value={value ?? ''}
                onChange={(e) => setDay(weekday, e.target.value === '' ? null : (e.target.value as Id))}
                className="flex-1 !py-2.5"
              >
                <option value="">Nothing planned</option>
                <option value="rest">Rest</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        You can still log any session on any day — this only decides what the Gym screen offers
        first.
      </p>
    </section>
  )
}
