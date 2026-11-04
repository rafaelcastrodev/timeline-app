import { useEffect, useRef, useState } from 'react'

interface LoadMoreSentinelProps {
  /** Whether more items can be loaded now (more exist and the last page has arrived). */
  enabled: boolean
  onLoadMore: () => void
  /** Margin around the viewport that counts as visible, so loading starts before the end. */
  rootMargin?: string
}

/**
 * Invisible marker placed after the last item of an infinite list. Calls `onLoadMore` while it
 * is visible and `enabled`, so a short page that leaves it on screen keeps loading.
 */
export function LoadMoreSentinel({
  enabled,
  onLoadMore,
  rootMargin = '200px',
}: LoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin])

  useEffect(() => {
    if (enabled && visible) onLoadMore()
  }, [enabled, visible, onLoadMore])

  return <div ref={ref} aria-hidden="true" className="h-px" data-slot="load-more-sentinel" />
}
