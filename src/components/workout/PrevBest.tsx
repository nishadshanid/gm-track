import { History } from 'lucide-react'
import type { PrevPerformance } from '../../utils/overload'
import { formatPrev } from '../../utils/overload'
import { friendlyDate } from '../../utils/date'

/** "Last time: 40 kg × 8, 8, 7 — Mon 15 Sep". The number to beat. */
export function PrevBest({ prev, timed }: { prev: PrevPerformance | undefined; timed: boolean }) {
  const text = formatPrev(prev, timed)
  if (!prev || !text) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-400">
      <History size={12} className="flex-none" />
      <span className="font-medium text-slate-500 dark:text-slate-300">{text}</span>
      <span>· {friendlyDate(prev.session.date)}</span>
    </p>
  )
}
