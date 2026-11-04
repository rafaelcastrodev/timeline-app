import { Outlet, useParams } from 'react-router'
import { TimelineListPane } from '@/features/timelines/timeline-list-pane'
import { cn } from '@/lib/utils'

/**
 * Master-detail shell. From `lg` up: list pane on the left, detail pane on the right, each
 * scrolling on its own. Below `lg`: one screen at a time, the list unless a timeline is selected.
 * Dialog routes (forms) are portaled, so they show over whichever pane is visible.
 */
export function AppLayout() {
  // Params of matched child routes are visible here.
  const { timelineId } = useParams()
  const hasSelection = timelineId !== undefined

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex lg:h-dvh">
      <aside
        aria-label="Timelines"
        className={cn(
          'lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r xl:w-96',
          hasSelection && 'hidden',
        )}
      >
        <TimelineListPane />
      </aside>
      <main
        className={cn(
          'lg:block lg:min-w-0 lg:flex-1 lg:overflow-y-auto',
          !hasSelection && 'hidden',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
