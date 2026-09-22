import { ArrowUp, Info, Sparkles } from 'lucide-react'
import type { Suggestion } from '../../utils/overload'

/**
 * What beating last session looks like.
 *
 * Deliberately shows its evidence — "all 3 sets hit 12 at 40 kg" — because a
 * bare instruction to add weight is either ignored or followed blindly. The
 * rule it applies is the source programme's: top of the range on every
 * prescribed set, then increase the load and start again near the bottom.
 */
interface Props {
  suggestion: Suggestion
  /**
   * Applies the suggested load to every working set. Offered rather than
   * prefilled: the sets still start at what you know you lifted, and taking the
   * increase stays a deliberate tap — you might not have the plates, or might
   * want another week at this weight.
   */
  onApply?: (targetKg: number) => void
}

export function ProgressionHint({ suggestion, onApply }: Props) {
  const loaded = suggestion.kind === 'add-load'
  const first = suggestion.kind === 'first-time'
  const Icon = loaded ? ArrowUp : first ? Info : Sparkles

  return (
    <div
      className={`rounded-xl p-2.5 text-xs ${
        loaded
          ? 'bg-success/10 text-success'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      <p className="flex items-start gap-1.5">
        <Icon size={13} className="mt-0.5 flex-none" />
        <span>{suggestion.message}</span>
      </p>
      {loaded && suggestion.targetKg != null && onApply && (
        <button
          type="button"
          onClick={() => onApply(suggestion.targetKg as number)}
          className="mt-2 rounded-lg bg-success px-2.5 py-1 text-xs font-semibold text-white"
        >
          Set all sets to {suggestion.targetKg} kg
        </button>
      )}
    </div>
  )
}
