import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { TimelineDatabase } from './db'

const NAME = 'timeline-app-migration-test'

afterEach(async () => {
  await Dexie.delete(NAME)
})

describe('database migrations', () => {
  it('v2 and v3 give existing nodes the default color and layer', async () => {
    const v1 = new Dexie(NAME)
    v1.version(1).stores({
      timelines: 'id, updated_at',
      nodes: 'id, timeline_id, [timeline_id+position]',
    })
    const at = '2026-01-01T00:00:00.000Z'
    const timelineId = crypto.randomUUID()
    const nodeId = crypto.randomUUID()
    await v1.table('timelines').add({
      id: timelineId,
      title: 'Old',
      description: '',
      orientation: 'vertical',
      created_at: at,
      updated_at: at,
    })
    await v1.table('nodes').add({
      id: nodeId,
      timeline_id: timelineId,
      title: 'Node',
      description: '',
      position: 0,
      created_at: at,
      updated_at: at,
    })
    v1.close()

    const db = new TimelineDatabase(NAME)
    try {
      expect(await db.nodes.get(nodeId)).toMatchObject({
        title: 'Node',
        color: null,
        layer: 1,
        updated_at: at,
      })
      expect(db.verno).toBe(3)
    } finally {
      db.close()
    }
  })

  it('v3 keeps the color of v2 nodes and puts them on layer 1', async () => {
    const v2 = new Dexie(NAME)
    v2.version(2).stores({
      timelines: 'id, updated_at',
      nodes: 'id, timeline_id, [timeline_id+position]',
    })
    const nodeId = crypto.randomUUID()
    await v2.table('nodes').add({
      id: nodeId,
      timeline_id: crypto.randomUUID(),
      title: 'Colored',
      description: '',
      color: 'teal',
      position: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    v2.close()

    const db = new TimelineDatabase(NAME)
    try {
      expect(await db.nodes.get(nodeId)).toMatchObject({ color: 'teal', layer: 1 })
    } finally {
      db.close()
    }
  })
})
