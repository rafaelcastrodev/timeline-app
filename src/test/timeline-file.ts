import type { TimelineFile } from '@/types/transfer'

/** A valid export file with `nodeCount` nodes. */
export function makeTimelineFile(nodeCount = 2): TimelineFile {
  return {
    format: 'timeline-app',
    schema_version: 1,
    exported_at: '2026-05-01T12:00:00.000Z',
    timeline: {
      id: crypto.randomUUID(),
      title: 'Imported **trip**',
      description: 'From a file',
      orientation: 'horizontal',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-02-01T00:00:00.000Z',
    },
    nodes: Array.from({ length: nodeCount }, (_, position) => ({
      id: crypto.randomUUID(),
      title: `Node ${position + 1}`,
      description: `Description ${position + 1}`,
      color: null,
      position,
      created_at: `2025-01-0${position + 1}T00:00:00.000Z`,
      updated_at: `2025-03-0${position + 1}T00:00:00.000Z`,
    })),
  }
}

export function jsonFile(content: unknown, name = 'timeline.json'): File {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  return new File([text], name, { type: 'application/json' })
}
