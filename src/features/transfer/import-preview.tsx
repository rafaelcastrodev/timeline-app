import { MarkdownInline } from '@/components/markdown'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import type { TimelineFile } from '@/types/transfer'

/** Summary of an export file shown before importing it: title and node count. */
export function ImportPreview({ file }: { file: TimelineFile }) {
  const count = file.nodes.length
  return (
    <Card size="sm" data-slot="import-preview">
      <CardContent className="flex flex-col gap-1">
        <p className="font-medium break-words">
          <MarkdownInline disableLinks>{file.timeline.title}</MarkdownInline>
        </p>
        <p className="text-muted-foreground">
          {count} {count === 1 ? 'node' : 'nodes'} · exported {formatDateTime(file.exported_at)}
        </p>
      </CardContent>
    </Card>
  )
}
