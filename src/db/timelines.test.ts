import { describe, expect, it } from 'vitest'
import { advance, setupTestDatabase } from '@/test/db'
import { db } from './db'
import { RecordNotFoundError } from './errors'
import { createNode } from './nodes'
import {
  countTimelines,
  createTimeline,
  deleteTimeline,
  getTimeline,
  listTimelines,
  updateTimeline,
} from './timelines'

setupTestDatabase()

describe('timeline repository', () => {
  it('creates a timeline with defaults and equal timestamps', async () => {
    const timeline = await createTimeline({ title: '  First  ' })
    expect(timeline).toMatchObject({
      title: 'First',
      description: '',
      orientation: 'vertical',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(await getTimeline(timeline.id)).toEqual(timeline)
  })

  it('rejects an empty title', async () => {
    await expect(createTimeline({ title: '   ' })).rejects.toThrow()
    expect(await countTimelines()).toBe(0)
  })

  it('updates given fields, keeps created_at and bumps updated_at', async () => {
    const timeline = await createTimeline({ title: 'A', description: 'desc' })
    advance()
    const updated = await updateTimeline(timeline.id, { orientation: 'horizontal' })
    expect(updated).toMatchObject({
      title: 'A',
      description: 'desc',
      orientation: 'horizontal',
      created_at: timeline.created_at,
      updated_at: '2026-01-01T00:00:01.000Z',
    })
    expect(await getTimeline(timeline.id)).toEqual(updated)
  })

  it('ignores undefined values in an update', async () => {
    const timeline = await createTimeline({ title: 'A', description: 'keep' })
    const updated = await updateTimeline(timeline.id, { description: undefined, title: 'B' })
    expect(updated.description).toBe('keep')
    expect(updated.title).toBe('B')
  })

  it('throws RecordNotFoundError when updating a missing timeline', async () => {
    await expect(updateTimeline(crypto.randomUUID(), { title: 'x' })).rejects.toBeInstanceOf(
      RecordNotFoundError,
    )
  })

  it('lists by updated_at descending with a limit', async () => {
    const a = await createTimeline({ title: 'A' })
    advance()
    const b = await createTimeline({ title: 'B' })
    advance()
    const c = await createTimeline({ title: 'C' })
    advance()
    await updateTimeline(a.id, { title: 'A2' })

    expect((await listTimelines(10)).map((t) => t.id)).toEqual([a.id, c.id, b.id])
    expect((await listTimelines(2)).map((t) => t.id)).toEqual([a.id, c.id])
    expect(await countTimelines()).toBe(3)
  })

  it('deletes a timeline and cascades to its nodes only', async () => {
    const a = await createTimeline({ title: 'A' })
    const b = await createTimeline({ title: 'B' })
    await createNode(a.id, { title: 'a1' })
    await createNode(a.id, { title: 'a2' })
    const b1 = await createNode(b.id, { title: 'b1' })

    await deleteTimeline(a.id)

    expect(await getTimeline(a.id)).toBeUndefined()
    expect(await db.nodes.where('timeline_id').equals(a.id).count()).toBe(0)
    expect(await db.nodes.toArray()).toEqual([b1])
  })
})
