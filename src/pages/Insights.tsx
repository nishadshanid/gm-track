import { useState } from 'react'
import { useState as useLocalState } from 'react'
import { Lightbulb, Share2, TrendingUp } from 'lucide-react'
import type { Advice } from '../utils/coach'
import { PageTransition } from '../components/PageTransition'
import { EmptyState } from '../components/ui/EmptyState'
import { CoachCard } from '../components/coach/CoachCard'
import { AdjustSheet } from '../components/coach/AdjustSheet'
import { TrendChart } from '../components/metrics/TrendChart'
import { useCoach } from '../hooks/useCoach'
import { useMetrics } from '../hooks/useMetrics'
import { useData } from '../hooks/useData'
import { live, sessionHistoryFor } from '../services/selectors'
import { setsByMuscle } from '../utils/volume'
import { topSet, workSets } from '../utils/overload'
import { addDays, todayKey } from '../utils/date'
import { kcal, range } from '../utils/format'
import { shareText, weeklySummary } from '../utils/shareSummary'

export function Insights() {
  const date = todayKey()
  const data = useData()
  const { person, rules, target, advice, intake, applyAdjustment } = useCoach(date)
  const { weights, line } = useMetrics(date)
  const [adjusting, setAdjusting] = useState<Advice | null>(null)
  const [shared, setShared] = useLocalState<string | null>(null)

  if (!person) {
    return (
      <PageTransition>
        <EmptyState icon={Lightbulb} title="No one set up" hint="Add a person in Setup." />
      </PageTransition>
    )
  }

  const logged = intake.filter((d) => d.logged)
  const avg = (pick: (d: typeof logged[number]) => number) =>
    logged.length ? logged.reduce((a, d) => a + pick(d), 0) / logged.length : null

  const avgKcal = avg((d) => d.kcal)
  const avgProtein = avg((d) => d.proteinG)

  // Weekly working sets per muscle, to compare against the plan's own counts.
  const volume = setsByMuscle(
    live(data.workoutSessions).filter((s) => s.personId === person.id),
    data.exercises,
    addDays(date, -6),
    date,
  )
  const muscles = Object.entries(volume).sort((a, b) => b[1] - a[1])

  // Load progression per exercise over the last few sessions.
  const progress = live(data.exercises)
    .map((exercise) => {
      const history = sessionHistoryFor(data, person.id, exercise.id).slice(0, 4)
      const points = history
        .map((s) => {
          const entry = s.entries.find((e) => e.exerciseId === exercise.id && !e.deletedAt)
          const best = entry ? topSet(entry) : undefined
          return best && entry && workSets(entry).length > 0
            ? { date: s.date, weightKg: best.weightKg, reps: best.reps }
            : null
        })
        .filter((p): p is { date: string; weightKg: number | null; reps: number } => p !== null)
      return { exercise, points }
    })
    .filter((p) => p.points.length >= 2)

  return (
    <PageTransition>
      <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
      <p className="mt-0.5 text-sm text-slate-400">
        {person.emoji} {person.name}
        {rules ? ` · ${rules.goal === 'gain' ? 'gaining' : rules.goal === 'loss' ? 'losing fat' : 'recomposing'}` : ''}
      </p>

      {!rules || !target ? (
        <div className="mt-5">
          <EmptyState
            icon={Lightbulb}
            title="No coaching rules yet"
            hint="Set the goal, target rate and adjustment step in Setup → People."
          />
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-3">
            {advice.map((a, i) => (
              <CoachCard
                key={`${a.kind}-${i}`}
                advice={a}
                onApply={a.apply ? () => setAdjusting(a) : undefined}
              />
            ))}
          </div>

          <section className="card mt-4">
            <h2 className="text-sm font-semibold text-slate-400">Weight trend</h2>
            <div className="mt-2">
              <TrendChart readings={weights} line={line} band={rules.weeklyDeltaKg} />
            </div>
          </section>

          <section className="card mt-4">
            <h2 className="text-sm font-semibold text-slate-400">
              Intake over the last {intake.length} days
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Days logged</dt>
                <dd className="font-semibold tabular-nums">
                  {logged.length} / {intake.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Average calories</dt>
                <dd className="font-semibold tabular-nums">
                  {avgKcal != null ? `${Math.round(avgKcal)}` : '—'}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    / {range(target.kcal.min, target.kcal.max, kcal)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Average protein</dt>
                <dd className="font-semibold tabular-nums">
                  {avgProtein != null ? `${Math.round(avgProtein)} g` : '—'}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    / {target.proteinG.min}–{target.proteinG.max} g
                  </span>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-500">
              Averaged over logged days only — an unlogged day is unknown, not zero.
            </p>
          </section>

          {muscles.length > 0 && (
            <section className="card mt-4">
              <h2 className="text-sm font-semibold text-slate-400">Working sets this week</h2>
              <ul className="mt-3 space-y-1.5">
                {muscles.map(([muscle, sets]) => (
                  <li key={muscle} className="flex items-center gap-2 text-sm">
                    <span className="w-20 flex-none capitalize text-slate-500 dark:text-slate-300">
                      {muscle}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.min(100, (sets / 14) * 100)}%` }}
                      />
                    </span>
                    <span className="w-6 flex-none text-right text-xs tabular-nums text-slate-400">
                      {sets}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                Counted against each exercise&rsquo;s primary muscle, the way the plan counts them.
              </p>
            </section>
          )}

          {progress.length > 0 && (
            <section className="card mt-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-400">
                <TrendingUp size={14} /> Load progression
              </h2>
              <ul className="mt-3 space-y-2">
                {progress.map(({ exercise, points }) => (
                  <li key={exercise.id} className="text-sm">
                    <span className="block truncate font-medium">{exercise.name}</span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {[...points]
                        .reverse()
                        .map((p) => (p.weightKg != null ? `${p.weightKg}×${p.reps}` : `${p.reps}`))
                        .join('  →  ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card mt-4">
            <h2 className="text-sm font-semibold text-slate-400">Send the week</h2>
            <p className="mt-1 text-xs text-slate-400">
              A short summary of what was actually logged — weight, food and sessions.
            </p>
            <button
              type="button"
              className="btn-ghost mt-3 w-full text-accent"
              onClick={async () => {
                const text = weeklySummary(data, person, date)
                const result = await shareText(text)
                setShared(
                  result === 'shared'
                    ? 'Shared.'
                    : result === 'copied'
                      ? 'Copied to the clipboard.'
                      : 'Could not share on this device.',
                )
              }}
            >
              <Share2 size={15} /> Share this week&rsquo;s summary
            </button>
            {shared && <p className="mt-2 text-xs text-slate-400">{shared}</p>}
          </section>

          <AdjustSheet
            advice={adjusting}
            target={target}
            onClose={() => setAdjusting(null)}
            onConfirm={(delta) => {
              applyAdjustment(delta)
              setAdjusting(null)
            }}
          />
        </>
      )}
    </PageTransition>
  )
}
