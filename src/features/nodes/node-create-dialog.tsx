import { useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { RouteDialog } from '@/components/common/route-dialog'
import { createNode, useNode } from '@/db'
import { useCloseRoute } from '@/hooks/use-close-route'
import type { NodeColor, Timeline } from '@/types/models'
import { nodeHeaderClasses } from './node-colors'
import { NodeForm } from './node-form'
import { INSERT_BEFORE_PARAM } from './node-insert'

/**
 * Child route of the timeline view, which passes the loaded timeline as outlet context. Appends
 * the node at the end, or inserts it before the node named by `?before=<nodeId>` (the insert
 * buttons between cards); the dialog description states that position.
 */
export function NodeCreateDialog() {
  const timeline = useOutletContext<Timeline>()
  const close = useCloseRoute(`/timelines/${timeline.id}`)
  const [searchParams] = useSearchParams()
  const beforeId = searchParams.get(INSERT_BEFORE_PARAM) ?? undefined
  const before = useNode(beforeId)
  const insertAt = before && before.timeline_id === timeline.id ? before.position + 1 : null
  // The header previews the color picked in the form.
  const [color, setColor] = useState<NodeColor | null>(null)

  return (
    <RouteDialog
      title="New node"
      description={insertAt === null ? undefined : `Inserted at position ${insertAt}.`}
      headerClassName={nodeHeaderClasses(color)}
      onClose={close}
    >
      <NodeForm
        submitLabel="Create"
        onSubmit={(values) => createNode(timeline.id, values, { beforeId })}
        onSaved={() => {
          toast.success('Node created')
          close()
        }}
        onCancel={close}
        onColorChange={setColor}
      />
    </RouteDialog>
  )
}
