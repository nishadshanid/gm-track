import { useSyncExternalStore } from 'react'
import { store } from '../services/store'
import { useData } from './useData'

/**
 * The edit PIN.
 *
 * This is an accident-guard, not security. It stops a pocket tap or a curious
 * child from rewriting yesterday's log; it does not protect the data, because
 * the data lives in a JSON file that anyone holding the GitHub token can read.
 * The README says so in as many words, and so does the Settings screen.
 *
 * The hash is stored in the shared data so both phones accept the same PIN.
 * Being unlocked is per-device and per-session.
 */

const UNLOCK_KEY = 'gm2-unlocked'

let unlocked = (() => {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
})()

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function hash(pin: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function usePin() {
  const data = useData()
  const isUnlocked = useSyncExternalStore(subscribe, () => unlocked)
  const enabled = Boolean(data.settings.pinEnabled && data.settings.pinHash)

  function setUnlocked(value: boolean) {
    unlocked = value
    try {
      if (value) sessionStorage.setItem(UNLOCK_KEY, '1')
      else sessionStorage.removeItem(UNLOCK_KEY)
    } catch {
      // Private mode — the unlock simply does not persist across a reload.
    }
    emit()
  }

  async function unlock(pin: string): Promise<boolean> {
    const { pinHash, pinSalt } = data.settings
    if (!pinHash || !pinSalt) return false
    const ok = (await hash(pin, pinSalt)) === pinHash
    if (ok) setUnlocked(true)
    return ok
  }

  async function setPin(pin: string): Promise<void> {
    // Settings is a single record rather than a collection, so it is written
    // through `mutate` instead of the generic collection helpers.
    const salt = randomSalt()
    const digest = await hash(pin, salt)
    store.mutate((draft) => ({
      ...draft,
      settings: { ...draft.settings, pinHash: digest, pinSalt: salt, pinEnabled: true, updatedAt: store.now() },
    }))
    setUnlocked(true)
  }

  function clearPin() {
    store.mutate((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        pinHash: undefined,
        pinSalt: undefined,
        pinEnabled: false,
        updatedAt: store.now(),
      },
    }))
    setUnlocked(true)
  }

  return {
    enabled,
    /** Editing is allowed when no PIN is set, or once it has been entered. */
    canEdit: !enabled || isUnlocked,
    unlock,
    lock: () => setUnlocked(false),
    setPin,
    clearPin,
  }
}
