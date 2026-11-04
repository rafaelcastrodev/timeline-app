import { arrayMove } from '@dnd-kit/sortable'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { reorderNodes } from '@/db'
import type { TimelineNode } from '@/types/models'

/**
 * Keeps an optimistic order only while it is still ahead of the stored one: same node ids in a
 * different order. Returns `null` once the stored order caught up, or when nodes were added or
 * removed in the meantime (the pending order no longer applies).
 */
export function resolvePendingOrder(pending: string[] | null, stored: string[]): string[] | null {
  if (!pending || pending.length !== stored.length) return null
  const storedSet = new Set(stored)
  if (!pending.every((id) => storedSet.has(id))) return null
  return pending.some((id, index) => id !== stored[index]) ? pending : null
}

/** Moves `activeId` to the index of `overId`. Returns `null` when nothing changes. */
export function moveId(ids: string[], activeId: string, overId: string): string[] | null {
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  if (from === -1 || to === -1 || from === to) return null
  return arrayMove(ids, from, to)
}

/**
 * Manual node order with optimistic updates: `move` shows the new order at once and persists it
 * with `reorderNodes`. The optimistic order is dropped when the live query delivers the stored
 * order, or when the write fails (the stored order shows again, with an error toast).
 */
export function useNodeOrder(timelineId: string, nodes: TimelineNode[]) {
  const [pending, setPending] = useState<string[] | null>(null)
  const latestRequest = useRef(0)

  const storedIds = nodes.map((node) => node.id)
  const effective = resolvePendingOrder(pending, storedIds)
  // Clear a pending order that no longer applies, so a later external reorder is not overridden
  // by it (state adjustment during render, no effect needed).
  if (pending !== null && effective === null) setPending(null)

  const orderedNodes = useMemo(() => {
    if (!effective) return nodes
    const byId = new Map(nodes.map((node) => [node.id, node]))
    return effective.map((id) => byId.get(id)!)
  }, [effective, nodes])

  const ids = effective ?? storedIds

  function move(activeId: string, overId: string) {
    const next = moveId(ids, activeId, overId)
    if (!next) return
    const request = ++latestRequest.current
    setPending(next)
    reorderNodes(timelineId, next).catch((error: unknown) => {
      console.error(error)
      // An older request failing must not undo a newer optimistic order.
      if (request !== latestRequest.current) return
      setPending(null)
      toast.error('Could not save the new order. Try again.')
    })
  }

  return { orderedNodes, ids, move }
}
