import { AlertTriangle, CircleHelp } from 'lucide-react'
import type { Draft } from '../../hooks/useAi'
import { Sheet } from '../ui/Sheet'
import { Chip } from '../ui/Chip'
import { kg, cm, litres } from '../../utils/format'

/**
 * What the model understood, before anything is written.
 *
 * Every loose match is labelled and every unrecognised word is listed. The
 * point is that a wrong reading is visible in the half-second before Apply,
 * rather than discovered a week later as a strange number in the trend.
 */
export function DraftSheet({
  draft,
  onApply,
  onDismiss,
}: {
  draft: Draft | null
  onApply: () => void
  onDismiss: () => void
}) {
  const writes =
    draft != null && draft.kind !== 'answer' && draft.kind !== 'note' &&
    !(draft.kind === 'meal' && draft.items.length === 0) &&
    !(draft.kind === 'sets' && draft.sets.length === 0)

  const title =
    draft?.kind === 'answer' ? 'Answer' : draft?.kind === 'note' ? 'Nothing logged' : 'Confirm this entry'

  return (
    <Sheet
      open={draft !== null}
      title={title}
      onClose={onDismiss}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onDismiss}>
            {writes ? 'Cancel' : 'Close'}
          </button>
          {writes && (
            <button type="button" className="btn-primary flex-1" onClick={onApply}>
              Save it
            </button>
          )}
        </div>
      }
    >
      {draft?.kind === 'meal' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {draft.slotName}
          </p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {draft.items.map((i, n) => (
              <li key={n} className="flex items-baseline gap-2 py-2 text-sm">
                <span className="w-16 flex-none font-semibold tabular-nums text-accent">
                  {i.amount.value}
                  {i.amount.unit === 'piece' ? '' : ` ${i.amount.unit}`}
                </span>
                <span className="min-w-0 flex-1">
                  {i.food.name}
                  {/* A loose match is spelled out, so a wrong swap is obvious. */}
                  {i.how === 'fuzzy' && (
                    <span className="block text-xs text-warning">
                      matched from “{i.said}” — check this
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-baseline justify-between rounded-xl bg-slate-100 p-3 text-sm tabular-nums dark:bg-slate-800">
            <span className="font-semibold">{Math.round(draft.kcal)} kcal</span>
            <span className="text-slate-400">
              {Math.round(draft.proteinG * 10) / 10} g protein
            </span>
          </div>

          {draft.unresolved.length > 0 && (
            <div className="rounded-xl bg-warning/10 p-3">
              <p className="flex items-start gap-1.5 text-xs font-semibold text-warning">
                <AlertTriangle size={13} className="mt-0.5 flex-none" />
                Not in your food library, so not included:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {draft.unresolved.map((u, n) => (
                  <Chip key={n} label={u.said} tone="warning" />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Add them in Setup → Foods, or log them by hand with Quick add.
              </p>
            </div>
          )}

          {draft.items.length === 0 && (
            <p className="text-sm text-slate-400">Nothing recognised to log.</p>
          )}
        </div>
      )}

      {draft?.kind === 'sets' && (
        <div className="space-y-3">
          <p className="font-semibold">{draft.exerciseName}</p>
          <ul className="space-y-1.5">
            {draft.sets.map((s, n) => (
              <li key={n} className="flex items-baseline gap-3 text-sm tabular-nums">
                <span className="w-6 flex-none text-xs text-slate-400">{n + 1}</span>
                <span className="font-semibold">
                  {draft.timed
                    ? `${s.seconds ?? s.reps} sec`
                    : `${s.weightKg != null ? `${s.weightKg} kg × ` : ''}${s.reps} reps`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Added as completed working sets to today&rsquo;s session.
          </p>
        </div>
      )}

      {draft?.kind === 'body' && (
        <ul className="space-y-2 text-sm">
          {draft.weightKg != null && (
            <li className="flex justify-between">
              <span className="text-slate-400">Weight</span>
              <span className="font-semibold tabular-nums">{kg(draft.weightKg)}</span>
            </li>
          )}
          {draft.waistCm != null && (
            <li className="flex justify-between">
              <span className="text-slate-400">Waist</span>
              <span className="font-semibold tabular-nums">{cm(draft.waistCm)}</span>
            </li>
          )}
          {draft.hipCm != null && (
            <li className="flex justify-between">
              <span className="text-slate-400">Hip</span>
              <span className="font-semibold tabular-nums">{cm(draft.hipCm)}</span>
            </li>
          )}
        </ul>
      )}

      {(draft?.kind === 'water' || draft?.kind === 'steps') && (
        <p className="text-lg font-semibold tabular-nums">
          {draft.kind === 'water' ? litres(draft.value) : `${draft.value.toLocaleString()} steps`}
        </p>
      )}

      {draft?.kind === 'answer' && (
        <div className="space-y-2">
          <p className="text-2xl font-extrabold tracking-tight">{draft.answer.headline}</p>
          {draft.answer.detail && <p className="text-sm text-slate-400">{draft.answer.detail}</p>}
          <p className="text-xs text-slate-500">{draft.answer.basis}</p>
          <p className="mt-3 rounded-xl bg-slate-100 p-2.5 text-xs text-slate-500 dark:bg-slate-800">
            Computed on this device from your own logs — the figures were not sent anywhere.
          </p>
        </div>
      )}

      {draft?.kind === 'note' && (
        <p className="flex items-start gap-2 text-sm text-slate-400">
          <CircleHelp size={15} className="mt-0.5 flex-none" />
          {draft.message}
        </p>
      )}
    </Sheet>
  )
}
