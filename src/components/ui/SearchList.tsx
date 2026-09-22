import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface Props<T> {
  items: T[]
  /** The text a query is matched against. */
  keyOf: (item: T) => string
  render: (item: T) => ReactNode
  placeholder?: string
  empty?: ReactNode
  /** Below this many items the search box is just noise. */
  searchFrom?: number
}

/**
 * Searchable list. The food library grows past the point of scrolling quickly,
 * so anything that picks from a registry uses this rather than a raw map.
 */
export function SearchList<T>({
  items,
  keyOf,
  render,
  placeholder = 'Search…',
  empty,
  searchFrom = 8,
}: Props<T>) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const shown = useMemo(
    () => (query ? items.filter((i) => keyOf(i).toLowerCase().includes(query)) : items),
    [items, query, keyOf],
  )

  return (
    <div>
      {items.length >= searchFrom && (
        <div className="relative mb-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="field pl-10"
          />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">
          {query ? `Nothing matching “${q}”.` : empty}
        </div>
      ) : (
        <ul className="space-y-2">{shown.map((item) => render(item))}</ul>
      )}
    </div>
  )
}
