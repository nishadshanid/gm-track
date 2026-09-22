interface Props {
  label: string
  active?: boolean
  onClick?: () => void
  tone?: 'default' | 'muted' | 'warning'
}

export function Chip({ label, active, onClick, tone = 'default' }: Props) {
  const base =
    'rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap'
  if (!onClick) {
    const toneClass =
      tone === 'warning'
        ? 'bg-warning/15 text-warning'
        : tone === 'muted'
          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          : 'bg-accent/10 text-accent'
    return <span className={`${base} ${toneClass}`}>{label}</span>
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${base} ${
        active
          ? 'bg-accent text-white'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {label}
    </button>
  )
}
