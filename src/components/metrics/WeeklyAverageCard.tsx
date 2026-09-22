import { Info, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { Range } from '../../types'
import type { Trend, WindowStat } from '../../utils/stats'
import { positionIn } from '../../utils/stats'
import { kg } from '../../utils/format'

interface Props {
  week: WindowStat | null
  trend: Trend
  band?: Range
  goal?: 'gain' | 'loss' | 'recomp'
}

/**
 * This week's average and the rate of change against the target band.
 *
 * Shows the evidence, not just the verdict: how many weigh-ins the average is
 * built from, and which two windows are being compared. A rate with no visible
 * basis gets either ignored or trusted blindly, and both are bad.
 */
export function WeeklyAverageCard({ week, trend, band, goal }: Props) {
  if (!week) {
    return (
      <section className="card">
        <h2 className="text-sm font-semibold text-slate-400">Weekly average</h2>
        <p className="mt-2 text-sm text-slate-400">
          No weigh-ins in the last 7 days. The plan asks for 3–7 mornings a week, under similar
          conditions.
        </p>
      </section>
    )
  }

  const rate = trend.kgPerWeek
  const position = rate != null && band ? positionIn(rate, band) : undefined
  const onTrack = position === 'inside'

  const Icon = rate == null ? Info : rate > 0.02 ? TrendingUp : rate < -0.02 ? TrendingDown : Minus

  const tone = onTrack
    ? 'text-success'
    : position === undefined
      ? 'text-slate-400'
      : 'text-warning'

  return (
    <section className="card">
      <h2 className="text-sm font-semibold text-slate-400">Weekly average</h2>

      <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
        {kg(week.mean)}
      </p>
      <p className="text-xs text-slate-400">
        from {week.count} {week.count === 1 ? 'weigh-in' : 'weigh-ins'} · {week.from} to {week.to}
      </p>

      <div className={`mt-3 flex items-start gap-1.5 text-sm ${tone}`}>
        <Icon size={15} className="mt-0.5 flex-none" />
        {rate != null ? (
          <span>
            <span className="font-semibold tabular-nums">
              {rate > 0 ? '+' : ''}
              {Math.round(rate * 100) / 100} kg/week
            </span>
            {band && (
              <span className="text-slate-400">
                {' '}
                · target {band.min > 0 ? '+' : ''}
                {band.min} to {band.max > 0 ? '+' : ''}
                {band.max}
              </span>
            )}
            {position && (
              <span className="block text-xs">
                {onTrack
                  ? 'On track — keep the diet the same.'
                  : position === 'below'
                    ? goal === 'loss'
                      ? 'Faster than intended. Not necessarily wrong, but check strength and energy.'
                      : 'Slower than intended.'
                    : goal === 'loss'
                      ? 'Not moving as intended.'
                      : 'Faster than intended.'}
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs">{trend.reason}</span>
        )}
      </div>

      {trend.status === 'ok' && trend.previous && (
        <p className="mt-2 text-xs text-slate-500">
          Compared with {kg(trend.previous.mean)} over {trend.previous.from} to{' '}
          {trend.previous.to} ({trend.previous.count} weigh-ins).
        </p>
      )}
    </section>
  )
}
