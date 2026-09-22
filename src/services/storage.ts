import type { AppData } from '../types'
import { seedData } from './seed.ts'
import { normalize } from './normalize.ts'
import { GithubError, githubConfigured, githubReady, readFile, writeFile } from './github.ts'
import { SyncQueue } from './syncQueue.ts'
import type { SyncTransport } from './syncQueue.ts'

export { normalize, SCHEMA_VERSION } from './normalize.ts'

/**
 * Storage layer.
 *
 * The rest of the app depends only on this interface. `subscribe` + `save` are
 * all a backend must implement; `flush` and `status` are optional and exist so
 * the GitHub adapter added in Phase 7 can expose its debounced write queue
 * without any component learning about it.
 *
 * To add a backend: implement the interface and point `storage` at it.
 */
export interface StorageAdapter {
  subscribe(cb: (data: AppData) => void): () => void
  save(data: AppData): void
  flush?(): Promise<void>
  status?(cb: (s: SyncStatus) => void): () => void
}

export type SyncState = 'idle' | 'dirty' | 'syncing' | 'offline' | 'error'

export interface SyncStatus {
  state: SyncState
  pendingSince?: string
  lastSyncAt?: string
  error?: string
}

// ---------------------------------------------------------------------------
// localStorage adapter — the only backend until Phase 7.
// ---------------------------------------------------------------------------

const KEY = 'gm2-data'

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // Unreadable or corrupt — fall through and start fresh from the seed.
  }
  // First run on this device. Persist the seed immediately: if we only
  // returned it, what the UI shows and what is stored would disagree until the
  // first edit, and a later change to the seed would silently rewrite the app
  // under someone who had already started using it.
  const seeded = seedData()
  try {
    localStorage.setItem(KEY, JSON.stringify(seeded))
  } catch (err) {
    console.error('Seeding failed', err)
  }
  return seeded
}

function writeMirror(data: AppData) {
  try {
    // Never pretty-printed: this same string is what gets PUT, and the contents
    // API only inlines about 1 MB.
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Local save failed', err)
  }
}

const localStorageAdapter: StorageAdapter = {
  subscribe(cb) {
    cb(loadLocal())
    // Another tab of the same app writing the same key.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) cb(loadLocal())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  },
  save: writeMirror,
}

// ---------------------------------------------------------------------------
// GitHub adapter — one JSON file in a private repo, shared by both phones.
//
// The localStorage mirror is not a fallback here, it is the outbox. Because the
// merge is state-based, the dirty snapshot in this browser IS the queue: a
// force-quit in the gym basement loses nothing, and the next flush point
// reconciles. That is why there is no separate list of pending operations.
// ---------------------------------------------------------------------------

/** Poll while the tab is visible, so the other phone's sets appear mid-session. */
const POLL_MS = 30_000

const githubTransport: SyncTransport = {
  ready: githubReady,
  read: (useEtag) => readFile(useEtag),
  write: (text, message) => writeFile(text, message),
  fatal: (err) => err instanceof GithubError && (err.status === 401 || err.status === 403),
  isOnline: () => navigator.onLine,
}

const githubAdapter: StorageAdapter = {
  subscribe(cb) {
    let live = true
    const queue = new SyncQueue(githubTransport, (merged) => {
      if (!live) return
      writeMirror(merged)
      cb(merged)
    })
    activeQueue = queue

    // Render from the mirror immediately — the network is not on the critical
    // path for showing yesterday's data.
    cb(loadLocal())

    const poll = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void queue.poll()
    }
    poll()

    const timer = setInterval(poll, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
      // Hiding the tab is the most common way a session ends. Flush there.
      else void queue.flush()
    }
    const onHide = () => void queue.flush()
    const onOnline = () => {
      poll()
      void queue.flush()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('online', onOnline)

    return () => {
      live = false
      queue.dispose()
      activeQueue = null
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('online', onOnline)
    }
  },

  save(data) {
    // Mirror synchronously: this is what survives a crash or a lost signal.
    writeMirror(data)
    activeQueue?.queue(data)
  },

  flush() {
    return activeQueue?.flush() ?? Promise.resolve()
  },

  status(cb) {
    return activeQueue?.subscribe(cb) ?? (() => {})
  },
}

let activeQueue: SyncQueue | null = null

/**
 * The active adapter. Swap backends by changing this line.
 *
 * A configured repo with no token yet still uses the GitHub adapter: it renders
 * from the mirror and starts syncing the moment a token is pasted in Settings,
 * rather than stranding the data in a different store.
 */
export const storage: StorageAdapter = githubConfigured ? githubAdapter : localStorageAdapter

export { KEY as LOCAL_DATA_KEY, githubReady }
