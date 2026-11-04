import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Orientation, TimelineNode } from '@/types/models'
import { NodeCard } from './node-card'
import { useNodeOrder } from './use-node-order'

interface NodeListProps {
  timelineId: string
  nodes: TimelineNode[]
  orientation: Orientation
}

const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
const lockToHorizontalAxis: Modifier = ({ transform }) => ({ ...transform, y: 0 })

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'To pick up the node, press Space or Enter. Use the arrow keys to move it, ' +
    'Space or Enter to drop it, or Escape to cancel.',
}

/**
 * Nodes in manual order along a timeline line, sortable by drag and drop from each card's handle
 * (mouse, touch after a long press, keyboard). Vertical: cards stacked to the right of a vertical
 * line. Horizontal: a row of fixed-width cards under a horizontal line, scrolling horizontally
 * with snap points (snapping is off while dragging so auto-scroll is not pulled back).
 */
export function NodeList({ timelineId, nodes, orientation }: NodeListProps) {
  const { orderedNodes, ids, move, failed } = useNodeOrder(timelineId, nodes)
  const [dragging, setDragging] = useState(false)
  const lastOver = useRef<UniqueIdentifier | null>(null)
  const position = (id: UniqueIdentifier) => `${ids.indexOf(String(id)) + 1} of ${ids.length}`
  // Announced by position (titles are Markdown). `lastOver` holds the position last announced,
  // so the initial "over itself" event does not replace the pick-up message.
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOver.current = active.id
      return `Picked up node at position ${position(active.id)}.`
    },
    onDragOver: ({ over }) => {
      const overId = over?.id ?? null
      if (overId === lastOver.current) return undefined
      lastOver.current = overId
      return overId === null
        ? 'Node is not over a position.'
        : `Node moved to position ${position(overId)}.`
    },
    onDragEnd: ({ over }) =>
      over ? `Node dropped at position ${position(over.id)}.` : 'Node dropped.',
    onDragCancel: () => 'Reordering cancelled. The node is back in its original position.',
  }
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const horizontal = orientation === 'horizontal'

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(false)
    if (over) move(String(active.id), String(over.id))
  }

  const items = orderedNodes.map((node) => (
    <SortableNode key={node.id} node={node} orientation={orientation} />
  ))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[horizontal ? lockToHorizontalAxis : lockToVerticalAxis]}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(false)}
    >
      <SortableContext
        items={ids}
        strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        {failed && (
          <p role="alert" className="px-4 pt-4 text-sm text-destructive lg:px-6">
            Could not save the new order. Try again.
          </p>
        )}
        {horizontal ? (
          <div
            data-slot="node-scroller"
            className={cn(
              'scroll-px-4 overflow-x-auto overscroll-x-contain lg:scroll-px-6',
              dragging ? 'snap-none' : 'snap-x snap-mandatory',
            )}
          >
            <ol
              aria-label="Nodes"
              data-orientation="horizontal"
              className="relative flex w-max gap-4 px-4 pt-6 pb-4 before:absolute before:inset-x-0 before:top-[calc(1.875rem-0.5px)] before:h-px before:bg-border lg:px-6"
            >
              {items}
            </ol>
          </div>
        ) : (
          <ol
            aria-label="Nodes"
            data-orientation="vertical"
            className="relative flex flex-col gap-4 py-4 pr-4 pl-10 before:absolute before:inset-y-0 before:left-[calc(1.5rem-0.5px)] before:w-px before:bg-border lg:pr-6 lg:pl-12 lg:before:left-[calc(2rem-0.5px)]"
          >
            {items}
          </ol>
        )}
      </SortableContext>
    </DndContext>
  )
}

function SortableNode({ node, orientation }: { node: TimelineNode; orientation: Orientation }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })
  // Translate only: cards differ in height, and scaling would distort them.
  const style = { transform: CSS.Translate.toString(transform), transition }
  const dragHandle = { ref: setActivatorNodeRef, ...attributes, ...listeners }

  if (orientation === 'horizontal') {
    return (
      <li
        ref={setNodeRef}
        style={style}
        data-dragging={isDragging || undefined}
        className={cn(
          'relative flex w-64 shrink-0 snap-start flex-col gap-3 md:w-72',
          isDragging && 'z-20',
        )}
      >
        <span
          aria-hidden="true"
          className="relative ml-4 size-3 rounded-full border-2 border-primary bg-background"
        />
        <NodeCard node={node} dragHandle={dragHandle} isDragging={isDragging} className="flex-1" />
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging || undefined}
      className={cn('relative max-w-2xl', isDragging && 'z-20')}
    >
      <span
        aria-hidden="true"
        className="absolute top-4 -left-[1.375rem] size-3 rounded-full border-2 border-primary bg-background"
      />
      <NodeCard node={node} dragHandle={dragHandle} isDragging={isDragging} />
    </li>
  )
}
