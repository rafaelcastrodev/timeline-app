import { act, renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { createNode, createTimeline, deleteNode, listNodes } from '@/db'
import { setupTestDatabase } from '@/test/db'
import { moveId, resolvePendingOrder, useNodeOrder } from './use-node-order'

setupTestDatabase()

describe('moveId', () => {
  it('moves an id forward and backward', () => {
    expect(moveId(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
    expect(moveId(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns null when nothing changes or an id is unknown', () => {
    expect(moveId(['a', 'b'], 'a', 'a')).toBeNull()
    expect(moveId(['a', 'b'], 'x', 'a')).toBeNull()
    expect(moveId(['a', 'b'], 'a', 'x')).toBeNull()
  })
})

describe('resolvePendingOrder', () => {
  it('keeps a pending order that differs from the stored one', () => {
    expect(resolvePendingOrder(['b', 'a', 'c'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
  })

  it('drops the pending order once the stored order caught up', () => {
    expect(resolvePendingOrder(['b', 'a'], ['b', 'a'])).toBeNull()
  })

  it('drops the pending order when nodes were added or removed', () => {
    expect(resolvePendingOrder(['b', 'a'], ['a', 'b', 'c'])).toBeNull()
    expect(resolvePendingOrder(['b', 'a', 'c'], ['a', 'b'])).toBeNull()
    expect(resolvePendingOrder(['b', 'a'], ['a', 'c'])).toBeNull()
  })

  it('returns null without a pending order', () => {
    expect(resolvePendingOrder(null, ['a'])).toBeNull()
  })
})

describe('useNodeOrder', () => {
  it('shows the new order at once and persists it', async () => {
    const timeline = await createTimeline({ title: 'T' })
    const a = await createNode(timeline.id, { title: 'a' })
    const b = await createNode(timeline.id, { title: 'b' })
    const { result } = renderHook(() => useNodeOrder(timeline.id, [a, b]))

    act(() => result.current.move(a.id, b.id))
    expect(result.current.ids).toEqual([b.id, a.id])
    await waitFor(async () =>
      expect((await listNodes(timeline.id)).map((node) => node.id)).toEqual([b.id, a.id]),
    )
  })

  it('restores the stored order and shows an error toast when saving fails', async () => {
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const timeline = await createTimeline({ title: 'T' })
    const a = await createNode(timeline.id, { title: 'a' })
    const b = await createNode(timeline.id, { title: 'b' })
    // The stored nodes no longer match the list, so the reorder is rejected.
    await deleteNode(b.id)
    const { result } = renderHook(() => useNodeOrder(timeline.id, [a, b]))

    act(() => result.current.move(a.id, b.id))
    expect(result.current.ids).toEqual([b.id, a.id])
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Could not save the new order. Try again.'),
    )
    expect(result.current.ids).toEqual([a.id, b.id])
  })
})
