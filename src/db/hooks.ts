import { useLiveQuery } from 'dexie-react-hooks'
import type { Timeline, TimelineNode } from '@/types/models'
import { countNodes, getNode, listNodes } from './nodes'
import { countTimelines, getTimeline, listTimelines } from './timelines'

// Convention: `undefined` while loading, `null` when the record does not exist.

export function useTimelines(limit: number): Timeline[] | undefined {
  return useLiveQuery(() => listTimelines(limit), [limit])
}

export function useTimelineCount(): number | undefined {
  return useLiveQuery(() => countTimelines(), [])
}

export function useTimeline(id: string | undefined): Timeline | null | undefined {
  return useLiveQuery(async () => (id ? ((await getTimeline(id)) ?? null) : null), [id])
}

export function useNodes(timelineId: string | undefined): TimelineNode[] | undefined {
  return useLiveQuery(() => (timelineId ? listNodes(timelineId) : []), [timelineId])
}

export function useNodeCount(timelineId: string): number | undefined {
  return useLiveQuery(() => countNodes(timelineId), [timelineId])
}

export function useNode(id: string | undefined): TimelineNode | null | undefined {
  return useLiveQuery(async () => (id ? ((await getNode(id)) ?? null) : null), [id])
}
