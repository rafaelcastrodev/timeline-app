import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { MockIntersectionObserver } from './intersection-observer'

// jsdom has no IntersectionObserver. Tests drive it through `MockIntersectionObserver`.
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

afterEach(() => {
  cleanup()
  MockIntersectionObserver.instances.clear()
})
