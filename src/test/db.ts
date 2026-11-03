import { afterEach, beforeEach, vi } from 'vitest'
import { db } from '@/db/db'

/** Clears all tables before each test and controls `Date` so timestamps are deterministic. */
export function setupTestDatabase(start = '2026-01-01T00:00:00.000Z') {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(start))
    await Promise.all(db.tables.map((table) => table.clear()))
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

/** Moves the fake clock forward. */
export function advance(ms = 1000) {
  vi.setSystemTime(new Date(Date.now() + ms))
}
