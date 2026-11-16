import { ArrowLeftIcon, ListPlusIcon, SearchXIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { MarkdownInline } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNodes, useTimeline } from '@/db'
import { pageHeadingProps } from '@/lib/focus'
import type { Timeline } from '@/types/models'
import { SeverityChart } from './severity-chart'
import { toSeverityPoints } from './severity-points'

/**
 * Severity chart page of a timeline (`timelines/:timelineId/chart`). Its child route
 * (`nodes/:nodeId`) receives the loaded timeline as outlet context, like the timeline view's.
 */
export function TimelineChartView() {
  const { timelineId } = useParams()
  const timeline = useTimeline(timelineId)

  if (timeline === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading chart" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (timeline === null) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="Timeline not found"
        description="It may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/">Back to timelines</Link>
          </Button>
        }
      />
    )
  }

  return <TimelineChart timeline={timeline} />
}

function TimelineChart({ timeline }: { timeline: Timeline }) {
  const navigate = useNavigate()
  const nodes = useNodes(timeline.id)
  const points = useMemo(() => (nodes ? toSeverityPoints(nodes) : undefined), [nodes])
  const timelinePath = `/timelines/${timeline.id}`
  const openNode = useCallback((nodeId: string) => void navigate(`nodes/${nodeId}`), [navigate])

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 py-3 lg:px-4">
        <Button asChild variant="ghost" size="icon">
          <Link to={timelinePath} aria-label="Back to timeline">
            <ArrowLeftIcon aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 {...pageHeadingProps} className="text-lg font-semibold outline-none">
            Severity chart
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            <MarkdownInline disableLinks>{timeline.title}</MarkdownInline>
          </p>
        </div>
      </header>

      {points === undefined ? (
        <div aria-busy="true" aria-label="Loading nodes" className="p-4 lg:px-6">
          <Skeleton className="h-72 w-full lg:h-96" />
        </div>
      ) : points.length === 0 ? (
        <EmptyState
          icon={ListPlusIcon}
          title="No nodes yet"
          description="Add nodes to the timeline to chart their severity."
          action={
            <Button asChild variant="outline">
              <Link to={timelinePath}>Back to timeline</Link>
            </Button>
          }
        />
      ) : (
        <section aria-label="Severity by node" className="p-4 lg:px-6">
          <SeverityChart points={points} onOpenNode={openNode} />
        </section>
      )}

      <Outlet context={timeline} />
    </div>
  )
}
