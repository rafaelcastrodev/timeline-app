import { FileUpIcon, ListIcon, PlusIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { LoadMoreSentinel } from '@/components/common/load-more-sentinel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimelineCount, useTimelines } from '@/db'
import { useTimelineImport } from '@/features/transfer/use-timeline-import'
import { useInfiniteLimit } from '@/hooks/use-infinite-limit'
import { TimelineListItem } from './timeline-list-item'

export const TIMELINE_PAGE_SIZE = 20

/** Master pane: timelines by recent activity, with infinite scroll. */
export function TimelineListPane() {
  const navigate = useNavigate()
  const importFlow = useTimelineImport({ mode: 'new' }, (timeline) =>
    navigate(`/timelines/${timeline.id}`),
  )
  const { limit, loadMore } = useInfiniteLimit(TIMELINE_PAGE_SIZE)
  const timelines = useTimelines(limit)
  const total = useTimelineCount()
  // More exist, and the page for the current limit has arrived (avoids growing twice per page).
  const hasMore =
    timelines !== undefined &&
    total !== undefined &&
    timelines.length >= limit &&
    total > timelines.length

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 py-3">
        <h1 className="flex-1 text-lg font-semibold">Timelines</h1>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Import timeline"
          title="Import timeline"
          onClick={importFlow.chooseFile}
        >
          <FileUpIcon aria-hidden="true" />
        </Button>
        <Button asChild size="sm">
          <Link to="/timelines/new">
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            New timeline
          </Link>
        </Button>
      </header>

      {timelines === undefined ? (
        <div aria-busy="true" aria-label="Loading timelines" className="flex flex-col gap-2 p-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2 px-3 py-2.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : timelines.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title="No timelines yet"
          description="Create a timeline to start adding events."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-1 p-2">
            {timelines.map((timeline) => (
              <TimelineListItem key={timeline.id} timeline={timeline} />
            ))}
          </ul>
          <LoadMoreSentinel enabled={hasMore} onLoadMore={loadMore} />
        </>
      )}
      {importFlow.dialog}
    </div>
  )
}
