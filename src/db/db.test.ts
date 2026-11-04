import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { TimelineDatabase } from './db'

const NAME = 'timeline-app-migration-test'

afterEach(async () => {
  await Dexie.delete(NAME)
})

describe('database migrations', () => {
  it('v2 gives existing nodes the default color', async () => {
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
        updated_at: at,
      })
      expect(db.verno).toBe(2)
    } finally {
      db.close()
    }
  })
})
