import { useCallback, useState } from 'react'

/**
 * Growing limit for infinite lists over live queries: the query takes `limit`, and
 * `loadMore` raises it by one page. Growing the limit (instead of paginating with a cursor)
 * keeps the list reactive when items reorder.
 */
export function useInfiniteLimit(pageSize: number) {
  const [limit, setLimit] = useState(pageSize)
  const loadMore = useCallback(() => setLimit((current) => current + pageSize), [pageSize])
  return { limit, loadMore }
}
