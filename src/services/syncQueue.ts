import type { AppData } from '../types'
import type { SyncStatus } from './storage.ts'
import { differsFrom, mergeData } from './merge.ts'
import { normalize } from './normalize.ts'

/**
 * What the queue needs from a backend.
 *
 * Injected rather than imported so the queue does not know about GitHub at all
 * — which keeps the read-merge-write loop, the stale-sha conflict and the retry
 * testable against an in-memory file instead of a real repo.
 */
export interface SyncTransport {
  /** Configured and authenticated enough to try. */
  ready(): boolean
  /** `undefined` means unchanged since the last read (a 304). */
  read(useEtag?: boolean): Promise<{ text: string | null | undefined }>
  /** False on a stale sha — someone else wrote since our read. */
  write(text: string, message: string): Promise<boolean>
  /** Whether a retry could possibly help. */
  fatal?(err: unknown): boolean
  isOnline?(): boolean
}

/**
 * The write queue.
 *
 * FTrack PUTs on every mutation. A gym session is roughly five exercises by
 * four sets by two people — about eighty mutations — so that would be eighty
 * commits, and GitHub's secondary rate limits would start rejecting them.
 *
 * Instead every mutation marks the snapshot dirty and schedules a push:
 *
 *   - 8 s after the last change (a whole exercise becomes one commit)
 *   - but never more than 45 s after the first unsaved change
 *   - and never closer than 10 s apart
 *
 * plus an immediate flush at the points where losing work would actually
 * matter: the tab being hidden, the page unloading, coming back online, and a
 * manual tap. That is 5–15 commits a session rather than 80.
 *
 * Every push is read-merge-write. A stale sha is not an error to retry harder;
 * it means the other phone wrote something, so we re-read, merge and try again.
 */

const IDLE_MS = 8_000
const MAX_WAIT_MS = 45_000
const MIN_GAP_MS = 10_000
const MAX_ATTEMPTS = 5

type Listener = (s: SyncStatus) => void

export class SyncQueue {
  private pending: AppData | null = null
  private dirtySince: number | null = null
  private lastPushAt = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private pushing = false
  private status: SyncStatus = { state: 'idle' }
  private listeners = new Set<Listener>()
  private readonly transport: SyncTransport
  /** Called with the merged snapshot whenever a push or poll brings one in. */
  private readonly onMerged: (data: AppData) => void

  // Written out rather than declared as constructor parameter properties, which
  // Node's type-stripping cannot parse — and these modules are unit-tested
  // directly with `node --test`.
  constructor(transport: SyncTransport, onMerged: (data: AppData) => void) {
    this.transport = transport
    this.onMerged = onMerged
  }

  private get online(): boolean {
    return this.transport.isOnline?.() ?? true
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.status)
    return () => this.listeners.delete(listener)
  }

  private emit(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch }
    this.listeners.forEach((l) => l(this.status))
  }

  /** Queue a snapshot. Cheap — it only schedules. */
  queue(data: AppData) {
    this.pending = data
    if (this.dirtySince == null) this.dirtySince = Date.now()
    this.emit({ state: this.online ? 'dirty' : 'offline', pendingSince: new Date(this.dirtySince).toISOString() })
    this.schedule()
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer)
    const now = Date.now()
    const sinceDirty = this.dirtySince ? now - this.dirtySince : 0
    const sinceLastPush = now - this.lastPushAt

    // Whichever comes first: the idle window, or the max-wait ceiling. Never
    // sooner than the minimum gap between commits.
    const wait = Math.max(
      Math.min(IDLE_MS, Math.max(0, MAX_WAIT_MS - sinceDirty)),
      Math.max(0, MIN_GAP_MS - sinceLastPush),
    )
    this.timer = setTimeout(() => void this.push(), wait)
  }

  /**
   * Stop the scheduler. Called when the adapter unsubscribes; without it a
   * pending debounce timer outlives the queue — which in a test run keeps the
   * process alive, and in the app leaves an orphaned timer writing on behalf of
   * a torn-down subscription.
   */
  dispose() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.listeners.clear()
  }

  /** Push now, if there is anything to push. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    await this.push()
  }

  /** Pull the remote copy and merge it into whatever is pending locally. */
  async poll(): Promise<void> {
    if (!this.transport.ready() || this.pushing) return
    try {
      const { text } = await this.transport.read()
      if (text === undefined) return // 304, nothing changed
      const remote = text ? normalize(JSON.parse(text) as Partial<AppData>) : null
      if (!remote) return
      // Merge into the pending snapshot rather than replacing it, so a poll can
      // never clobber an edit that has not been pushed yet.
      const base = this.pending ?? remote
      const merged = mergeData(remote, base)
      this.onMerged(merged)
      if (this.pending) this.pending = merged
      this.emit({ state: this.pending ? 'dirty' : 'idle', lastSyncAt: new Date().toISOString() })
      if (this.pending && differsFrom(merged, remote)) this.schedule()
    } catch (err) {
      this.fail(err)
    }
  }

  private fail(err: unknown) {
    const offline = !this.online
    this.emit({
      state: offline ? 'offline' : 'error',
      error: err instanceof Error ? err.message : String(err),
    })
  }

  private async push(): Promise<void> {
    if (this.pushing || !this.pending) return
    if (!this.transport.ready()) return
    if (!this.online) {
      this.emit({ state: 'offline' })
      return
    }

    this.pushing = true
    this.emit({ state: 'syncing' })

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const mine: AppData | null = this.pending
        if (!mine) break

        // Read-merge-write, always. Never a blind overwrite.
        const { text } = await this.transport.read(false)
        const remote = text ? normalize(JSON.parse(text) as Partial<AppData>) : null
        const merged: AppData = remote ? mergeData(remote, mine) : mine

        if (remote && !differsFrom(merged, remote)) {
          // Someone else's copy already contains everything we have.
          this.onMerged(merged)
          this.settle(merged)
          return
        }

        const ok = await this.transport.write(
          JSON.stringify(merged),
          `sync: ${new Date().toISOString()}`,
        )
        if (ok) {
          this.onMerged(merged)
          this.settle(merged)
          return
        }

        // Stale sha — the other phone wrote between our read and our write.
        // Keep the merged copy as the new base and try again.
        this.pending = merged
        const backoff = Math.min(8_000, 2 ** (attempt - 1) * 1000)
        await new Promise((r) => setTimeout(r, backoff + Math.random() * 300))
      }
      // Out of attempts: stay dirty and try again at the next flush point.
      this.emit({ state: 'dirty', error: 'Could not settle with the other device yet.' })
    } catch (err) {
      this.fail(err)
      // A rejected token will not fix itself by retrying.
      if (this.transport.fatal?.(err)) return
    } finally {
      this.pushing = false
      this.lastPushAt = Date.now()
      if (this.pending) this.schedule()
    }
  }

  private settle(merged: AppData) {
    // Only clear the dirty flag if nothing arrived while we were pushing.
    if (this.pending === null || JSON.stringify(this.pending) === JSON.stringify(merged)) {
      this.pending = null
      this.dirtySince = null
      this.emit({ state: 'idle', lastSyncAt: new Date().toISOString(), error: undefined, pendingSince: undefined })
    } else {
      this.emit({ state: 'dirty', lastSyncAt: new Date().toISOString() })
    }
  }

  get pendingSnapshot(): AppData | null {
    return this.pending
  }
}
