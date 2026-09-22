import type { AppData, CollectionKey, Rec, RecordOf } from '../types'
import { storage } from './storage.ts'
import { emptyData } from './seed.ts'
import { deviceId } from '../utils/id.ts'

/**
 * Tiny external store. Holds the data in memory, persists every change through
 * the storage adapter, and notifies subscribers via useSyncExternalStore.
 * No Redux, no Context.
 *
 * Fourteen collections would mean forty-odd bespoke actions, so the core is
 * generic — upsert / patch / remove / mutate — and domain hooks build on top.
 *
 * `emit()` is the single place that stamps `updatedAt` and `updatedBy`. That
 * one stamping site is what makes the Phase 7 merge trustworthy: if a record
 * could be written without a fresh stamp, last-write-wins would silently
 * resolve the wrong way.
 */

let data: AppData = emptyData()
const listeners = new Set<() => void>()

/**
 * The highest `updatedAt` seen from a remote snapshot, as epoch ms.
 *
 * Clock-skew guard: two phones can be minutes apart, and naive
 * last-write-wins then lets a stale edit beat a newer one. Stamping with
 * max(now, lastSeenRemote + 1) keeps our writes monotonically after anything
 * we have already observed.
 */
let lastSeenRemoteMs = 0

function stamp(): string {
  return new Date(Math.max(Date.now(), lastSeenRemoteMs + 1)).toISOString()
}

function noteRemote(snapshot: AppData) {
  let max = 0
  for (const key of collectionKeys) {
    for (const rec of snapshot[key] as Rec[]) {
      const t = Date.parse(rec.updatedAt)
      if (t > max) max = t
    }
  }
  const settings = Date.parse(snapshot.settings?.updatedAt ?? '')
  if (settings > max) max = settings
  if (max > lastSeenRemoteMs) lastSeenRemoteMs = max
}

export const collectionKeys = [
  'people',
  'targets',
  'coaching',
  'foods',
  'mealSlots',
  'mealOptions',
  'exercises',
  'dayTemplates',
  'schedules',
  'mealLogs',
  'workoutSessions',
  'bodyMetrics',
  'waterEntries',
  'stepLogs',
] as const satisfies readonly CollectionKey[]

// Initial load plus any live updates pushed by the backend.
storage.subscribe((remote) => {
  data = remote
  noteRemote(remote)
  listeners.forEach((l) => l())
})

function emit() {
  // Persist first so a reload never loses the change, then re-render.
  storage.save(data)
  listeners.forEach((l) => l())
}

export const store = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getSnapshot(): AppData {
    return data
  },

  /** Insert or replace a record, stamping it. */
  upsert<K extends CollectionKey>(key: K, rec: RecordOf<K>) {
    const stamped = { ...rec, updatedAt: stamp(), updatedBy: deviceId() }
    const list = data[key] as Rec[]
    const exists = list.some((r) => r.id === rec.id)
    const next = exists
      ? list.map((r) => (r.id === rec.id ? stamped : r))
      : [stamped as Rec, ...list]
    data = { ...data, [key]: next }
    emit()
  },

  /**
   * Update one record from its CURRENT stored value.
   *
   * This is the primitive that callers in hooks must use, because `patch` and
   * `upsert` take a value the caller already has — and in React that value
   * comes from a render closure. Three quick taps (ticking set 1, 2, 3) all run
   * before a re-render, so all three would compute from the same stale record
   * and the last write would silently discard the first two. Reading `data`
   * here instead means consecutive calls compose.
   */
  update<K extends CollectionKey>(key: K, id: string, fn: (rec: RecordOf<K>) => RecordOf<K>) {
    const list = data[key] as Rec[]
    const found = list.find((r) => r.id === id)
    if (!found) return
    const next = fn(found as RecordOf<K>)
    data = {
      ...data,
      [key]: list.map((r) =>
        r.id === id ? { ...next, updatedAt: stamp(), updatedBy: deviceId() } : r,
      ),
    }
    emit()
  },

  /** Merge a patch into one record. No-op if the id is unknown. */
  patch<K extends CollectionKey>(key: K, id: string, patch: Partial<RecordOf<K>>) {
    const list = data[key] as Rec[]
    if (!list.some((r) => r.id === id)) return
    data = {
      ...data,
      [key]: list.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: stamp(), updatedBy: deviceId() } : r,
      ),
    }
    emit()
  },

  /**
   * Soft delete. Never splices: a spliced record is resurrected by the other
   * device on the next merge, because absence carries no timestamp to compare.
   */
  remove<K extends CollectionKey>(key: K, id: string) {
    const now = stamp()
    const list = data[key] as Rec[]
    data = {
      ...data,
      [key]: list.map((r) =>
        r.id === id ? { ...r, deletedAt: now, updatedAt: now, updatedBy: deviceId() } : r,
      ),
    }
    emit()
  },

  /** Undo a soft delete. */
  restore<K extends CollectionKey>(key: K, id: string) {
    const list = data[key] as Rec[]
    data = {
      ...data,
      [key]: list.map((r) =>
        r.id === id ? { ...r, deletedAt: undefined, updatedAt: stamp(), updatedBy: deviceId() } : r,
      ),
    }
    emit()
  },

  /**
   * Escape hatch for a change that touches several collections at once, or a
   * nested record (a set inside a session). The caller is responsible for
   * stamping what it touches — use `store.now()`.
   */
  mutate(fn: (draft: AppData) => AppData) {
    data = fn(data)
    emit()
  },

  /** The stamp a caller should use inside `mutate`. */
  now: stamp,

  /** Replace everything — JSON import, reset to seed. */
  replaceAll(next: AppData) {
    data = next
    emit()
  },
}
