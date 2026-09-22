import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, hint, action }: Props) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <Icon size={26} className="text-slate-500" />
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-[16rem] text-xs text-slate-400">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
