import { Flame } from 'lucide-react'

/** Consecutive days with anything logged. Encouragement, not a scold. */
export function StreakChip({ days }: { days: number }) {
  if (days < 2) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
      <Flame size={11} /> {days} days
    </span>
  )
}
