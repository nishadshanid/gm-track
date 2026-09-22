import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { SyncQueue } from '../src/services/syncQueue.ts'
import { normalize } from '../src/services/normalize.ts'
import { emptyData } from '../src/services/seed.ts'

/**
 * Two devices, one shared file.
 *
 * The transport is an in-memory file with a sha, so the read-merge-write loop,
 * the stale-sha conflict and the retry can be driven deterministically. This is
 * the path that decides whether a set logged in the gym survives, and it is not
 * otherwise reachable without a real repo.
 */

const remote = { text: null, sha: 0 }
const calls = { reads: 0, writes: 0, conflicts: 0 }
/** Runs just before the next write, to simulate the other phone landing first. */
let beforeNextWrite = null
let online = true

/** One device's view: it remembers the sha it last read. */
function transport() {
  let heldSha = 0
  return {
    ready: () => true,
    isOnline: () => online,
    read: async () => {
      calls.reads++
      heldSha = remote.sha
      return { text: remote.text }
    },
    write: async (text) => {
      if (beforeNextWrite) {
        const fn = beforeNextWrite
        beforeNextWrite = null
        fn()
      }
      calls.writes++
      if (heldSha !== remote.sha) {
        // Stale sha: the file moved between our read and our write.
        calls.conflicts++
        return false
      }
      remote.text = text
      remote.sha++
      heldSha = remote.sha
      return true
    },
  }
}

const writeRemoteDirectly = (text) => {
  remote.text = text
  remote.sha++
}

const T = (n) => `2026-09-22T10:${String(n).padStart(2, '0')}:00.000Z`

function snapshotWith(foods, water = []) {
  return { ...emptyData(), foods, waterEntries: water }
}
const food = (id, name, at, by) => ({
  id, name, updatedAt: at, updatedBy: by, unit: 'g',
  basis: { qty: 100, unit: 'g', kcal: 100, proteinG: 5 },
})
const glass = (id, at, by) => ({
  id, updatedAt: at, updatedBy: by, personId: 'p-him', date: '2026-09-22', ml: 250, at,
})

const queues = []
function device() {
  let latest = null
  const q = new SyncQueue(transport(), (merged) => {
    latest = merged
  })
  queues.push(q)
  return { q, get data() { return latest } }
}

// A queued snapshot schedules a debounce timer; dispose them or the run hangs.
after(() => queues.forEach((q) => q.dispose()))

const reset = () => {
  remote.text = null
  remote.sha = 0
  calls.reads = 0
  calls.writes = 0
  calls.conflicts = 0
  beforeNextWrite = null
  online = true
}

test('a first flush creates the file', async () => {
  reset()
  const a = device()
  a.q.queue(snapshotWith([food('x', 'Idli', T(1), 'A')]))
  await a.q.flush()
  assert.ok(remote.text, 'file written')
  assert.equal(JSON.parse(remote.text).foods[0].name, 'Idli')
  assert.equal(calls.writes, 1)
})

test('the second device merges rather than overwriting', async () => {
  reset()
  const a = device()
  a.q.queue(snapshotWith([food('x', 'Idli', T(1), 'A')]))
  await a.q.flush()

  const b = device()
  b.q.queue(snapshotWith([food('y', 'Dosa', T(2), 'B')]))
  await b.q.flush()

  const merged = normalize(JSON.parse(remote.text))
  assert.deepEqual(merged.foods.map((f) => f.id).sort(), ['x', 'y'])
})

test('a stale sha makes the writer re-read and merge, losing nothing', async () => {
  reset()
  // A has the file at sha 0 and is about to write...
  const a = device()
  a.q.queue(snapshotWith([food('x', 'From A', T(5), 'A')]))

  // ...but B lands a write first, exactly between A's read and A's write.
  beforeNextWrite = () => {
    writeRemoteDirectly(JSON.stringify(snapshotWith([food('y', 'From B', T(6), 'B')])))
  }

  await a.q.flush()

  assert.ok(calls.conflicts >= 1, 'the conflict was detected, not ignored')
  const final = normalize(JSON.parse(remote.text))
  assert.deepEqual(
    final.foods.map((f) => f.id).sort(),
    ['x', 'y'],
    "both devices' work survived the conflict",
  )
})

test('simultaneous water taps on two devices both reach the file', async () => {
  reset()
  const a = device()
  a.q.queue(snapshotWith([], [glass('w1', T(1), 'A')]))
  await a.q.flush()

  const b = device()
  b.q.queue(snapshotWith([], [glass('w2', T(1), 'B')]))
  await b.q.flush()

  const final = normalize(JSON.parse(remote.text))
  assert.equal(final.waterEntries.length, 2)
  assert.equal(final.waterEntries.reduce((n, w) => n + w.ml, 0), 500)
})

test('a push whose content is already upstream writes nothing', async () => {
  reset()
  const a = device()
  const snap = snapshotWith([food('x', 'Idli', T(1), 'A')])
  a.q.queue(snap)
  await a.q.flush()
  const writesAfterFirst = calls.writes

  const b = device()
  b.q.queue(normalize(JSON.parse(remote.text)))
  await b.q.flush()

  assert.equal(calls.writes, writesAfterFirst, 'no redundant commit')
})

test('polling merges the remote into unpushed local work', async () => {
  reset()
  writeRemoteDirectly(JSON.stringify(snapshotWith([food('y', 'From B', T(9), 'B')])))

  const a = device()
  a.q.queue(snapshotWith([food('x', 'From A', T(8), 'A')]))
  await a.q.poll()

  assert.deepEqual(
    a.data.foods.map((f) => f.id).sort(),
    ['x', 'y'],
    'a poll must not clobber an edit that has not been pushed',
  )
})

test('many queued changes collapse into one commit', async () => {
  reset()
  const a = device()
  for (let i = 0; i < 20; i++) {
    a.q.queue(snapshotWith([food('x', `edit ${i}`, T(i), 'A')]))
  }
  await a.q.flush()
  assert.equal(calls.writes, 1, '20 edits, 1 commit')
  assert.equal(JSON.parse(remote.text).foods[0].name, 'edit 19')
})

test('offline, a flush writes nothing and the work stays queued', async () => {
  reset()
  online = false
  const a = device()
  a.q.queue(snapshotWith([food('x', 'Offline edit', T(1), 'A')]))
  await a.q.flush()
  assert.equal(calls.writes, 0)
  assert.ok(a.q.pendingSnapshot, 'still pending')

  // Back online, the same pending snapshot goes up.
  online = true
  await a.q.flush()
  assert.equal(JSON.parse(remote.text).foods[0].name, 'Offline edit')
})
