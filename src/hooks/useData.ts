import { useSyncExternalStore } from 'react'
import { store } from '../services/store'
import type { AppData } from '../types'

/** Reactive access to the whole snapshot. Re-renders on any change. */
export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}

export { store }
