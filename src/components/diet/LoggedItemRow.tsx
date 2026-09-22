import { Trash2 } from 'lucide-react'
import type { LoggedItem } from '../../types'
import { macrosOf } from '../../utils/macros'

interface Props {
  item: LoggedItem
  onEdit: () => void
  onRemove: () => void
}

export function LoggedItemRow({ item, onEdit, onRemove }: Props) {
  const m = macrosOf(item)
  const amount =
    item.amount.unit === 'piece'
      ? `${item.amount.value}`
      : `${item.amount.value} ${item.amount.unit}`

  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Change amount of ${item.foodName}`}
        className="flex min-w-0 flex-1 items-baseline gap-2 rounded-lg py-1.5 text-left"
      >
        <span className="w-16 flex-none text-sm font-semibold tabular-nums text-accent">
          {amount}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{item.foodName}</span>
        <span className="flex-none text-xs tabular-nums text-slate-400">
          {/* A dash, never a zero — see macros.ts. */}
          {m ? `${Math.round(m.kcal)} kcal` : '—'}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.foodName}`}
        className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Trash2 size={14} />
      </button>
    </li>
  )
}
