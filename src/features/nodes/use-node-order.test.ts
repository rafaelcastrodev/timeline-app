import { describe, expect, it } from 'vitest'
import { moveId, resolvePendingOrder } from './use-node-order'

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
