import { useState } from 'react'
import { Lock } from 'lucide-react'
import { usePin } from '../hooks/usePin'
import { Sheet } from './ui/Sheet'
import { TextInput } from './ui/Field'

/**
 * Asks for the PIN once per session, when editing is attempted.
 *
 * Viewing is never gated — seeing the plan and yesterday's log has no reason to
 * need a code, and gating it would only train everyone to leave it off.
 */
export function PinGate() {
  const { enabled, canEdit, unlock } = usePin()
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  if (!enabled || canEdit) return null

  const submit = async () => {
    const ok = await unlock(pin)
    if (!ok) {
      setWrong(true)
      setPin('')
      return
    }
    setWrong(false)
    setPin('')
  }

  return (
    <Sheet
      open
      title="Enter PIN to edit"
      onClose={() => undefined}
      footer={
        <button type="button" className="btn-primary w-full" onClick={() => void submit()}>
          Unlock
        </button>
      }
    >
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm text-slate-400">
          <Lock size={14} className="mt-0.5 flex-none" />
          Viewing is open. The PIN guards edits, so a pocket tap cannot rewrite yesterday.
        </p>
        <TextInput
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="PIN"
          aria-label="PIN"
        />
        {wrong && <p className="text-xs text-danger">That PIN did not match.</p>}
      </div>
    </Sheet>
  )
}
