import { useNavigate } from 'react-router'
import { RouteDialog } from '@/components/common/route-dialog'
import { createTimeline } from '@/db'
import { useCloseRoute } from '@/hooks/use-close-route'
import { TimelineForm } from './timeline-form'

export function TimelineCreateDialog() {
  const navigate = useNavigate()
  const close = useCloseRoute('/')

  return (
    <RouteDialog title="New timeline" onClose={close}>
      <TimelineForm
        submitLabel="Create"
        onSubmit={createTimeline}
        onSaved={(timeline) => void navigate(`/timelines/${timeline.id}`, { replace: true })}
        onCancel={close}
      />
    </RouteDialog>
  )
}
