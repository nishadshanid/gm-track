import { motion } from 'framer-motion'
import { usePerson } from '../hooks/usePerson'

/**
 * Him / Her. Either phone can log for either person, so this is a view switch,
 * not a login. The list is read from the store — adding a third person in Setup
 * makes them appear here with no code change.
 */
export function PersonSwitcher() {
  const { people, person, setPerson } = usePerson()
  if (people.length < 2) return null

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
      {people.map((p) => {
        const active = p.id === person?.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPerson(p.id)}
            aria-pressed={active}
            className="relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{ color: active ? `rgb(${p.color})` : undefined }}
          >
            {active && (
              <motion.span
                layoutId="person-pill"
                className="absolute inset-0 rounded-xl bg-white shadow-soft dark:bg-slate-900"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <span aria-hidden>{p.emoji}</span>
              <span className={active ? '' : 'text-slate-400'}>{p.short}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
