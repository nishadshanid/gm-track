import { AlertTriangle, Check, CloudOff, RefreshCw, UploadCloud } from 'lucide-react'
import { useSync } from '../hooks/useSync'

/**
 * Sync state in the header.
 *
 * Visible rather than silent: if a set logged in the gym has not reached the
 * other phone yet, that is worth knowing before walking out — and a rejected
 * token should not look like everything is fine.
 */
export function SyncChip() {
  const { status, configured, ready, flush } = useSync()
  if (!configured) return null

  if (!ready) {
    return (
      <span
        className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400 dark:bg-slate-800"
        title="Add a GitHub token in Settings to sync this device"
      >
        <CloudOff size={11} /> Local only
      </span>
    )
  }

  const map = {
    idle: { Icon: Check, label: 'Synced', tone: 'text-success' },
    dirty: { Icon: UploadCloud, label: 'Unsaved', tone: 'text-slate-400' },
    syncing: { Icon: RefreshCw, label: 'Syncing', tone: 'text-accent' },
    offline: { Icon: CloudOff, label: 'Offline', tone: 'text-warning' },
    error: { Icon: AlertTriangle, label: 'Error', tone: 'text-danger' },
  } as const
  const { Icon, label, tone } = map[status.state]

  return (
    <button
      type="button"
      onClick={() => void flush()}
      title={status.error ?? (status.lastSyncAt ? `Last synced ${new Date(status.lastSyncAt).toLocaleTimeString()}` : label)}
      aria-label={`Sync status: ${label}. Tap to sync now.`}
      className={`flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold dark:bg-slate-800 ${tone}`}
    >
      <Icon size={11} className={status.state === 'syncing' ? 'animate-spin' : ''} />
      {label}
    </button>
  )
}
