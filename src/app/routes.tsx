import type { RouteObject } from 'react-router'
import { NodeCreateDialog } from '@/features/nodes/node-create-dialog'
import { NodeDetailDialog } from '@/features/nodes/node-detail-dialog'
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
        children: [
          { path: 'edit', element: <TimelineEditDialog /> },
          { path: 'nodes/new', element: <NodeCreateDialog /> },
          { path: 'nodes/:nodeId', element: <NodeDetailDialog /> },
        ],
      },
      {
        path: 'timelines/:timelineId/chart',
        // Loaded on demand: keeps the chart library out of the initial bundle (still precached).
        lazy: async () => {
          const { TimelineChartView } = await import('@/features/chart/timeline-chart-view')
          return { Component: TimelineChartView }
        },
        children: [{ path: 'nodes/:nodeId', element: <NodeDetailDialog /> }],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
