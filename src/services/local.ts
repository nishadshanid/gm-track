/**
 * Device-local state — deliberately NOT part of AppData.
 *
 * Which person this phone is currently looking at, the theme, and (later) the
 * GitHub token are properties of the device, not of the shared data. Syncing
 * them would mean one phone changing what the other is looking at.
 */

const KEY = 'gm2-device'

interface DeviceState {
  activePersonId?: string
  theme?: 'light' | 'dark'
  ghToken?: string
}

function read(): DeviceState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DeviceState) : {}
  } catch {
    return {}
  }
}

function write(state: DeviceState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private mode or a full quota — the app still works, it just forgets.
  }
}

const listeners = new Set<() => void>()
let state: DeviceState = read()

function set(patch: Partial<DeviceState>) {
  state = { ...state, ...patch }
  write(state)
  listeners.forEach((l) => l())
}

export const local = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot(): DeviceState {
    return state
  },
  setActivePerson: (id: string) => set({ activePersonId: id }),
  setTheme: (theme: 'light' | 'dark') => set({ theme }),
  setToken: (ghToken: string) => set({ ghToken }),
  clearToken: () => set({ ghToken: undefined }),
}
