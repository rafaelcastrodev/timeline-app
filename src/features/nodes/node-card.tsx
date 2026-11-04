import { GripVerticalIcon } from 'lucide-react'
import { Link } from 'react-router'
import { MarkdownExcerpt, MarkdownInline } from '@/components/markdown'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TimelineNode } from '@/types/models'

interface NodeCardProps {
  node: TimelineNode
  className?: string
}

/**
 * Compact node card: inline title and a description excerpt clamped to 3 lines. The title is a
 * link to the node detail whose `::after` covers the whole card, so the card is clickable without
 * wrapping it in a link (the drag handle becomes a button inside it). Markdown links render as
 * plain text to avoid nested links. The grip is a visual placeholder until drag and drop wires it
 * up as the drag handle.
 */
export function NodeCard({ node, className }: NodeCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        'relative h-full hover:bg-muted/50 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50',
        className,
      )}
      data-slot="node-card"
    >
      <CardHeader>
        <CardTitle>
          <h3>
            <Link
              to={`/timelines/${node.timeline_id}/nodes/${node.id}`}
              className="outline-none after:absolute after:inset-0"
            >
              <MarkdownInline disableLinks>{node.title}</MarkdownInline>
            </Link>
          </h3>
        </CardTitle>
        {node.description.trim() && (
          <CardDescription>
            <MarkdownExcerpt lines={3}>{node.description}</MarkdownExcerpt>
          </CardDescription>
        )}
        <CardAction>
          <span data-slot="drag-handle" className="flex text-muted-foreground" aria-hidden="true">
            <GripVerticalIcon className="size-4" />
          </span>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
