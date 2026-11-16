import { describe, expect, it } from 'vitest'
import type { TimelineNode } from '@/types/models'
import { toSeverityPoints } from './severity-points'

const AT = '2026-01-01T00:00:00.000Z'

function node(id: string, position: number, severity: TimelineNode['severity']): TimelineNode {
  return {
    id,
    timeline_id: 't',
    title: `**${id}**`,
    description: '',
    color: null,
    layer: 1,
    severity,
    position,
    created_at: AT,
    updated_at: AT,
  }
}

describe('toSeverityPoints', () => {
  it('maps nodes in the given order to 1-based points with title and severity', () => {
    expect(toSeverityPoints([node('a', 0, 2), node('b', 1, 5), node('c', 2, 1)])).toEqual([
      { id: 'a', order: 1, title: '**a**', severity: 2 },
      { id: 'b', order: 2, title: '**b**', severity: 5 },
      { id: 'c', order: 3, title: '**c**', severity: 1 },
    ])
  })

  it('returns no points for no nodes', () => {
    expect(toSeverityPoints([])).toEqual([])
  })
})
