# Phase 7 — PIN and GitHub sync

**Goal:** both phones, same data, no lost sets.

**Demo:** two browser profiles pointed at the same private repo. Both log
different sets into the same Friday session inside one debounce window.
Hard-refresh both. Everything is there.

## Scope

- `src/services/github.ts` — ported from FTrack, generalised to
  `readFile(path)` / `writeFile(path, text)`, plus `If-None-Match` / ETag handling,
  backoff, and `verifyToken`.
- `src/services/merge.ts` — `mergeData(remote, local)`. Per-collection LWW by id
  with tombstones, plus a second level for `WorkoutSession.entries[].sets[]` and
  `MealLog.items[]`. Pure, and the most test-worthy module in the codebase.
- `src/services/syncQueue.ts` — the debounce (8 s idle / 45 s max wait / 10 s
  floor), the flush points, the retry ladder, and the status stream.
- `storage.ts` gains the github adapter; the localStorage adapter is untouched and
  still the fallback when no repo is configured.
- `SyncChip` in the header: idle / dirty / syncing / offline / error, with a
  manual sync tap.
- `PinGate` + `usePin` — SHA-256(pin + salt) in `Settings`, unlocked flag in
  `sessionStorage`. Viewing is always open; editing asks once per session.
- `Settings.tsx` — PAT entry, PIN, export / import JSON, "archive logs older
  than N months", danger zone.

## Files

```
src/services/{github,merge,syncQueue}.ts
src/services/storage.ts        ← githubAdapter added
src/hooks/{useSync,usePin}.ts
src/components/{SyncChip,PinGate}.tsx
src/pages/Settings.tsx
```

## Notes

- **Private repo**, so reads are authenticated too — the data file holds both
  people's weight and measurements. Fine-grained PAT, Contents: read+write, that
  repo only, pasted once per phone and stored only in that browser.
- `JSON.stringify(data)` with no pretty-printing. The contents API inlines only
  about 1 MB, and pretty-printing roughly doubles the file for nothing.
- The merge runs on **every** poll, not just on a 409, so a background refetch can
  never clobber unsaved local edits.
- The clock-skew guard (`Math.max(Date.now(), lastSeenRemoteMs + 1)`) lives in
  `store.emit()`, the single stamping site.
- The README must state plainly: the PIN stops fat-finger edits; the PAT is the
  only real credential.

## Changed while building

- **The queue takes an injected `SyncTransport`**, not the GitHub module. The
  read-merge-write loop, the stale-sha conflict and the retry are the code most
  likely to lose a logged set and the least reachable without a real repo;
  injecting the transport makes all of it testable against an in-memory file.
  `storage.ts` supplies the GitHub implementation.
- **Polling is visibility-aware, not route-aware.** 30 s while the tab is
  visible, paused when hidden, plus on `online`. The planned 30 s/120 s split by
  route needed the adapter to know the router for no real benefit: with ETags a
  poll is a 304, and 2 requests a minute is nowhere near the 5,000/hour ceiling.
- **`normalize` moved out of `storage.ts`** into `services/normalize.ts`, so the
  queue can shape a remote snapshot without importing the adapter it belongs to.
- **`SyncQueue.dispose()`** clears the pending debounce timer when the adapter
  unsubscribes. Without it a torn-down subscription leaves a timer that still
  intends to write.
- **Relative imports inside `src/services`, `src/data/seed` and `src/utils`
  carry their `.ts` extension**, because Node's TypeScript support has no
  extensionless resolution and these modules are unit-tested directly. Vite
  accepts either form.

## Not verified

The GitHub round trip has not been run against a real private repo — that needs
a repo and a token. What is covered: the merge rules (17 tests), and the queue's
read-merge-write, conflict-retry, poll-merge, debounce-collapsing and offline
behaviour against a simulated two-device remote (8 tests). The first real
two-phone run is the remaining check, and Phase 8's deploy is where it happens.

## Why this is last

`mergeData` depends on the final shape of every collection. Built in Phase 2 it
gets rewritten three times; built here it touches zero components.

## Done when

- Concurrent edits on two devices converge with nothing lost.
- A delete on one device while the other edits the same record resolves to the
  newer write, in both orderings.
- Offline: log a full session, reconnect, confirm the flush.
- One simulated full session produces ~5–15 commits, not 80. Count them.
