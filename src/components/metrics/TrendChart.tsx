import type { DateKey, Range } from '../../types'
import type { Reading } from '../../utils/stats'
import { fromKey } from '../../utils/date'

interface Props {
  readings: Reading[]
  line: { date: DateKey; mean: number | null }[]
  /** Target rate in kg/week, used to draw the corridor. */
  band?: Range
  unit?: string
}

const W = 320
const H = 120
const PAD = { top: 8, right: 4, bottom: 16, left: 4 }

/**
 * Weight over six weeks: raw readings faint, the 7-day average bold, and the
 * target corridor behind both.
 *
 * Inline SVG rather than a chart library — one series and a band is not worth
 * 100 kB, and this way the colours follow the person's accent.
 *
 * The corridor is projected forward from the earliest 7-day average at the
 * target rate, so "am I on track" is answerable by looking at whether the bold
 * line sits inside the shaded wedge.
 */
export function TrendChart({ readings, line, band, unit = 'kg' }: Props) {
  const means = line.filter((p) => p.mean != null) as { date: DateKey; mean: number }[]
  if (readings.length < 2 || means.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Two or more weigh-ins are needed before a trend means anything.
      </p>
    )
  }

  const days = line.length
  const first = means[0]
  const startIndex = line.findIndex((p) => p.date === first.date)

  // Corridor endpoints at the target rate.
  const weeksSpan = (days - 1 - startIndex) / 7
  const corridor = band
    ? {
        loEnd: first.mean + band.min * weeksSpan,
        hiEnd: first.mean + band.max * weeksSpan,
      }
    : undefined

  const values = [
    ...readings.map((r) => r.value),
    ...means.map((m) => m.mean),
    ...(corridor ? [corridor.loEnd, corridor.hiEnd] : []),
  ]
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi - lo < 1) {
    // A nearly flat series would otherwise render as noise filling the box.
    const mid = (hi + lo) / 2
    lo = mid - 0.5
    hi = mid + 0.5
  }
  const pad = (hi - lo) * 0.12
  lo -= pad
  hi += pad

  const x = (i: number) => PAD.left + (i / (days - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) =>
    PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)

  const indexOf = (date: DateKey) => line.findIndex((p) => p.date === date)

  // Break the average line wherever a window had no readings.
  const segments: string[] = []
  let current: string[] = []
  line.forEach((p, i) => {
    if (p.mean == null) {
      if (current.length > 1) segments.push(current.join(' '))
      current = []
      return
    }
    current.push(`${current.length === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.mean).toFixed(1)}`)
  })
  if (current.length > 1) segments.push(current.join(' '))

  const firstLabel = fromKey(line[0].date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
  const lastLabel = fromKey(line[days - 1].date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Weight trend over the last ${days} days in ${unit}`}
      >
        {corridor && (
          <polygon
            points={[
              `${x(startIndex)},${y(first.mean)}`,
              `${x(days - 1)},${y(corridor.hiEnd)}`,
              `${x(days - 1)},${y(corridor.loEnd)}`,
            ].join(' ')}
            className="fill-accent/10"
          />
        )}

        {readings.map((r) => {
          const i = indexOf(r.date)
          if (i < 0) return null
          return (
            <circle
              key={r.date}
              cx={x(i)}
              cy={y(r.value)}
              r={1.8}
              className="fill-slate-400/50"
            />
          )
        })}

        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            className="stroke-accent"
          />
        ))}

        {means.length > 0 && (
          <circle
            cx={x(indexOf(means[means.length - 1].date))}
            cy={y(means[means.length - 1].mean)}
            r={3.2}
            className="fill-accent"
          />
        )}
      </svg>

      <figcaption className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{firstLabel}</span>
        <span>
          {band ? 'Shaded = target rate · ' : ''}
          line = 7-day average
        </span>
        <span>{lastLabel}</span>
      </figcaption>
    </figure>
  )
}
