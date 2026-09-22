import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'

/**
 * Rest timer.
 *
 * Counts up from the last completed set rather than down from a prescription,
 * because the source programme gives rep ranges and reps-in-reserve, not rest
 * targets — so what matters is knowing how long it has been.
 */
export function RestTimer({ restartKey }: { restartKey: string | number }) {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const started = useRef<number | null>(null)

  // A completed set restarts the clock.
  useEffect(() => {
    if (restartKey === '') return
    started.current = Date.now()
    setSeconds(0)
    setRunning(true)
  }, [restartKey])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (started.current) setSeconds(Math.floor((Date.now() - started.current) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [running])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Timer size={13} />
      <span className="font-semibold tabular-nums text-slate-500 dark:text-slate-300">
        {mm}:{ss}
      </span>
      <button
        type="button"
        aria-label={running ? 'Pause rest timer' : 'Start rest timer'}
        onClick={() => {
          if (!running && started.current == null) started.current = Date.now()
          setRunning(!running)
        }}
        className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {running ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <button
        type="button"
        aria-label="Reset rest timer"
        onClick={() => {
          started.current = Date.now()
          setSeconds(0)
        }}
        className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <RotateCcw size={13} />
      </button>
    </div>
  )
}
