import { Dexie, type EntityTable } from 'dexie'
import { nowIso } from '@/lib/dates'
import { DATABASE_NAME } from '@/lib/storage'
import {
  DEFAULT_NODE_LAYER,
  DEFAULT_NODE_SEVERITY,
  type Timeline,
  type TimelineNode,
} from '@/types/models'
import { demoTimelineRecords } from './demo-timeline'

export interface TimelineDatabaseOptions {
  /** Write the demo timeline when the database is created. Never runs on upgrades or later opens. */
  seedDemo?: boolean
}

export class TimelineDatabase extends Dexie {
  declare timelines: EntityTable<Timeline, 'id'>
  declare nodes: EntityTable<TimelineNode, 'id'>

  constructor(name = DATABASE_NAME, { seedDemo = true }: TimelineDatabaseOptions = {}) {
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
    // First launch only: Dexie fires `populate` once, inside the transaction that creates the
    // database, so a deleted demo timeline does not come back.
    if (seedDemo) {
      this.on('populate', async (tx) => {
        const { timeline, nodes } = demoTimelineRecords(nowIso())
        await tx.table('timelines').add(timeline)
        await tx.table('nodes').bulkAdd(nodes)
      })
    }
  }
}

// `VITE_DEMO_TIMELINE=off` skips the demo timeline (unit and E2E tests start from an empty database).
export const db = new TimelineDatabase(DATABASE_NAME, {
  seedDemo: import.meta.env.VITE_DEMO_TIMELINE !== 'off',
})
