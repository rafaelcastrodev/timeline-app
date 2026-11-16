import { nowIso } from '@/lib/dates'
import type { Timeline, TimelineNode } from '@/types/models'
import {
  TIMELINE_FILE_FORMAT,
  TIMELINE_FILE_SCHEMA_VERSION,
  timelineFileSchema,
  type TimelineFile,
} from '@/types/transfer'
import { db } from './db'
import { RecordNotFoundError } from './errors'
import { listNodes } from './nodes'

/** Reads a timeline and its nodes (sorted by position) as an export file, in one transaction. */
export async function exportTimeline(id: string): Promise<TimelineFile> {
  return db.transaction('r', db.timelines, db.nodes, async () => {
    const timeline = await db.timelines.get(id)
    if (!timeline) throw new RecordNotFoundError('timeline', id)
    const nodes = await listNodes(id)
    return {
      format: TIMELINE_FILE_FORMAT,
      schema_version: TIMELINE_FILE_SCHEMA_VERSION,
      exported_at: nowIso(),
      timeline: {
        id: timeline.id,
        title: timeline.title,
        description: timeline.description,
        orientation: timeline.orientation,
        created_at: timeline.created_at,
        updated_at: timeline.updated_at,
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        title: node.title,
        description: node.description,
        color: node.color,
        layer: node.layer,
        severity: node.severity,
        position: node.position,
        created_at: node.created_at,
        updated_at: node.updated_at,
      })),
    }
  })
}

/** New node records for `timelineId`: new ids, positions from array order, timestamps from the file. */
function importedNodes(timelineId: string, file: TimelineFile): TimelineNode[] {
  return file.nodes.map((node, position) => ({
    id: crypto.randomUUID(),
    timeline_id: timelineId,
    title: node.title,
    description: node.description,
    color: node.color,
    layer: node.layer,
    severity: node.severity,
    position,
    created_at: node.created_at,
    updated_at: node.updated_at,
  }))
}

/**
 * Creates a new timeline from an export file: new ids, `created_at = now`, node timestamps kept.
 * Everything is written in one transaction.
 */
export async function importTimeline(input: TimelineFile): Promise<Timeline> {
  const file = timelineFileSchema.parse(input)
  return db.transaction('rw', db.timelines, db.nodes, async () => {
    const now = nowIso()
    const timeline: Timeline = {
      id: crypto.randomUUID(),
      title: file.timeline.title,
      description: file.timeline.description,
      orientation: file.timeline.orientation,
      created_at: now,
      updated_at: now,
    }
    await db.timelines.add(timeline)
    await db.nodes.bulkAdd(importedNodes(timeline.id, file))
    return timeline
  })
}

/**
 * Replaces a timeline's content with an export file: keeps its id and `created_at`, takes title,
 * description and orientation from the file, deletes its nodes and adds the file's nodes with new
 * ids. Everything is written in one transaction.
 */
export async function replaceTimeline(id: string, input: TimelineFile): Promise<Timeline> {
  const file = timelineFileSchema.parse(input)
  return db.transaction('rw', db.timelines, db.nodes, async () => {
    const current = await db.timelines.get(id)
    if (!current) throw new RecordNotFoundError('timeline', id)
    const timeline: Timeline = {
      ...current,
      title: file.timeline.title,
      description: file.timeline.description,
      orientation: file.timeline.orientation,
      updated_at: nowIso(),
    }
    await db.nodes.where('timeline_id').equals(id).delete()
    await db.timelines.put(timeline)
    await db.nodes.bulkAdd(importedNodes(id, file))
    return timeline
  })
}
