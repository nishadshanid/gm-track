import { useCallback, useMemo } from 'react'
import type {
  DateKey,
  Food,
  Id,
  LoggedAmount,
  LoggedItem,
  MacroBasis,
  MealLog,
  MealOption,
  MealSlot,
  MealStatus,
  Person,
} from '../types'
import { store } from '../services/store'
import { useData } from './useData'
import { usePerson } from './usePerson'
import { byId, live, mealLogsFor, selectable, targetOn } from '../services/selectors'
import { itemsMacros, recomputeFrom } from '../utils/macros'
import { resolvePlanned } from '../utils/portion'
import { uid } from '../utils/id'

/**
 * Diet logging for one person on one day.
 *
 * The important rule lives in `materialise`: choosing an option COPIES it into
 * the log. The log never renders through the option it came from, because the
 * first time someone eats two idli instead of three, a log that rendered from
 * the template would either lie or refuse the edit. `sourceOptionId` is kept
 * for provenance only.
 */

function loggedItemFrom(food: Food, amount: LoggedAmount, at: string): LoggedItem {
  return {
    id: uid(),
    foodId: food.id,
    // Snapshot the name and the macro basis, not the computed macros.
    foodName: food.name,
    amount,
    basisSnapshot: { ...food.basis },
    conversionsSnapshot: food.conversions ? { ...food.conversions } : undefined,
    updatedAt: at,
  }
}

export interface SlotView {
  slot: MealSlot
  options: MealOption[]
  log?: MealLog
  items: LoggedItem[]
  macros: ReturnType<typeof itemsMacros>
}

export function useDiet(date: DateKey) {
  const data = useData()
  const { person } = usePerson()
  const personId = person?.id

  const foods = data.foods
  const at = () => store.now()

  const view = useMemo<SlotView[]>(() => {
    if (!personId) return []
    const logs = mealLogsFor(data, personId, date)
    const options = live(data.mealOptions)
    return selectable(data.mealSlots)
      .filter((s) => s.personId === personId)
      .sort((a, b) => a.order - b.order)
      .map((slot) => {
        const log = logs.find((l) => l.slotId === slot.id)
        const items = (log?.items ?? []).filter((i) => !i.deletedAt)
        return {
          slot,
          options: options
            .filter((o) => o.slotId === slot.id && !o.archived)
            .sort((a, b) => a.order - b.order),
          log,
          items,
          macros: itemsMacros(items),
        }
      })
  }, [data, personId, date])

  const dayMacros = useMemo(
    () => itemsMacros(view.flatMap((v) => v.items)),
    [view],
  )

  const target = personId ? targetOn(data, personId, date) : undefined

  /** Copy an option's items into the log, resolving every planned range. */
  const chooseOption = useCallback(
    (slot: MealSlot, option: MealOption, existing?: MealLog) => {
      if (!person) return
      const now = at()
      const items = option.items
        .map((pi) => {
          const food = byId(foods, pi.foodId)
          if (!food) return null
          return loggedItemFrom(food, resolvePlanned(pi.amount, person.portionDefault), now)
        })
        .filter((i): i is LoggedItem => i !== null)

      const log: MealLog = {
        id: existing?.id ?? uid(),
        updatedAt: '',
        personId: person.id,
        date,
        slotId: slot.id,
        slotName: slot.name,
        sourceOptionId: option.id,
        sourceOptionName: option.name,
        items,
        status: 'eaten',
        manuallyEdited: false,
        loggedBy: person.id,
        createdAt: existing?.createdAt ?? now,
      }
      store.upsert('mealLogs', log)
    },
    [person, foods, date],
  )

  /** An empty log, so a slot can be marked skipped or filled by hand. */
  const ensureLog = useCallback(
    (slot: MealSlot, status: MealStatus = 'planned'): MealLog | undefined => {
      if (!person) return undefined
      const existing = mealLogsFor(data, person.id, date).find((l) => l.slotId === slot.id)
      if (existing) return existing
      const log: MealLog = {
        id: uid(),
        updatedAt: '',
        personId: person.id,
        date,
        slotId: slot.id,
        slotName: slot.name,
        items: [],
        status,
        loggedBy: person.id,
        createdAt: at(),
      }
      store.upsert('mealLogs', log)
      return log
    },
    [person, data, date],
  )

  const setStatus = useCallback(
    (log: MealLog, status: MealStatus) => store.patch('mealLogs', log.id, { status }),
    [],
  )

  /**
   * Item edits read the log as currently stored, not as captured by this
   * render. Adding two foods or deleting two items in quick succession happens
   * faster than React re-renders, and a closure-based update would drop one.
   */
  const editItems = useCallback(
    (log: MealLog, fn: (items: LoggedItem[]) => LoggedItem[], edited = true) => {
      store.update('mealLogs', log.id, (live) => ({
        ...live,
        items: fn(live.items),
        ...(edited ? { manuallyEdited: true } : {}),
      }))
    },
    [],
  )

  const addFood = useCallback(
    (log: MealLog, food: Food, amount: LoggedAmount) => {
      const item = loggedItemFrom(food, amount, at())
      editItems(log, (items) => [...items, item])
    },
    [editItems],
  )

  /** Ad-hoc entry with inline macros — a restaurant meal with no library food. */
  const addQuickItem = useCallback(
    (log: MealLog, name: string, basis: MacroBasis, amount: LoggedAmount) => {
      const item: LoggedItem = {
        id: uid(),
        foodId: null,
        foodName: name,
        amount,
        basisSnapshot: basis,
        updatedAt: at(),
      }
      editItems(log, (items) => [...items, item])
    },
    [editItems],
  )

  const setItemAmount = useCallback(
    (log: MealLog, itemId: Id, amount: LoggedAmount) => {
      const now = at()
      editItems(log, (items) =>
        items.map((i) => (i.id === itemId ? { ...i, amount, updatedAt: now } : i)),
      )
    },
    [editItems],
  )

  /** Soft delete, so the other phone does not resurrect it on the next merge. */
  const removeItem = useCallback(
    (log: MealLog, itemId: Id) => {
      const now = at()
      editItems(log, (items) =>
        items.map((i) => (i.id === itemId ? { ...i, deletedAt: now, updatedAt: now } : i)),
      )
    },
    [editItems],
  )

  /** Pull library corrections into a day's logs — the explicit opt-in. */
  const recomputeDay = useCallback(() => {
    if (!personId) return
    const logs = mealLogsFor(data, personId, date)
    for (const log of logs) {
      const items = log.items.map((i) =>
        i.foodId ? recomputeFrom(i, byId(foods, i.foodId)) : i,
      )
      store.patch('mealLogs', log.id, { items })
    }
  }, [personId, data, date, foods])

  return {
    person: person as Person | undefined,
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
  }
}
