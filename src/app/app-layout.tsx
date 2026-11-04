import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useParams } from 'react-router'
import { TimelineListPane } from '@/features/timelines/timeline-list-pane'
import { focusPageHeadingWhenReady, isFocusLost } from '@/lib/focus'
import { cn } from '@/lib/utils'

/**
 * Master-detail shell. From `lg` up: list pane on the left, detail pane on the right, each
 * scrolling on its own. Below `lg`: one screen at a time, the list unless a timeline is selected.
 * Dialog routes (forms) are portaled, so they show over whichever pane is visible.
 *
 * After a navigation that leaves focus nowhere (the focused link was in the pane that got hidden,
 * or its view was removed), focus moves to the heading of the view now shown.
 */
export function AppLayout() {
  // Params of matched child routes are visible here.
  const { timelineId } = useParams()
  const hasSelection = timelineId !== undefined
  const { pathname } = useLocation()
  const focusedPath = useRef(pathname)

  useEffect(() => {
    if (focusedPath.current === pathname) return
    let stopWaiting: (() => void) | undefined
    // Deferred so dialogs unmounted by this navigation restore their focus first.
    const timer = setTimeout(() => {
      focusedPath.current = pathname
      if (isFocusLost()) stopWaiting = focusPageHeadingWhenReady()
    })
    return () => {
      clearTimeout(timer)
      stopWaiting?.()
    }
  }, [pathname])

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex lg:h-dvh">
      {/* Page heading for assistive technology; each pane has its own visible `h2`. */}
      <header className="sr-only">
        <h1>Timeline App</h1>
      </header>
      <aside
        aria-label="Timelines"
        className={cn(
          'lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r xl:w-96',
          hasSelection && 'hidden',
        )}
      >
        <TimelineListPane />
      </aside>
      {/* Always rendered so the page has a main landmark; without a selection it holds only the
          desktop empty state (hidden below `lg`) and portaled dialogs. */}
      <main className="lg:min-w-0 lg:flex-1 lg:overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
