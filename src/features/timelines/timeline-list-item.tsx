import { NavLink } from 'react-router'
import { MarkdownExcerpt, MarkdownInline } from '@/components/markdown'
import { useNodeCount } from '@/db'
import { formatDateTime, formatRelativeTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Timeline } from '@/types/models'

export function TimelineListItem({ timeline }: { timeline: Timeline }) {
  const nodeCount = useNodeCount(timeline.id)

  return (
    <li>
      <NavLink
        to={`/timelines/${timeline.id}`}
        className={({ isActive }) =>
          cn(
            'flex flex-col gap-1 rounded-lg px-3 py-2.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
            isActive && 'bg-muted',
          )
        }
      >
        <MarkdownInline disableLinks className="font-medium">
          {timeline.title}
        </MarkdownInline>
        {timeline.description.trim() && (
          <MarkdownExcerpt lines={2}>{timeline.description}</MarkdownExcerpt>
        )}
        <span className="text-xs text-muted-foreground">
          {nodeCount !== undefined && <>{nodeCount === 1 ? '1 node' : `${nodeCount} nodes`} · </>}
          <time dateTime={timeline.updated_at} title={formatDateTime(timeline.updated_at)}>
            {formatRelativeTime(timeline.updated_at)}
          </time>
        </span>
      </NavLink>
    </li>
  )
}
