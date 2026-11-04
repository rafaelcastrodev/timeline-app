import { MousePointerClickIcon } from 'lucide-react'
import { Outlet } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { useTimelineCount } from '@/db'

/** Detail pane when no timeline is selected (desktop only; mobile shows the list instead). */
export function NoTimelineSelected() {
  const total = useTimelineCount()

  return (
    <>
      {total !== undefined && (
        <EmptyState
          className="h-full justify-center"
          icon={MousePointerClickIcon}
          title={total === 0 ? 'Nothing here yet' : 'No timeline selected'}
          description={
            total === 0 ? 'Create your first timeline.' : 'Select a timeline from the list.'
          }
        />
      )}
      <Outlet />
    </>
  )
}
