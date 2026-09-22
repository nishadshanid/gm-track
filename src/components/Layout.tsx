import { Outlet } from 'react-router-dom'
import { usePerson } from '../hooks/usePerson'
import { useTheme } from '../hooks/useTheme'
import { BottomNav } from './BottomNav'
import { PersonSwitcher } from './PersonSwitcher'
import { PinGate } from './PinGate'
import { SyncChip } from './SyncChip'
import { ThemeToggle } from './ThemeToggle'

/**
 * Mobile-first shell: one column, max-w-md, fixed bottom tabs.
 *
 * The active person's colour is published as CSS custom properties here, so
 * every screen below picks up the accent without prop-drilling and no component
 * ever hardcodes a person's colour.
 */
export function Layout() {
  const { person } = usePerson()
  useTheme() // applies the dark class

  const accent = person?.color ?? '37 99 235'

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top,0px))]"
      style={
        {
          '--accent': accent,
          '--accent-soft': accent,
          '--accent-strong': accent,
        } as React.CSSProperties
      }
    >
      <header className="mb-5 flex items-center justify-between gap-2">
        <PersonSwitcher />
        <div className="flex items-center gap-1.5">
          <SyncChip />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <BottomNav />
      <PinGate />
    </div>
  )
}
