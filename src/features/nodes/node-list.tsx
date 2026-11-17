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
import { PlusIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { severityLabel, type NodeLayer, type Orientation, type TimelineNode } from '@/types/models'
import { NodeCard } from './node-card'
import { markerClasses, nodeColorClasses } from './node-colors'
import { nodeInsertPath } from './node-insert'
import { useNodeOrder } from './use-node-order'

interface NodeListProps {
  timelineId: string
  nodes: TimelineNode[]
  orientation: Orientation
  /** Nodes of other layers are dimmed. */
  focusedLayer?: NodeLayer
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
 * with snap points (snapping is off while dragging so auto-scroll is not pulled back). Nodes
 * outside the focused layer are dimmed, back to full opacity while hovered, focused or dragged.
 * The gap between two cards holds an "insert node" link that inserts a node at that place; it
 * shows on hover and keyboard focus, always on touch screens, and is removed while dragging.
 */
export function NodeList({ timelineId, nodes, orientation, focusedLayer }: NodeListProps) {
  const { orderedNodes, ids, move } = useNodeOrder(timelineId, nodes)
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

  const items = orderedNodes.map((node, index) => (
    <SortableNode
      key={node.id}
      node={node}
      orientation={orientation}
      dimmed={focusedLayer !== undefined && node.layer !== focusedLayer}
      // The first card has no gap before it; "+ Node" appends after the last one.
      insertPosition={index > 0 && !dragging ? index + 1 : null}
    />
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
              className="relative isolate flex w-max gap-8 px-4 pt-5 pb-4 before:absolute before:inset-x-0 before:top-[calc(1.875rem-0.5px)] before:h-px before:bg-border lg:px-6"
            >
              {items}
            </ol>
          </div>
        ) : (
          <ol
            aria-label="Nodes"
            data-orientation="vertical"
            className="relative isolate flex flex-col gap-10 py-4 pr-4 pl-10 before:absolute before:inset-y-0 before:left-[calc(1.5rem-0.5px)] before:w-px before:bg-border lg:pr-6 lg:pl-12 lg:before:left-[calc(2rem-0.5px)]"
          >
            {items}
          </ol>
        )}
      </SortableContext>
    </DndContext>
  )
}

interface SortableNodeProps {
  node: TimelineNode
  orientation: Orientation
  dimmed: boolean
  /** 1-based position a node inserted from the gap before this card gets; null: no insert button. */
  insertPosition: number | null
}

// Dimming applies to the card and its marker, not to the insert button in the gap before them.
const dimmedClasses = 'opacity-40 focus-within:opacity-100 hover:opacity-100'

function SortableNode({ node, orientation, dimmed, insertPosition }: SortableNodeProps) {
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
  const itemProps = {
    ref: setNodeRef,
    style,
    'data-dragging': isDragging || undefined,
    'data-layer': node.layer,
    'data-dimmed': dimmed || undefined,
  }
  const contentClasses = cn('transition-opacity', dimmed && !isDragging && dimmedClasses)
  const insert = insertPosition !== null && (
    <InsertNodeGap node={node} position={insertPosition} orientation={orientation} />
  )

  if (orientation === 'horizontal') {
    return (
      <li
        {...itemProps}
        className={cn(
          'relative flex w-64 shrink-0 snap-start flex-col md:w-72',
          isDragging && 'z-20',
        )}
      >
        {insert}
        <div data-slot="node-item" className={cn('flex flex-1 flex-col gap-3', contentClasses)}>
          <NodeMarker node={node} className="relative ml-3" />
          <NodeCard
            node={node}
            dragHandle={dragHandle}
            isDragging={isDragging}
            className="flex-1"
          />
        </div>
      </li>
    )
  }

  return (
    <li {...itemProps} className={cn('relative max-w-2xl', isDragging && 'z-20')}>
      {insert}
      <div data-slot="node-item" className={cn('relative', contentClasses)}>
        <NodeMarker node={node} className="absolute top-3 -left-[1.625rem]" />
        <NodeCard node={node} dragHandle={dragHandle} isDragging={isDragging} />
      </div>
    </li>
  )
}

/**
 * Hover area covering the gap before a card, with a round "+" link on the timeline line that
 * opens the node form inserting at this place. The link is invisible until the gap is hovered or
 * the link has keyboard focus; on coarse pointers (no hover) it is always visible. While shown, a
 * dashed guide marks the gap. Named by position (titles are Markdown), like the drag announcements.
 */
function InsertNodeGap({
  node,
  position,
  orientation,
}: {
  node: TimelineNode
  position: number
  orientation: Orientation
}) {
  const horizontal = orientation === 'horizontal'
  return (
    <div
      data-slot="node-insert"
      className={cn(
        'group/insert absolute before:pointer-events-none before:absolute before:border-dashed before:border-primary/40 before:opacity-0 before:transition-opacity hover:before:opacity-100 has-focus-visible:before:opacity-100',
        horizontal
          ? // The gap left of the card (gap-8); the line runs 0.625rem below the item's top.
            'inset-y-0 right-full w-8 before:top-8 before:bottom-0 before:left-[calc(50%-1px)] before:border-l-2'
          : // The gap above the card (gap-10), widened over the list's left padding to the line.
            'right-0 bottom-full -left-10 h-10 before:top-[calc(50%-1px)] before:right-0 before:left-10 before:border-t-2 lg:-left-12 lg:before:left-12',
      )}
    >
      <Button
        asChild
        variant="outline"
        size="icon-xs"
        className={cn(
          'absolute rounded-full text-muted-foreground opacity-0 transition-opacity group-hover/insert:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
          horizontal ? '-top-0.5 left-1' : 'top-2 left-3 lg:left-5',
        )}
      >
        <Link
          to={nodeInsertPath(node.timeline_id, node.id)}
          aria-label={`Insert node at position ${position}`}
        >
          <PlusIcon aria-hidden="true" />
        </Link>
      </Button>
    </div>
  )
}

/**
 * Dot on the timeline line, in the node's card color when it has one, showing the node's severity
 * as a number (named for screen readers, e.g. "Severity 4 (Mid)").
 */
function NodeMarker({ node, className }: { node: TimelineNode; className: string }) {
  const color = node.color ? nodeColorClasses[node.color] : null
  return (
    <span
      data-slot="node-marker"
      data-severity={node.severity}
      className={cn(
        'flex size-5 items-center justify-center rounded-full border-2 text-[0.625rem] leading-none font-semibold text-foreground tabular-nums select-none',
        color ? [color.vars, markerClasses] : 'border-primary bg-background',
        className,
      )}
    >
      <span aria-hidden="true">{node.severity}</span>
      <span className="sr-only">Severity {severityLabel(node.severity)}</span>
    </span>
  )
}
