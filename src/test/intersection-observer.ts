/** Minimal IntersectionObserver for jsdom. Call `trigger` to simulate visibility changes. */
export class MockIntersectionObserver implements IntersectionObserver {
  static instances = new Set<MockIntersectionObserver>()

  readonly root = null
  readonly rootMargin: string
  readonly thresholds = [0]
  readonly scrollMargin = '0px'
  private readonly elements = new Set<Element>()
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.rootMargin = options?.rootMargin ?? '0px'
    MockIntersectionObserver.instances.add(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
    MockIntersectionObserver.instances.delete(this)
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  /** Reports every observed element as (not) intersecting. */
  static trigger(isIntersecting: boolean) {
    for (const observer of MockIntersectionObserver.instances) {
      const entries = [...observer.elements].map(
        (target) => ({ target, isIntersecting }) as IntersectionObserverEntry,
      )
      if (entries.length > 0) observer.callback(entries, observer)
    }
  }
}
