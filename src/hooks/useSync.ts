import { useEffect, useState } from 'react'
import { storage } from '../services/storage'
import type { SyncStatus } from '../services/storage'
import { githubConfigured, githubReady } from '../services/github'

/** Live sync status, plus a manual flush. */
export function useSync() {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' })

  useEffect(() => {
    if (!storage.status) return
    return storage.status(setStatus)
  }, [])

  return {
    status,
    configured: githubConfigured,
    ready: githubReady(),
    flush: () => storage.flush?.() ?? Promise.resolve(),
  }
}
