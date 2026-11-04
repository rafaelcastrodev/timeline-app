import type { RouteObject } from 'react-router'
import { NoTimelineSelected } from '@/features/timelines/no-timeline-selected'
import { TimelineCreateDialog } from '@/features/timelines/timeline-create-dialog'
import { TimelineEditDialog } from '@/features/timelines/timeline-edit-dialog'
import { TimelineView } from '@/features/timelines/timeline-view'
import { AppLayout } from './app-layout'
import { NotFound, RouteError } from './route-error'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <NoTimelineSelected />,
        children: [
          { index: true, element: null },
          { path: 'timelines/new', element: <TimelineCreateDialog /> },
        ],
      },
      {
        path: 'timelines/:timelineId',
        element: <TimelineView />,
        children: [{ path: 'edit', element: <TimelineEditDialog /> }],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
