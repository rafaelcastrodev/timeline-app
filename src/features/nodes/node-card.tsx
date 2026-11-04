import { GripVerticalIcon } from 'lucide-react'
import { MarkdownExcerpt, MarkdownInline } from '@/components/markdown'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TimelineNode } from '@/types/models'

interface NodeCardProps {
  node: TimelineNode
  className?: string
}

/**
 * Compact node card: inline title and a description excerpt clamped to 3 lines. Links render
 * as plain text because the card becomes clickable (node detail). The grip is a visual
 * placeholder until drag and drop wires it up as the drag handle.
 */
export function NodeCard({ node, className }: NodeCardProps) {
  return (
    <Card size="sm" className={cn('h-full', className)} data-slot="node-card">
      <CardHeader>
        <CardTitle>
          <h3>
            <MarkdownInline disableLinks>{node.title}</MarkdownInline>
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
