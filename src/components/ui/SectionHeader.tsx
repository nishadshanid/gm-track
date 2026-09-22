import { Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  count?: number
  onAdd?: () => void
  addLabel?: string
  /** Defaults to a plus. Pass another icon when the action isn't "add". */
  addIcon?: LucideIcon
}

export function SectionHeader({ title, count, onAdd, addLabel = 'Add', addIcon }: Props) {
  const Icon = addIcon ?? Plus
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-400">
        {title}
        {count != null && <span className="ml-1.5 text-slate-500">{count}</span>}
      </h2>
      {onAdd && (
        <button type="button" onClick={onAdd} className="btn-ghost -mr-2 !py-1.5 text-accent">
          <Icon size={16} /> {addLabel}
        </button>
      )}
    </div>
  )
}
