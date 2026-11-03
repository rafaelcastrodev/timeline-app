import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { advance, setupTestDatabase } from '@/test/db'
import { useNode, useNodes, useTimeline, useTimelineCount, useTimelines } from './hooks'
import { createNode, reorderNodes } from './nodes'
import { createTimeline, updateTimeline } from './timelines'

setupTestDatabase()

describe('live query hooks', () => {
  it('useTimelines reacts to writes and re-sorts by updated_at', async () => {
    const a = await createTimeline({ title: 'A' })
    advance()
    const b = await createTimeline({ title: 'B' })
    const { result } = renderHook(() => useTimelines(10))
    await waitFor(() => expect(result.current?.map((t) => t.id)).toEqual([b.id, a.id]))

    advance()
    await act(() => updateTimeline(a.id, { title: 'A2' }))
    await waitFor(() => expect(result.current?.map((t) => t.id)).toEqual([a.id, b.id]))
  })

  it('useTimelines respects the limit', async () => {
    for (const title of ['A', 'B', 'C']) await createTimeline({ title })
    const { result, rerender } = renderHook(({ limit }) => useTimelines(limit), {
      initialProps: { limit: 2 },
    })
    await waitFor(() => expect(result.current).toHaveLength(2))
    rerender({ limit: 20 })
    await waitFor(() => expect(result.current).toHaveLength(3))
  })

  it('useTimelineCount counts timelines', async () => {
    await createTimeline({ title: 'A' })
    const { result } = renderHook(() => useTimelineCount())
    await waitFor(() => expect(result.current).toBe(1))
  })

  it('useTimeline returns null for a missing record', async () => {
    const { result } = renderHook(() => useTimeline(crypto.randomUUID()))
    await waitFor(() => expect(result.current).toBeNull())
  })

  it('useNodes follows the manual order', async () => {
    const timeline = await createTimeline({ title: 'T' })
    const a = await createNode(timeline.id, { title: 'a' })
    const b = await createNode(timeline.id, { title: 'b' })
    const { result } = renderHook(() => useNodes(timeline.id))
    await waitFor(() => expect(result.current?.map((n) => n.title)).toEqual(['a', 'b']))

    await act(() => reorderNodes(timeline.id, [b.id, a.id]))
    await waitFor(() => expect(result.current?.map((n) => n.title)).toEqual(['b', 'a']))
  })

  it('useNode returns the node', async () => {
    const timeline = await createTimeline({ title: 'T' })
    const node = await createNode(timeline.id, { title: 'a' })
    const { result } = renderHook(() => useNode(node.id))
    await waitFor(() => expect(result.current).toEqual(node))
  })
})
