import { useSyncExternalStore } from 'react'
import { local } from '../services/local'
import { peopleInOrder } from '../services/selectors'
import { useData } from './useData'
import type { Person } from '../types'

/**
 * Who this phone is currently looking at.
 *
 * The choice is device-local — either phone can be looking at either person,
 * and changing it here must not change what the other phone shows. The list
 * itself comes from the store, because people are a registry like any other.
 */
export function usePerson() {
  const data = useData()
  const device = useSyncExternalStore(local.subscribe, local.getSnapshot)
  const people = peopleInOrder(data)

  const active: Person | undefined =
    people.find((p) => p.id === device.activePersonId) ?? people[0]

  return {
    people,
    person: active,
    personId: active?.id,
    setPerson: local.setActivePerson,
    isActive: (id: string) => id === active?.id,
  }
}
