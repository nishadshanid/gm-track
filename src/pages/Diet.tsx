import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, UtensilsCrossed } from 'lucide-react'
import type { Food, LoggedItem, MealLog, MealOption, MealSlot } from '../types'
import { PageTransition } from '../components/PageTransition'
import { AiBar } from '../components/ai/AiBar'
import { SlotCard } from '../components/diet/SlotCard'
import { DayTotals } from '../components/diet/DayTotals'
import { PortionSheet } from '../components/diet/PortionSheet'
import { FoodPicker } from '../components/diet/FoodPicker'
import { QuickAddSheet } from '../components/diet/QuickAddSheet'
import { EmptyState } from '../components/ui/EmptyState'
import { useDiet } from '../hooks/useDiet'
import { useData } from '../hooks/useData'
import { byId, selectable } from '../services/selectors'
import { addDays, friendlyDate, todayKey } from '../utils/date'

export function Diet() {
  const data = useData()
  const [date, setDate] = useState(todayKey())
  const {
    person,
    view,
    dayMacros,
    target,
    chooseOption,
    ensureLog,
    setStatus,
    addFood,
    addQuickItem,
    setItemAmount,
    removeItem,
    recomputeDay,
  } = useDiet(date)

  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ log: MealLog; item: LoggedItem } | null>(null)
  const [adding, setAdding] = useState<MealSlot | null>(null)
  const [quickAdd, setQuickAdd] = useState<MealSlot | null>(null)

  const foods: Food[] = selectable(data.foods)

  if (!person) {
    return (
      <PageTransition>
        <EmptyState icon={UtensilsCrossed} title="No one set up" hint="Add a person in Setup." />
      </PageTransition>
    )
  }

  const choose = (slot: MealSlot, log: MealLog | undefined, option: MealOption) => {
    chooseOption(slot, option, log)
    setOpen(slot.id)
  }

  return (
    <PageTransition>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{friendlyDate(date)}</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {person.emoji} {person.name} · portions: {person.portionDefault}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDate(addDays(date, -1))}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next day"
            disabled={date >= todayKey()}
            onClick={() => setDate(addDays(date, 1))}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <AiBar date={date} placeholder={'Log food — "2 idli, 2 eggs and sambar"'} />

      {target ? (
        <div className="mt-5">
          <DayTotals macros={dayMacros} kcal={target.kcal} proteinG={target.proteinG} />
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-400">
          No targets set for {person.name}. Add them in Setup → People.
        </p>
      )}

      {view.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={UtensilsCrossed}
            title="No meals planned"
            hint={`Add ${person.name}'s meal slots in Setup → Meals.`}
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {view.map((v) => (
            <SlotCard
              key={v.slot.id}
              view={v}
              foods={foods}
              pref={person.portionDefault}
              expanded={open === v.slot.id}
              onToggle={() => setOpen(open === v.slot.id ? null : v.slot.id)}
              onChoose={(option) => choose(v.slot, v.log, option)}
              onSkip={() => {
                const log = v.log ?? ensureLog(v.slot)
                if (log) setStatus(log, 'skipped')
              }}
              onUnskip={() => v.log && setStatus(v.log, 'planned')}
              onAddFood={() => setAdding(v.slot)}
              onEditItem={(item) => v.log && setEditing({ log: v.log, item })}
              onRemoveItem={(item) => v.log && removeItem(v.log, item.id)}
            />
          ))}
        </ul>
      )}

      {view.some((v) => v.items.length > 0) && (
        <button type="button" onClick={recomputeDay} className="btn-ghost mt-4 w-full text-xs">
          <RefreshCw size={12} /> Recompute this day from the food library
        </button>
      )}

      <PortionSheet
        item={editing?.item ?? null}
        food={editing?.item.foodId ? byId(foods, editing.item.foodId) : undefined}
        onClose={() => setEditing(null)}
        onSave={(amount) => {
          if (editing) setItemAmount(editing.log, editing.item.id, amount)
          setEditing(null)
        }}
      />

      <FoodPicker
        open={adding !== null}
        foods={foods}
        onClose={() => setAdding(null)}
        onQuickAdd={() => {
          setQuickAdd(adding)
          setAdding(null)
        }}
        onAdd={(food, amount) => {
          if (!adding) return
          const log = view.find((v) => v.slot.id === adding.id)?.log ?? ensureLog(adding, 'eaten')
          if (log) addFood(log, food, amount)
          setOpen(adding.id)
          setAdding(null)
        }}
      />

      <QuickAddSheet
        open={quickAdd !== null}
        onClose={() => setQuickAdd(null)}
        onAdd={(name, basis, amount) => {
          if (!quickAdd) return
          const log =
            view.find((v) => v.slot.id === quickAdd.id)?.log ?? ensureLog(quickAdd, 'eaten')
          if (log) addQuickItem(log, name, basis, amount)
          setOpen(quickAdd.id)
          setQuickAdd(null)
        }}
      />
    </PageTransition>
  )
}
