import type { Orientation, TimelineNode } from '@/types/models'
import { NodeCard } from './node-card'

interface NodeListProps {
  nodes: TimelineNode[]
  orientation: Orientation
}

/**
 * Nodes in manual order along a timeline line. Vertical: cards stacked to the right of a
 * vertical line. Horizontal: a row of fixed-width cards under a horizontal line, scrolling
 * horizontally with snap points.
 */
export function NodeList({ nodes, orientation }: NodeListProps) {
  if (orientation === 'horizontal') {
    return (
      <div
        data-slot="node-scroller"
        className="snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain lg:scroll-px-6"
      >
        <ol
          aria-label="Nodes"
          data-orientation="horizontal"
          className="relative flex w-max gap-4 px-4 pt-6 pb-4 before:absolute before:inset-x-0 before:top-[calc(1.875rem-0.5px)] before:h-px before:bg-border lg:px-6"
        >
          {nodes.map((node) => (
            <li
              key={node.id}
              className="relative flex w-64 shrink-0 snap-start flex-col gap-3 md:w-72"
            >
              <span
                aria-hidden="true"
                className="relative ml-4 size-3 rounded-full border-2 border-primary bg-background"
              />
              <NodeCard node={node} className="flex-1" />
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <ol
      aria-label="Nodes"
      data-orientation="vertical"
      className="relative flex flex-col gap-4 py-4 pr-4 pl-10 before:absolute before:inset-y-0 before:left-[calc(1.5rem-0.5px)] before:w-px before:bg-border lg:pr-6 lg:pl-12 lg:before:left-[calc(2rem-0.5px)]"
    >
      {nodes.map((node) => (
        <li key={node.id} className="relative max-w-2xl">
          <span
            aria-hidden="true"
            className="absolute top-4 -left-[1.375rem] size-3 rounded-full border-2 border-primary bg-background"
          />
          <NodeCard node={node} />
        </li>
      ))}
    </ol>
  )
}
