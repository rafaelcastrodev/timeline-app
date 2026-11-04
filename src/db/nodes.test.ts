import { describe, expect, it } from 'vitest'
import { advance, setupTestDatabase } from '@/test/db'
import { InvalidReorderError, RecordNotFoundError } from './errors'
import {
  countNodes,
  createNode,
  deleteNode,
  getNode,
  listNodes,
  reorderNodes,
  updateNode,
} from './nodes'
import { createTimeline, getTimeline } from './timelines'

setupTestDatabase()

async function setup(titles: string[]) {
  const timeline = await createTimeline({ title: 'T' })
  const nodes = []
  for (const title of titles) nodes.push(await createNode(timeline.id, { title }))
  return { timeline, nodes }
}

const titles = async (timelineId: string) => (await listNodes(timelineId)).map((n) => n.title)
const positions = async (timelineId: string) => (await listNodes(timelineId)).map((n) => n.position)

describe('node repository', () => {
  it('appends nodes with increasing positions', async () => {
    const { timeline, nodes } = await setup(['a', 'b', 'c'])
    expect(nodes.map((n) => n.position)).toEqual([0, 1, 2])
    expect(await titles(timeline.id)).toEqual(['a', 'b', 'c'])
    expect(await countNodes(timeline.id)).toBe(3)
  })

  it('positions are scoped per timeline', async () => {
    const { timeline } = await setup(['a', 'b'])
    const other = await createTimeline({ title: 'Other' })
    const first = await createNode(other.id, { title: 'x' })
    expect(first.position).toBe(0)
    expect(await titles(timeline.id)).toEqual(['a', 'b'])
  })

  it('rejects a node for a missing timeline and writes nothing', async () => {
    const missing = crypto.randomUUID()
    await expect(createNode(missing, { title: 'x' })).rejects.toBeInstanceOf(RecordNotFoundError)
    expect(await countNodes(missing)).toBe(0)
  })

  it('updates a node, keeps created_at, bumps node and parent updated_at', async () => {
    const { timeline, nodes } = await setup(['a'])
    const node = nodes[0]!
    advance()
    const updated = await updateNode(node.id, { description: 'new' })
    expect(updated).toMatchObject({
      title: 'a',
      description: 'new',
      position: 0,
      created_at: node.created_at,
      updated_at: '2026-01-01T00:00:01.000Z',
    })
    expect(await getNode(node.id)).toEqual(updated)
    expect((await getTimeline(timeline.id))?.updated_at).toBe('2026-01-01T00:00:01.000Z')
    expect((await getTimeline(timeline.id))?.created_at).toBe(timeline.created_at)
  })

  it('creates nodes with the default color unless one is given', async () => {
    const { timeline, nodes } = await setup(['a'])
    expect(nodes[0]!.color).toBeNull()
    const colored = await createNode(timeline.id, { title: 'b', color: 'teal' })
    expect(await getNode(colored.id)).toMatchObject({ color: 'teal' })
  })

  it('updates the color, back to the default too, and leaves it unchanged when absent', async () => {
    const { nodes } = await setup(['a'])
    const node = nodes[0]!
    expect(await updateNode(node.id, { color: 'rose' })).toMatchObject({ color: 'rose' })
    expect(await updateNode(node.id, { title: 'b' })).toMatchObject({ title: 'b', color: 'rose' })
    expect(await updateNode(node.id, { color: null })).toMatchObject({ color: null })
  })

  it('rejects an unknown color', async () => {
    const { timeline } = await setup([])
    await expect(createNode(timeline.id, { title: 'x', color: 'slate' as never })).rejects.toThrow()
    expect(await countNodes(timeline.id)).toBe(0)
  })

  it('creates nodes on layer 1 unless a layer is given, and updates the layer', async () => {
    const { timeline } = await setup([])
    const node = await createNode(timeline.id, { title: 'a' })
    expect(node.layer).toBe(1)
    const deep = await createNode(timeline.id, { title: 'b', layer: 5 })
    expect(await getNode(deep.id)).toMatchObject({ layer: 5 })
    expect(await updateNode(node.id, { layer: 3 })).toMatchObject({ layer: 3 })
    expect(await updateNode(node.id, { title: 'c' })).toMatchObject({ title: 'c', layer: 3 })
  })

  it.each([0, 6, 2.5])('rejects layer %s', async (layer) => {
    const { timeline } = await setup([])
    await expect(createNode(timeline.id, { title: 'x', layer })).rejects.toThrow()
    expect(await countNodes(timeline.id)).toBe(0)
  })

  it('creating a node bumps the parent updated_at', async () => {
    const timeline = await createTimeline({ title: 'T' })
    advance()
    await createNode(timeline.id, { title: 'a' })
    expect((await getTimeline(timeline.id))?.updated_at).toBe('2026-01-01T00:00:01.000Z')
  })

  it('deletes a node, renumbers the rest and bumps the parent', async () => {
    const { timeline, nodes } = await setup(['a', 'b', 'c'])
    advance()
    await deleteNode(nodes[1]!.id)
    expect(await getNode(nodes[1]!.id)).toBeUndefined()
    expect(await titles(timeline.id)).toEqual(['a', 'c'])
    expect(await positions(timeline.id)).toEqual([0, 1])
    expect((await getTimeline(timeline.id))?.updated_at).toBe('2026-01-01T00:00:01.000Z')

    const appended = await createNode(timeline.id, { title: 'd' })
    expect(appended.position).toBe(2)
  })

  it('throws RecordNotFoundError for a missing node', async () => {
    const id = crypto.randomUUID()
    await expect(updateNode(id, { title: 'x' })).rejects.toBeInstanceOf(RecordNotFoundError)
    await expect(deleteNode(id)).rejects.toBeInstanceOf(RecordNotFoundError)
  })

  it('reorders nodes, keeps node updated_at and bumps the parent', async () => {
    const { timeline, nodes } = await setup(['a', 'b', 'c', 'd'])
    const [a, b, c, d] = nodes.map((n) => n.id) as [string, string, string, string]
    advance()
    await reorderNodes(timeline.id, [c, a, d, b])

    const listed = await listNodes(timeline.id)
    expect(listed.map((n) => n.title)).toEqual(['c', 'a', 'd', 'b'])
    expect(listed.map((n) => n.position)).toEqual([0, 1, 2, 3])
    expect(listed.every((n) => n.updated_at === '2026-01-01T00:00:00.000Z')).toBe(true)
    expect((await getTimeline(timeline.id))?.updated_at).toBe('2026-01-01T00:00:01.000Z')
  })

  it.each([
    ['a missing id', (ids: string[]) => ids.slice(1)],
    ['a duplicate id', (ids: string[]) => [ids[0]!, ids[0]!, ids[2]!]],
    ['a foreign id', (ids: string[]) => [ids[0]!, ids[1]!, crypto.randomUUID()]],
  ])('rejects a reorder with %s and writes nothing', async (_label, mutate) => {
    const { timeline, nodes } = await setup(['a', 'b', 'c'])
    const before = await getTimeline(timeline.id)
    advance()
    await expect(reorderNodes(timeline.id, mutate(nodes.map((n) => n.id)))).rejects.toBeInstanceOf(
      InvalidReorderError,
    )
    expect(await titles(timeline.id)).toEqual(['a', 'b', 'c'])
    expect(await getTimeline(timeline.id)).toEqual(before)
  })
})
