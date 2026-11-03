import { nowIso } from '@/lib/dates'
import {
  timelineChangesSchema,
  timelineInputSchema,
  type Timeline,
  type TimelineChanges,
  type TimelineInput,
} from '@/types/models'
import { db } from './db'
import { RecordNotFoundError } from './errors'
import { definedOnly } from './utils'

export async function createTimeline(input: TimelineInput): Promise<Timeline> {
  const fields = timelineInputSchema.parse(input)
  const now = nowIso()
  const timeline: Timeline = {
    id: crypto.randomUUID(),
    ...fields,
    created_at: now,
    updated_at: now,
  }
  await db.timelines.add(timeline)
  return timeline
}

export async function updateTimeline(id: string, changes: TimelineChanges): Promise<Timeline> {
  const fields = timelineChangesSchema.parse(changes)
  return db.transaction('rw', db.timelines, async () => {
    const current = await db.timelines.get(id)
    if (!current) throw new RecordNotFoundError('timeline', id)
    const updated: Timeline = { ...current, ...definedOnly(fields), updated_at: nowIso() }
    await db.timelines.put(updated)
    return updated
  })
}

/** Deletes the timeline and all of its nodes. */
export async function deleteTimeline(id: string): Promise<void> {
  await db.transaction('rw', db.timelines, db.nodes, async () => {
    await db.nodes.where('timeline_id').equals(id).delete()
    await db.timelines.delete(id)
  })
}

export function getTimeline(id: string): Promise<Timeline | undefined> {
  return db.timelines.get(id)
}

/** Most recently updated first. */
export function listTimelines(limit: number): Promise<Timeline[]> {
  return db.timelines.orderBy('updated_at').reverse().limit(limit).toArray()
}

export function countTimelines(): Promise<number> {
  return db.timelines.count()
}
