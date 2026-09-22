import { NavLink } from 'react-router-dom'
import { Dumbbell, Home, Lightbulb, Ruler, Settings2, UtensilsCrossed } from 'lucide-react'

const links = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/diet', label: 'Diet', icon: UtensilsCrossed, end: false },
  { to: '/workout', label: 'Gym', icon: Dumbbell, end: false },
  { to: '/metrics', label: 'Body', icon: Ruler, end: false },
  { to: '/insights', label: 'Coach', icon: Lightbulb, end: false },
  { to: '/setup', label: 'Setup', icon: Settings2, end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-slate-200 bg-white/90 px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <ul className="flex items-center justify-around">
        {links.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
