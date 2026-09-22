import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Send, Sparkles } from 'lucide-react'
import { useAi } from '../../hooks/useAi'
import { DraftSheet } from './DraftSheet'
import type { DateKey } from '../../types'

/**
 * The one-line way in.
 *
 * Renders nothing without an API key, so the app is exactly as it was for
 * anyone who never sets one up. Dictation uses the browser's own speech
 * recognition where present — no dependency, and it is the point of the feature
 * on a phone in a gym.
 */

interface SpeechLike {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function speechCtor(): (new () => SpeechLike) | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechLike) | undefined
}

export function AiBar({ date, placeholder }: { date: DateKey; placeholder?: string }) {
  const { available, busy, error, draft, send, apply, dismiss } = useAi(date)
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const recognition = useRef<SpeechLike | null>(null)

  useEffect(() => () => recognition.current?.stop(), [])

  if (!available) return null

  const submit = async () => {
    const value = text.trim()
    if (!value) return
    setText('')
    await send(value)
  }

  const dictate = () => {
    const Ctor = speechCtor()
    if (!Ctor) return
    if (listening) {
      recognition.current?.stop()
      return
    }
    const r = new Ctor()
    r.lang = navigator.language || 'en-IN'
    r.interimResults = false
    r.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? ''
      setText((prev) => (prev ? `${prev} ${said}` : said))
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recognition.current = r
    setListening(true)
    r.start()
  }

  return (
    <>
      <div className="card mt-4 !p-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="ml-1 flex-none text-accent" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            placeholder={placeholder ?? 'Log or ask — "2 idli and 2 eggs"'}
            aria-label="Log or ask in your own words"
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
          />
          {speechCtor() && (
            <button
              type="button"
              onClick={dictate}
              aria-label={listening ? 'Stop dictating' : 'Dictate'}
              aria-pressed={listening}
              className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${
                listening ? 'bg-danger text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Mic size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !text.trim()}
            aria-label="Send"
            className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-accent text-white disabled:opacity-30"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        {error && <p className="px-2 pb-1 pt-1 text-xs text-danger">{error}</p>}
      </div>

      <DraftSheet draft={draft} onApply={apply} onDismiss={dismiss} />
    </>
  )
}
