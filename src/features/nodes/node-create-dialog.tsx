import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { toast } from 'sonner'
import { RouteDialog } from '@/components/common/route-dialog'
import { createNode } from '@/db'
import { useCloseRoute } from '@/hooks/use-close-route'
import type { NodeColor, Timeline } from '@/types/models'
import { nodeHeaderClasses } from './node-colors'
import { NodeForm } from './node-form'

/** Child route of the timeline view, which passes the loaded timeline as outlet context. */
export function NodeCreateDialog() {
  const timeline = useOutletContext<Timeline>()
  const close = useCloseRoute(`/timelines/${timeline.id}`)
  // The header previews the color picked in the form.
  const [color, setColor] = useState<NodeColor | null>(null)

  return (
    <RouteDialog title="New node" headerClassName={nodeHeaderClasses(color)} onClose={close}>
      <NodeForm
        submitLabel="Create"
        onSubmit={(values) => createNode(timeline.id, values)}
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
