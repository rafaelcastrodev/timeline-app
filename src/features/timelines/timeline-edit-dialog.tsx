import { useOutletContext } from 'react-router'
import { toast } from 'sonner'
import { RouteDialog } from '@/components/common/route-dialog'
import { updateTimeline } from '@/db'
import { useCloseRoute } from '@/hooks/use-close-route'
import type { Timeline } from '@/types/models'
import { TimelineForm } from './timeline-form'

/** Child route of the timeline view, which passes the loaded timeline as outlet context. */
export function TimelineEditDialog() {
  const timeline = useOutletContext<Timeline>()
  const close = useCloseRoute(`/timelines/${timeline.id}`)

  return (
    <RouteDialog title="Edit timeline" onClose={close}>
      <TimelineForm
        key={timeline.id}
        defaultValues={{
          title: timeline.title,
          description: timeline.description,
          orientation: timeline.orientation,
        }}
        submitLabel="Save"
        onSubmit={(values) => updateTimeline(timeline.id, values)}
        onSaved={() => {
          toast.success('Timeline saved')
          close()
        }}
        onCancel={close}
      />
    </RouteDialog>
  )
}
