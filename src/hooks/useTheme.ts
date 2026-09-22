import { useSyncExternalStore, useEffect } from 'react'
import { local } from '../services/local'

/** Dark by default — it gets used in a gym at 9 PM. */
export function useTheme() {
  const device = useSyncExternalStore(local.subscribe, local.getSnapshot)
  const theme = device.theme ?? 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return {
    theme,
    toggle: () => local.setTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
