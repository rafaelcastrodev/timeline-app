import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { timelineSchema, timelineNodeSchema } from '@/types/models'
import { TimelineDatabase } from './db'
import { DEMO_TIMELINE } from './demo-timeline'

const NAME = 'timeline-app-demo-test'

afterEach(async () => {
  await Dexie.delete(NAME)
})

describe('demo timeline', () => {
  it('is written when the database is created', async () => {
    const db = new TimelineDatabase(NAME)
    try {
      const timelines = await db.timelines.toArray()
      expect(timelines).toHaveLength(1)
      const timeline = timelineSchema.parse(timelines[0])
      expect(timeline).toMatchObject({ title: DEMO_TIMELINE.title, orientation: 'vertical' })

      const nodes = await db.nodes.where('timeline_id').equals(timeline.id).sortBy('position')
      expect(nodes).toHaveLength(15)
      nodes.forEach((node, index) => {
        expect(timelineNodeSchema.parse(node)).toMatchObject({
          ...DEMO_TIMELINE.nodes[index],
          position: index,
          created_at: timeline.created_at,
        })
      })
    } finally {
      db.close()
    }
  })

  it('has titles and descriptions of at most 50 characters', () => {
    for (const node of DEMO_TIMELINE.nodes) {
      expect(node.title.length).toBeLessThanOrEqual(50)
      expect(node.description.length).toBeLessThanOrEqual(50)
    }
  })

  it('does not come back after it is deleted', async () => {
    const first = new TimelineDatabase(NAME)
    await first.transaction('rw', first.timelines, first.nodes, async () => {
      await first.nodes.clear()
      await first.timelines.clear()
    })
    first.close()

    const reopened = new TimelineDatabase(NAME)
    try {
      expect(await reopened.timelines.count()).toBe(0)
      expect(await reopened.nodes.count()).toBe(0)
    } finally {
      reopened.close()
    }
  })

  it('is not written when an existing database is upgraded', async () => {
    const v3 = new Dexie(NAME)
    v3.version(3).stores({
      timelines: 'id, updated_at',
      nodes: 'id, timeline_id, [timeline_id+position]',
    })
    await v3.open()
    v3.close()

    const db = new TimelineDatabase(NAME)
    try {
      expect(await db.timelines.count()).toBe(0)
      expect(db.verno).toBe(4)
    } finally {
      db.close()
    }
  })

  it('is skipped with `seedDemo: false`', async () => {
    const db = new TimelineDatabase(NAME, { seedDemo: false })
    try {
      expect(await db.timelines.count()).toBe(0)
    } finally {
      db.close()
    }
  })
})
