import { useState } from 'react'
import { ChevronLeft, ChevronRight, Ruler, Trash2 } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { EmptyState } from '../components/ui/EmptyState'
import { WeightEntry } from '../components/metrics/WeightEntry'
import { MeasureRow } from '../components/metrics/MeasureRow'
import { WeeklyAverageCard } from '../components/metrics/WeeklyAverageCard'
import { TrendChart } from '../components/metrics/TrendChart'
import { useMetrics } from '../hooks/useMetrics'
import { addDays, friendlyDate, todayKey } from '../utils/date'
import { cm, kg } from '../utils/format'

export function Metrics() {
  const [date, setDate] = useState(todayKey())
  const { person, rules, metrics, today, weights, waists, week, trend, waistTrend, line, set, removeDay } =
    useMetrics(date)

  if (!person) {
    return (
      <PageTransition>
        <EmptyState icon={Ruler} title="No one set up" hint="Add a person in Setup." />
      </PageTransition>
    )
  }

  const recent = metrics.slice(0, 10)

  return (
    <PageTransition>
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{friendlyDate(date)}</h1>
          <p className="mt-0.5 truncate text-sm text-slate-400">
            {person.emoji} {person.name}
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

      <div className="mt-5 space-y-4">
        <WeightEntry value={today?.weightKg} onChange={(v) => set({ weightKg: v })} />

        <WeeklyAverageCard
          week={week}
          trend={trend}
          band={rules?.weeklyDeltaKg}
          goal={rules?.goal}
        />

        <section className="card">
          <h2 className="text-sm font-semibold text-slate-400">Last 6 weeks</h2>
          <div className="mt-2">
            <TrendChart readings={weights} line={line} band={rules?.weeklyDeltaKg} />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-400">Measurements</h2>
          <MeasureRow
            label="Waist"
            value={today?.waistCm}
            onChange={(v) => set({ waistCm: v })}
            hint={
              waists.length > 1
                ? `Started at ${cm(waists[0].value)} on ${waists[0].date}.`
                : 'The scale can sit still for weeks while the tape keeps moving.'
            }
          />
          <MeasureRow label="Hip" value={today?.hipCm} onChange={(v) => set({ hipCm: v })} />
          {waistTrend.status === 'ok' && waistTrend.kgPerWeek != null && (
            <p className="text-xs text-slate-500">
              Waist is moving {Math.abs(Math.round(waistTrend.kgPerWeek * 100) / 100)} cm/week{' '}
              {waistTrend.kgPerWeek < 0 ? 'down' : 'up'}.
            </p>
          )}
        </section>

        {today && (
          <button type="button" onClick={removeDay} className="btn-ghost w-full text-xs text-danger">
            <Trash2 size={12} /> Delete this day&rsquo;s entry
          </button>
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-400">Recent entries</h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setDate(m.date)}
                    className="text-left text-slate-500 hover:text-accent dark:text-slate-300"
                  >
                    {friendlyDate(m.date)}
                  </button>
                  <span className="tabular-nums text-slate-400">
                    {m.weightKg != null ? kg(m.weightKg) : '—'}
                    {m.waistCm != null ? ` · waist ${cm(m.waistCm)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageTransition>
  )
}
