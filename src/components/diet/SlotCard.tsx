import { useState } from 'react'
import { Check, ChevronDown, Plus, Repeat, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Food, LoggedItem, MealOption, PortionPref } from '../../types'
import type { SlotView } from '../../hooks/useDiet'
import { Chip } from '../ui/Chip'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { LoggedItemRow } from './LoggedItemRow'
import { OptionPicker } from './OptionPicker'

interface Props {
  view: SlotView
  foods: Food[]
  pref: PortionPref
  expanded: boolean
  onToggle: () => void
  onChoose: (option: MealOption) => void
  onSkip: () => void
  onUnskip: () => void
  onAddFood: () => void
  onEditItem: (item: LoggedItem) => void
  onRemoveItem: (item: LoggedItem) => void
}

/**
 * One eating occasion. Collapsed it is a one-line status; expanded it offers
 * the options, or the logged items once something is chosen.
 */
export function SlotCard({
  view,
  foods,
  pref,
  expanded,
  onToggle,
  onChoose,
  onSkip,
  onUnskip,
  onAddFood,
  onEditItem,
  onRemoveItem,
}: Props) {
  const { slot, options, log, items, macros } = view
  const status = log?.status
  const logged = items.length > 0

  // Swapping is a view state, not stored: pressing Swap brings the option
  // picker back over an already-logged meal.
  const [swapping, setSwapping] = useState(false)
  const [confirming, setConfirming] = useState<MealOption | null>(null)

  const picking = !logged || swapping

  /**
   * Choosing an option replaces the logged items wholesale. If the meal was
   * edited by hand — two idli instead of three, an extra egg — that edit is
   * about to be lost, so ask first.
   */
  const choose = (option: MealOption) => {
    if (logged && log?.manuallyEdited) {
      setConfirming(option)
      return
    }
    onChoose(option)
    setSwapping(false)
  }

  return (
    <li className="card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className={`grid h-9 w-9 flex-none place-items-center rounded-xl text-sm font-bold ${
            status === 'eaten'
              ? 'bg-success/15 text-success'
              : status === 'skipped'
                ? 'bg-slate-200 text-slate-400 dark:bg-slate-800'
                : 'bg-accent/10 text-accent'
          }`}
        >
          {status === 'eaten' ? (
            <Check size={16} />
          ) : status === 'skipped' ? (
            <X size={16} />
          ) : (
            slot.order + 1
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{slot.name}</span>
            {slot.optional && <Chip label="optional" tone="muted" />}
          </span>
          <span className="block truncate text-xs text-slate-400">
            {status === 'skipped'
              ? 'Skipped'
              : logged
                ? `${log?.sourceOptionName ?? 'Custom'} · ${Math.round(macros.total.kcal)} kcal · ${
                    Math.round(macros.total.proteinG * 10) / 10
                  } g protein`
                : (slot.timeHint ?? 'Not logged')}
          </span>
        </span>

        <ChevronDown
          size={18}
          className={`flex-none text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
              {slot.note && <p className="text-xs italic text-slate-500">{slot.note}</p>}

              {picking && options.length > 0 && (
                <>
                  <OptionPicker
                    options={options}
                    foods={foods}
                    pref={pref}
                    chosenId={log?.sourceOptionId}
                    onChoose={choose}
                  />
                  <div className="flex gap-2">
                    {swapping ? (
                      <button
                        type="button"
                        onClick={() => setSwapping(false)}
                        className="btn-ghost !py-1.5"
                      >
                        Keep what I logged
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={onAddFood}
                          className="btn-ghost !py-1.5 text-accent"
                        >
                          <Plus size={14} /> Something else
                        </button>
                        <button type="button" onClick={onSkip} className="btn-ghost !py-1.5">
                          <X size={14} /> Skip
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {logged && !swapping ? (
                <>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                      <LoggedItemRow
                        key={item.id}
                        item={item}
                        onEdit={() => onEditItem(item)}
                        onRemove={() => onRemoveItem(item)}
                      />
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={onAddFood} className="btn-ghost !py-1.5 text-accent">
                      <Plus size={14} /> Add food
                    </button>
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSwapping(true)}
                        className="btn-ghost !py-1.5"
                        aria-label="Swap option"
                      >
                        <Repeat size={14} /> Swap
                      </button>
                    )}
                    <button type="button" onClick={onSkip} className="btn-ghost !py-1.5">
                      <X size={14} /> Skip
                    </button>
                  </div>

                  {log?.manuallyEdited && (
                    <p className="text-xs text-slate-500">
                      Edited by hand — swapping the option will replace these items.
                    </p>
                  )}
                </>
              ) : status === 'skipped' ? (
                <button type="button" onClick={onUnskip} className="btn-ghost text-accent">
                  Un-skip
                </button>
              ) : options.length === 0 ? (
                <button type="button" onClick={onAddFood} className="btn-ghost text-accent">
                  <Plus size={14} /> Add food
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirming !== null}
        title="Replace what you logged?"
        body={`You edited this meal by hand. Switching to ${confirming?.name ?? 'another option'} will replace those items with the planned amounts.`}
        confirmLabel="Replace"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) onChoose(confirming)
          setConfirming(null)
          setSwapping(false)
        }}
      />
    </li>
  )
}
