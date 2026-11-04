import { GripVerticalIcon } from 'lucide-react'
import { useId, type ComponentPropsWithRef } from 'react'
import { Link } from 'react-router'
import { MarkdownExcerpt, MarkdownInline } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TimelineNode } from '@/types/models'
import { cardClasses, nodeColorClasses } from './node-colors'

interface NodeCardProps {
  node: TimelineNode
  /** Props and ref of the drag handle (the sortable activator). */
  dragHandle: ComponentPropsWithRef<'button'>
  isDragging?: boolean
  className?: string
}

/**
 * Compact node card: inline title and a description excerpt clamped to 3 lines. The title is a
 * link to the node detail whose `::after` covers the whole card, so the card is clickable without
 * wrapping it in a link. The drag handle is a button stacked above that overlay; its accessible
 * name is "Reorder" followed by the rendered title. Markdown links render as plain text to avoid
 * nested links. A node color gives the card a soft background of that hue.
 */
export function NodeCard({ node, dragHandle, isDragging = false, className }: NodeCardProps) {
  const titleId = useId()
  const handleLabelId = useId()
  const color = node.color ? nodeColorClasses[node.color] : null

  return (
    <Card
      size="sm"
      className={cn(
        'relative h-full has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50',
        color ? [color.vars, cardClasses] : 'hover:bg-muted/50',
        isDragging && 'shadow-lg ring-2 ring-primary/40',
        isDragging && !color && 'bg-card hover:bg-card',
        className,
      )}
      data-slot="node-card"
      data-color={node.color ?? undefined}
    >
      <CardHeader>
        <CardTitle>
          <h3 id={titleId}>
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
        <CardAction className="relative z-10 -mt-1 -mr-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-slot="drag-handle"
            aria-labelledby={`${handleLabelId} ${titleId}`}
            className="cursor-grab touch-manipulation text-muted-foreground select-none [-webkit-touch-callout:none] active:cursor-grabbing"
            {...dragHandle}
          >
            <GripVerticalIcon aria-hidden="true" />
            <span id={handleLabelId} className="sr-only">
              Reorder
            </span>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
