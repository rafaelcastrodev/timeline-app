import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './dates'

const now = new Date('2026-06-15T12:00:00.000Z')
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString()

describe('formatRelativeTime', () => {
  it.each([
    [0, 'now'],
    [30, 'now'],
    [60, '1 minute ago'],
    [5 * 60, '5 minutes ago'],
    [2 * 3600, '2 hours ago'],
    [86400, 'yesterday'],
    [3 * 86400, '3 days ago'],
    [14 * 86400, '2 weeks ago'],
    [60 * 86400, '2 months ago'],
    [400 * 86400, 'last year'],
  ])('%i seconds ago -> %s', (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), now)).toBe(expected)
  })

  it('formats future times', () => {
    expect(formatRelativeTime(ago(-3600), now)).toBe('in 1 hour')
  })
})
