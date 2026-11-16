import type { NodeSeverity, TimelineNode } from '@/types/models'

/** One point of the severity chart: a node at its place in the timeline order. */
export interface SeverityPoint {
  id: string
  /** 1-based place in the timeline order (x axis). */
  order: number
  /** Markdown (inline subset). */
  title: string
  severity: NodeSeverity
}

/** Chart points for nodes already sorted by `position`. */
export function toSeverityPoints(nodes: readonly TimelineNode[]): SeverityPoint[] {
  return nodes.map((node, index) => ({
    id: node.id,
    order: index + 1,
    title: node.title,
    severity: node.severity,
  }))
}
