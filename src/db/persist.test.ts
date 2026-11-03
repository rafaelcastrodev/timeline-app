import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './persist'

// jsdom has no `navigator.storage`; define it per test.
function mockStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

describe('requestPersistentStorage', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('returns false when the Storage API is unavailable', async () => {
    mockStorage(undefined)
    expect(await requestPersistentStorage()).toBe(false)
  })

  it('does not ask again when already persisted', async () => {
    const persist = vi.fn()
    mockStorage({ persisted: vi.fn().mockResolvedValue(true), persist })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('requests persistence and returns the result', async () => {
    mockStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    })
    expect(await requestPersistentStorage()).toBe(true)
  })

  it('returns false when the request throws', async () => {
    mockStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockRejectedValue(new Error('denied')),
    })
    expect(await requestPersistentStorage()).toBe(false)
  })
})
