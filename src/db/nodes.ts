import { Dexie } from 'dexie'
import { nowIso } from '@/lib/dates'
import {
  nodeChangesSchema,
  nodeInputSchema,
  type NodeChanges,
  type NodeInput,
  type TimelineNode,
} from '@/types/models'
import { db } from './db'
import { InvalidReorderError, RecordNotFoundError } from './errors'
import { definedOnly } from './utils'

function byPosition(timelineId: string) {
  return db.nodes
    .where('[timeline_id+position]')
    .between([timelineId, Dexie.minKey], [timelineId, Dexie.maxKey])
}

async function touchTimeline(timelineId: string, now: string): Promise<void> {
  const updated = await db.timelines.update(timelineId, { updated_at: now })
  if (updated === 0) throw new RecordNotFoundError('timeline', timelineId)
}

interface CreateNodeOptions {
  /**
   * Inserts the node at this node's position and shifts it and the nodes after it by one. When
   * the node no longer exists or belongs to another timeline, the new node is appended instead,
   * so the form's content is never lost to a concurrent delete.
   */
  beforeId?: string
}

/** Appends a node at the end of the timeline (`position = max + 1`), or inserts it before `beforeId`. */
export async function createNode(
  timelineId: string,
  input: NodeInput,
  { beforeId }: CreateNodeOptions = {},
): Promise<TimelineNode> {
  const fields = nodeInputSchema.parse(input)
  return db.transaction('rw', db.timelines, db.nodes, async () => {
    const now = nowIso()
    await touchTimeline(timelineId, now)
    const before = beforeId ? await db.nodes.get(beforeId) : undefined
    let position: number
    if (before && before.timeline_id === timelineId) {
      position = before.position
      const following = await byPosition(timelineId)
        .filter((node) => node.position >= position)
        .toArray()
      await db.nodes.bulkUpdate(
        following.map((node) => ({ key: node.id, changes: { position: node.position + 1 } })),
      )
    } else {
      const last = await byPosition(timelineId).last()
      position = last ? last.position + 1 : 0
    }
    const node: TimelineNode = {
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      ...fields,
      position,
      created_at: now,
      updated_at: now,
    }
    await db.nodes.add(node)
    return node
  })
}

export async function updateNode(id: string, changes: NodeChanges): Promise<TimelineNode> {
  const fields = nodeChangesSchema.parse(changes)
  return db.transaction('rw', db.timelines, db.nodes, async () => {
    const current = await db.nodes.get(id)
    if (!current) throw new RecordNotFoundError('node', id)
    const now = nowIso()
    const updated: TimelineNode = { ...current, ...definedOnly(fields), updated_at: now }
    await db.nodes.put(updated)
    await touchTimeline(current.timeline_id, now)
    return updated
  })
}

/** Deletes the node and closes the gap so positions stay `0..n-1`. */
export async function deleteNode(id: string): Promise<void> {
  await db.transaction('rw', db.timelines, db.nodes, async () => {
    const current = await db.nodes.get(id)
    if (!current) throw new RecordNotFoundError('node', id)
    await db.nodes.delete(id)
    const remaining = await byPosition(current.timeline_id).toArray()
    await renumber(remaining)
    await touchTimeline(current.timeline_id, nowIso())
  })
}

export function getNode(id: string): Promise<TimelineNode | undefined> {
  return db.nodes.get(id)
}

/** Nodes of a timeline ordered by `position`. */
export function listNodes(timelineId: string): Promise<TimelineNode[]> {
  return byPosition(timelineId).toArray()
}

export function countNodes(timelineId: string): Promise<number> {
  return db.nodes.where('timeline_id').equals(timelineId).count()
}

/**
 * Applies a new manual order. `orderedIds` must contain every node id of the
 * timeline exactly once. Node `updated_at` is not changed (order is not node
 * content); the timeline's `updated_at` is bumped.
 */
export async function reorderNodes(timelineId: string, orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.timelines, db.nodes, async () => {
    const nodes = await byPosition(timelineId).toArray()
    const byId = new Map(nodes.map((node) => [node.id, node]))
    if (orderedIds.length !== nodes.length || new Set(orderedIds).size !== orderedIds.length) {
      throw new InvalidReorderError('orderedIds must list every node of the timeline exactly once')
    }
    const ordered = orderedIds.map((id) => {
      const node = byId.get(id)
      if (!node)
        throw new InvalidReorderError(`node ${id} does not belong to timeline ${timelineId}`)
      return node
    })
    await renumber(ordered)
    await touchTimeline(timelineId, nowIso())
  })
}

/** Writes `position = index` for every node whose position differs. */
async function renumber(ordered: TimelineNode[]): Promise<void> {
  const changes = ordered.flatMap((node, index) =>
    node.position === index ? [] : [{ key: node.id, changes: { position: index } }],
  )
  if (changes.length > 0) await db.nodes.bulkUpdate(changes)
}
