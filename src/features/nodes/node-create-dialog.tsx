import { useOutletContext } from 'react-router'
import { RouteDialog } from '@/components/common/route-dialog'
import { createNode } from '@/db'
import { useCloseRoute } from '@/hooks/use-close-route'
import type { Timeline } from '@/types/models'
import { NodeForm } from './node-form'

/** Child route of the timeline view, which passes the loaded timeline as outlet context. */
export function NodeCreateDialog() {
  const timeline = useOutletContext<Timeline>()
  const close = useCloseRoute(`/timelines/${timeline.id}`)

  return (
    <RouteDialog title="New node" onClose={close}>
      <NodeForm
        submitLabel="Create"
        onSubmit={(values) => createNode(timeline.id, values)}
        onSaved={close}
        onCancel={close}
      />
    </RouteDialog>
  )
}
