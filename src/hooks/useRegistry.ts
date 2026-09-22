import { useCallback } from 'react'
import type { CollectionKey, Rec, RecordOf } from '../types'
import { store } from '../services/store'
import { useData } from './useData'
import { selectable, live } from '../services/selectors'
import { uid } from '../utils/id'

/**
 * Generic CRUD over one registry collection.
 *
 * Every registry screen — people, foods, exercises, slots, templates — is the
 * same four operations over a different record type, so they share this rather
 * than each growing its own set of store actions.
 *
 * Note the two lists. `items` is what a picker should offer; `all` includes
 * archived records, which history still needs in order to resolve a reference
 * to a food nobody eats any more.
 */
export function useRegistry<K extends CollectionKey>(key: K) {
  const data = useData()
  const list = data[key] as RecordOf<K>[]

  const create = useCallback(
    (rec: Omit<RecordOf<K>, 'id' | 'updatedAt'> & { id?: string }) => {
      const id = rec.id ?? uid()
      store.upsert(key, { ...rec, id, updatedAt: '' } as unknown as RecordOf<K>)
      return id
    },
    [key],
  )

  const update = useCallback(
    (id: string, patch: Partial<RecordOf<K>>) => store.patch(key, id, patch),
    [key],
  )

  /**
   * Archive, not delete. A food or exercise referenced by any log must stay
   * resolvable; archiving hides it from pickers without breaking history.
   */
  const archive = useCallback(
    (id: string, archived = true) =>
      // `archived` lives on the registry records (people, foods, exercises,
      // slots, options, templates), not on the log records. This hook is only
      // used for registries, which is why the cast is safe — an optional
      // property cannot be discriminated on in a mapped type.
      store.patch(key, id, { archived } as unknown as Partial<RecordOf<K>>),
    [key],
  )

  /** Soft delete — a tombstone, for records nothing references. */
  const remove = useCallback((id: string) => store.remove(key, id), [key])

  return {
    items: selectable(list as (Rec & { archived?: boolean })[]) as RecordOf<K>[],
    all: live(list as Rec[]) as RecordOf<K>[],
    create,
    update,
    archive,
    remove,
  }
}
