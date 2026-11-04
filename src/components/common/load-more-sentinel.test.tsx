import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MockIntersectionObserver } from '@/test/intersection-observer'
import { LoadMoreSentinel } from './load-more-sentinel'

describe('LoadMoreSentinel', () => {
  it('loads more only while visible and enabled', () => {
    const onLoadMore = vi.fn()
    const { rerender } = render(<LoadMoreSentinel enabled onLoadMore={onLoadMore} />)
    expect(onLoadMore).not.toHaveBeenCalled()

    act(() => MockIntersectionObserver.trigger(true))
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    // A new page arrived and the sentinel is still on screen: keep loading.
    rerender(<LoadMoreSentinel enabled={false} onLoadMore={onLoadMore} />)
    rerender(<LoadMoreSentinel enabled onLoadMore={onLoadMore} />)
    expect(onLoadMore).toHaveBeenCalledTimes(2)

    act(() => MockIntersectionObserver.trigger(false))
    rerender(<LoadMoreSentinel enabled={false} onLoadMore={onLoadMore} />)
    rerender(<LoadMoreSentinel enabled onLoadMore={onLoadMore} />)
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<LoadMoreSentinel enabled onLoadMore={() => {}} />)
    expect(MockIntersectionObserver.instances.size).toBe(1)
    unmount()
    expect(MockIntersectionObserver.instances.size).toBe(0)
  })
})
