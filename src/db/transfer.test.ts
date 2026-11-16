import { describe, expect, it, vi } from 'vitest'
import { advance, setupTestDatabase } from '@/test/db'
import { makeTimelineFile } from '@/test/timeline-file'
import { db } from './db'
import { RecordNotFoundError } from './errors'
import { createNode, deleteNode, listNodes, reorderNodes } from './nodes'
import { createTimeline, getTimeline, listTimelines } from './timelines'
import { exportTimeline, importTimeline, replaceTimeline } from './transfer'

setupTestDatabase()

async function snapshot() {
  return { timelines: await db.timelines.toArray(), nodes: await db.nodes.toArray() }
}

describe('transfer repository', () => {
  it('exports metadata and nodes sorted by position, without timeline_id', async () => {
    const timeline = await createTimeline({ title: 'Trip', description: 'd' })
    const a = await createNode(timeline.id, { title: 'A' })
    const b = await createNode(timeline.id, { title: 'B', description: 'b' })
    const c = await createNode(timeline.id, { title: 'C' })
    await reorderNodes(timeline.id, [c.id, a.id, b.id])
    advance()

    const file = await exportTimeline(timeline.id)
    const stored = (await getTimeline(timeline.id))!
    expect(file).toEqual({
      format: 'timeline-app',
      schema_version: 1,
      exported_at: '2026-01-01T00:00:01.000Z',
      timeline: stored,
      nodes: [
        { ...c, position: 0 },
        { ...a, position: 1 },
        { ...b, position: 2 },
      ].map(({ timeline_id, ...node }) => (void timeline_id, node)),
    })
  })

  it('throws RecordNotFoundError when exporting a missing timeline', async () => {
    await expect(exportTimeline(crypto.randomUUID())).rejects.toBeInstanceOf(RecordNotFoundError)
  })

  it('round trip: export then import as new gives equivalent data with node created_at kept', async () => {
    const source = await createTimeline({ title: 'Source', orientation: 'horizontal' })
    await createNode(source.id, {
      title: 'One',
      description: '**1**',
      color: 'violet',
      layer: 4,
      severity: 2,
    })
    advance()
    await createNode(source.id, { title: 'Two' })
    advance()
    const removed = await createNode(source.id, { title: 'Gone' })
    await deleteNode(removed.id)
    const file = await exportTimeline(source.id)
    advance()

    const imported = await importTimeline(file)

    expect(imported.id).not.toBe(source.id)
    expect(imported).toMatchObject({
      title: 'Source',
      description: '',
      orientation: 'horizontal',
      created_at: '2026-01-01T00:00:03.000Z',
      updated_at: '2026-01-01T00:00:03.000Z',
    })
    expect(await getTimeline(imported.id)).toEqual(imported)
    const sourceNodes = await listNodes(source.id)
    const importedNodes = await listNodes(imported.id)
    const content = (nodes: typeof sourceNodes) =>
      nodes.map(
        ({ title, description, color, layer, severity, position, created_at, updated_at }) => ({
          title,
          description,
          color,
          layer,
          severity,
          position,
          created_at,
          updated_at,
        }),
      )
    expect(content(importedNodes)).toEqual(content(sourceNodes))
    expect(importedNodes.map((node) => node.color)).toEqual(['violet', null])
    expect(importedNodes.map((node) => node.layer)).toEqual([4, 1])
    expect(importedNodes.map((node) => node.severity)).toEqual([2, 4])
    expect(importedNodes.every((node) => node.timeline_id === imported.id)).toBe(true)
    const sourceIds = new Set(sourceNodes.map((node) => node.id))
    expect(importedNodes.some((node) => sourceIds.has(node.id))).toBe(false)
    // The new timeline comes first on the dashboard.
    expect((await listTimelines(10)).map((t) => t.id)).toEqual([imported.id, source.id])
  })

  it('imports positions from array order and regenerates ids when the file is imported twice', async () => {
    const file = makeTimelineFile(3)
    file.nodes.reverse()
    const first = await importTimeline(file)
    const second = await importTimeline(file)

    const firstNodes = await listNodes(first.id)
    expect(firstNodes.map((node) => [node.title, node.position])).toEqual([
      ['Node 3', 0],
      ['Node 2', 1],
      ['Node 1', 2],
    ])
    expect(firstNodes.map((node) => node.created_at)).toEqual(
      file.nodes.map((node) => node.created_at),
    )
    expect(await db.nodes.count()).toBe(6)
    expect(new Set((await db.nodes.toArray()).map((node) => node.id)).size).toBe(6)
    expect(second.id).not.toBe(first.id)
  })

  it('replace keeps the target id and created_at and swaps content and nodes', async () => {
    const target = await createTimeline({ title: 'Target', description: 'old' })
    await createNode(target.id, { title: 'Old 1' })
    await createNode(target.id, { title: 'Old 2' })
    const other = await createTimeline({ title: 'Other' })
    const otherNode = await createNode(other.id, { title: 'Keep me' })
    advance()
    const file = makeTimelineFile(1)

    const replaced = await replaceTimeline(target.id, file)

    expect(replaced).toEqual({
      id: target.id,
      title: 'Imported **trip**',
      description: 'From a file',
      orientation: 'horizontal',
      created_at: target.created_at,
      updated_at: '2026-01-01T00:00:01.000Z',
    })
    expect(await getTimeline(target.id)).toEqual(replaced)
    const nodes = await listNodes(target.id)
    expect(nodes).toEqual([
      {
        id: expect.any(String) as string,
        timeline_id: target.id,
        title: 'Node 1',
        description: 'Description 1',
        color: null,
        layer: 1,
        severity: 1,
        position: 0,
        created_at: file.nodes[0]!.created_at,
        updated_at: file.nodes[0]!.updated_at,
      },
    ])
    expect(nodes[0]!.id).not.toBe(file.nodes[0]!.id)
    expect(await listNodes(other.id)).toEqual([otherNode])
  })

  it('replace with an empty node list leaves the timeline without nodes', async () => {
    const target = await createTimeline({ title: 'Target' })
    await createNode(target.id, { title: 'Old' })
    await replaceTimeline(target.id, makeTimelineFile(0))
    expect(await listNodes(target.id)).toEqual([])
  })

  it('replace of a missing timeline throws and writes nothing', async () => {
    const existing = await createTimeline({ title: 'Existing' })
    await createNode(existing.id, { title: 'Node' })
    const before = await snapshot()

    await expect(replaceTimeline(crypto.randomUUID(), makeTimelineFile())).rejects.toBeInstanceOf(
      RecordNotFoundError,
    )
    expect(await snapshot()).toEqual(before)
  })

  it('invalid input writes nothing in either mode', async () => {
    const target = await createTimeline({ title: 'Target' })
    await createNode(target.id, { title: 'Old' })
    const before = await snapshot()
    const invalid = makeTimelineFile()
    invalid.nodes[1]!.title = ''

    await expect(importTimeline(invalid)).rejects.toThrow()
    await expect(replaceTimeline(target.id, invalid)).rejects.toThrow()
    expect(await snapshot()).toEqual(before)
  })

  it('a failing node write rolls back the whole import', async () => {
    const existing = await createTimeline({ title: 'Existing' })
    const taken = await createNode(existing.id, { title: 'Taken' })
    const before = await snapshot()
    // The new timeline gets a fresh id; its nodes collide with an existing node id.
    const randomUUID = crypto.randomUUID.bind(crypto)
    vi.spyOn(crypto, 'randomUUID')
      .mockImplementationOnce(randomUUID)
      .mockImplementation(() => taken.id as ReturnType<typeof randomUUID>)

    await expect(importTimeline(makeTimelineFile(1))).rejects.toThrow()
    vi.restoreAllMocks()
    expect(await snapshot()).toEqual(before)
  })
})
