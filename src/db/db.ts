import { Dexie, type EntityTable } from 'dexie'
import type { Timeline, TimelineNode } from '@/types/models'

export class TimelineDatabase extends Dexie {
  declare timelines: EntityTable<Timeline, 'id'>
  declare nodes: EntityTable<TimelineNode, 'id'>

  constructor(name = 'timeline-app') {
    super(name)
    this.version(1).stores({
      timelines: 'id, updated_at',
      nodes: 'id, timeline_id, [timeline_id+position]',
    })
  }
}

export const db = new TimelineDatabase()
