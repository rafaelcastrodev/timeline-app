import { Dexie, type EntityTable } from 'dexie'
import type { Timeline, TimelineNode } from '@/types/models'

export class TimelineDatabase extends Dexie {
  declare timelines: EntityTable<Timeline, 'id'>
  declare nodes: EntityTable<TimelineNode, 'id'>

  constructor(name = 'timeline-app') {
    super(name)
    const stores = {
      timelines: 'id, updated_at',
      nodes: 'id, timeline_id, [timeline_id+position]',
    }
    this.version(1).stores(stores)
    // v2: nodes gain `color` (not indexed); existing nodes get the default card (`null`).
    this.version(2)
      .stores(stores)
      .upgrade((tx) =>
        tx
          .table('nodes')
          .toCollection()
          .modify((node: Partial<TimelineNode>) => {
            node.color ??= null
          }),
      )
  }
}

export const db = new TimelineDatabase()
