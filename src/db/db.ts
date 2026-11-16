import { Dexie, type EntityTable } from 'dexie'
import { DATABASE_NAME } from '@/lib/storage'
import {
  DEFAULT_NODE_LAYER,
  DEFAULT_NODE_SEVERITY,
  type Timeline,
  type TimelineNode,
} from '@/types/models'

export class TimelineDatabase extends Dexie {
  declare timelines: EntityTable<Timeline, 'id'>
  declare nodes: EntityTable<TimelineNode, 'id'>

  constructor(name = DATABASE_NAME) {
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
    // v3: nodes gain `layer` (not indexed); existing nodes go to layer 1.
    this.version(3)
      .stores(stores)
      .upgrade((tx) =>
        tx
          .table('nodes')
          .toCollection()
          .modify((node: Partial<TimelineNode>) => {
            node.layer ??= DEFAULT_NODE_LAYER
          }),
      )
    // v4: nodes gain `severity` (not indexed); existing nodes get severity 1.
    this.version(4)
      .stores(stores)
      .upgrade((tx) =>
        tx
          .table('nodes')
          .toCollection()
          .modify((node: Partial<TimelineNode>) => {
            node.severity ??= DEFAULT_NODE_SEVERITY
          }),
      )
  }
}

export const db = new TimelineDatabase()
