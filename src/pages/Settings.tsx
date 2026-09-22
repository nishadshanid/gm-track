import { useRef, useState } from 'react'
import {
  AlertTriangle,
  CloudOff,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { Field, TextInput } from '../components/ui/Field'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useData } from '../hooks/useData'
import { usePin } from '../hooks/usePin'
import { useSync } from '../hooks/useSync'
import { store } from '../services/store'
import { normalize } from '../services/normalize'
import { purgeTombstones } from '../services/merge'
import { seedData, topUpSeed } from '../services/seed'
import {
  clearToken,
  getToken,
  githubConfigured,
  repoLabel,
  setToken,
  verifyToken,
} from '../services/github'
import { todayKey } from '../utils/date'

export function Settings() {
  const data = useData()
  const { enabled: pinEnabled, setPin, clearPin, lock } = usePin()
  const { status, ready, flush } = useSync()

  const [token, setTokenInput] = useState(getToken())
  const [tokenMsg, setTokenMsg] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [pin, setPinInput] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveToken = async () => {
    const value = token.trim()
    if (!value) {
      clearToken()
      setTokenInput('')
      setTokenMsg('Token removed. This device is local-only.')
      return
    }
    setChecking(true)
    const { ok, reason } = await verifyToken(value)
    setChecking(false)
    if (!ok) {
      setTokenMsg(reason ?? 'Token rejected.')
      return
    }
    setToken(value)
    setTokenMsg('Token saved. Syncing from now on.')
    void flush()
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store.getSnapshot(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gm2-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      // Normalised, never trusted: a hand-edited or older export still has to
      // produce a well-shaped snapshot.
      store.replaceAll(normalize(parsed))
      setTokenMsg('Imported.')
    } catch {
      setTokenMsg('That file could not be read as Gm2 data.')
    }
  }

  const counts = {
    meals: data.mealLogs.length,
    sessions: data.workoutSessions.length,
    metrics: data.bodyMetrics.length,
    water: data.waterEntries.length,
  }
  const bytes = new Blob([JSON.stringify(data)]).size

  return (
    <PageTransition>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-0.5 text-sm text-slate-400">Sync, PIN and your data.</p>

      {/* ── Sync ───────────────────────────────────────────────────────── */}
      <SectionHeader title="Sync" />
      {githubConfigured ? (
        <div className="card space-y-3">
          <p className="text-sm">
            <span className="text-slate-400">Repo</span>{' '}
            <span className="font-mono text-xs">{repoLabel}</span>
          </p>

          <Field
            label="GitHub token"
            hint="Fine-grained, Contents: read and write, this repo only. Stored in this browser only — never in the app."
          >
            <TextInput
              type="password"
              value={token}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="github_pat_…"
              aria-label="GitHub token"
            />
          </Field>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={checking}
              onClick={() => void saveToken()}
            >
              <KeyRound size={15} /> {checking ? 'Checking…' : 'Save token'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => void flush()}>
              <RefreshCw size={15} /> Sync now
            </button>
          </div>

          {tokenMsg && <p className="text-xs text-slate-400">{tokenMsg}</p>}

          <p className="text-xs text-slate-500">
            Status: <span className="font-semibold">{status.state}</span>
            {status.lastSyncAt && ` · last synced ${new Date(status.lastSyncAt).toLocaleTimeString()}`}
            {status.error && <span className="block text-danger">{status.error}</span>}
          </p>

          {!ready && (
            <p className="flex items-start gap-1.5 text-xs text-warning">
              <CloudOff size={12} className="mt-0.5 flex-none" />
              Until a token is saved this device keeps everything locally. Nothing is lost — it
              uploads once you add one.
            </p>
          )}
        </div>
      ) : (
        <div className="card text-sm text-slate-400">
          No repo configured. Set <code className="text-xs">VITE_GH_OWNER</code> and{' '}
          <code className="text-xs">VITE_GH_REPO</code> at build time to sync between phones. Until
          then everything stays in this browser.
        </div>
      )}

      {/* ── PIN ────────────────────────────────────────────────────────── */}
      <SectionHeader title="Edit PIN" />
      <div className="card space-y-3">
        <p className="flex items-start gap-2 text-xs text-slate-400">
          <AlertTriangle size={13} className="mt-0.5 flex-none text-warning" />
          An accident-guard, not security. It stops a stray tap rewriting yesterday; it does not
          protect the data. Anyone with the GitHub token can read everything.
        </p>

        {pinEnabled ? (
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={lock}>
              <Lock size={15} /> Lock now
            </button>
            <button type="button" className="btn-ghost flex-1 text-danger" onClick={clearPin}>
              Remove PIN
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <TextInput
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Choose a PIN"
              aria-label="New PIN"
            />
            <button
              type="button"
              className="btn-primary flex-none"
              disabled={pin.length < 3}
              onClick={() => {
                void setPin(pin)
                setPinInput('')
              }}
            >
              Set
            </button>
          </div>
        )}
      </div>

      {/* ── Data ───────────────────────────────────────────────────────── */}
      <SectionHeader title="Data" />
      <div className="card space-y-3">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">Meals logged</dt>
            <dd className="tabular-nums">{counts.meals}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Workouts</dt>
            <dd className="tabular-nums">{counts.sessions}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Weigh-ins</dt>
            <dd className="tabular-nums">{counts.metrics}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">File size</dt>
            <dd className="tabular-nums">
              {(bytes / 1024).toFixed(0)} KB
              {bytes > 600_000 && <span className="ml-1 text-warning">· getting large</span>}
            </dd>
          </div>
        </dl>

        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={exportJson}>
            <Download size={15} /> Export
          </button>
          <button type="button" className="btn-ghost flex-1" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          aria-label="Import a Gm2 export"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importJson(file)
            e.target.value = ''
          }}
        />

        <button
          type="button"
          className="btn-ghost w-full text-xs"
          onClick={() => store.replaceAll(topUpSeed(data))}
        >
          Load starter plan into anything empty
        </button>

        <button
          type="button"
          className="btn-ghost w-full text-xs"
          onClick={() => store.replaceAll(purgeTombstones(store.getSnapshot()))}
        >
          <Trash2 size={12} /> Clear deleted records older than 60 days
        </button>
      </div>

      <SectionHeader title="Danger zone" />
      <button
        type="button"
        className="btn w-full bg-danger text-white"
        onClick={() => setConfirmReset(true)}
      >
        <Trash2 size={15} /> Reset everything to the starter plan
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Deletes every log on this device and restores the original plans. If sync is on, the reset
        reaches the other phone too.
      </p>

      <ConfirmDialog
        open={confirmReset}
        title="Delete everything?"
        body="Every meal, workout and weigh-in is removed and the starter plans are restored. This cannot be undone — export first if you want a copy."
        confirmLabel="Reset"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          store.replaceAll(seedData())
          setConfirmReset(false)
        }}
      />
    </PageTransition>
  )
}
