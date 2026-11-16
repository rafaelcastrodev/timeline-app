/** Connected and rendered (not inside `display: none`, e.g. the pane hidden on small screens). */
export function isVisible(element: Element): boolean {
  if (!element.isConnected) return false
  // jsdom has no `checkVisibility`; treat connected elements as visible there.
  return typeof element.checkVisibility !== 'function' || element.checkVisibility()
}

/** Marks a view's main heading as the place focus goes when it has nowhere better to go. */
export const pageHeadingProps = { tabIndex: -1, 'data-page-heading': '' } as const

function findPageHeading(): HTMLElement | undefined {
  const headings = Array.from(document.querySelectorAll<HTMLElement>('[data-page-heading]'))
  // The detail pane comes after the list pane in the DOM.
  return headings.filter(isVisible).at(-1)
}

/**
 * Focuses the heading of the innermost visible view: the timeline when one is shown, else the
 * timeline list. Used when the element that had focus is gone or hidden.
 */
export function focusPageHeading(): void {
  findPageHeading()?.focus()
}

/**
 * Like `focusPageHeading`, but when no heading is rendered yet (the view is still loading), waits
 * up to `timeoutMs` for one and focuses it if focus is still lost by then. Returns a function that
 * stops waiting.
 */
export function focusPageHeadingWhenReady(timeoutMs = 2000): () => void {
  const heading = findPageHeading()
  if (heading) {
    heading.focus()
    return () => {}
  }
  const observer = new MutationObserver(() => {
    const found = findPageHeading()
    if (!found) return
    stop()
    if (isFocusLost()) found.focus()
  })
  const timer = setTimeout(stop, timeoutMs)
  function stop() {
    observer.disconnect()
    clearTimeout(timer)
  }
  observer.observe(document.body, { childList: true, subtree: true })
  return stop
}

/** A focusable element: HTML, or SVG (e.g. the points of the severity chart). */
export type FocusableElement = HTMLElement | SVGElement

/**
 * The element focus should return to when an overlay opened now closes: the focused element, or,
 * for an item of a dropdown menu (which closes with the menu), the menu's trigger.
 */
export function focusOrigin(): FocusableElement | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement || active instanceof SVGElement) || active === document.body)
    return null
  const triggerId = active.closest('[role="menu"]')?.getAttribute('aria-labelledby')
  return (triggerId && document.getElementById(triggerId)) || active
}

/**
 * Identifies a focusable element across remounts. Set it on elements a library may recreate while
 * a dialog is open (chart points), so focus returns to the element that replaced the opener.
 */
export const focusIdAttribute = 'data-focus-id'

function currentElement(target: FocusableElement): FocusableElement | null {
  if (target.isConnected) return target
  const focusId = target.getAttribute(focusIdAttribute)
  if (!focusId) return null
  return document.querySelector<HTMLElement | SVGElement>(
    `[${focusIdAttribute}="${CSS.escape(focusId)}"]`,
  )
}

/**
 * Focuses `target` (or the element with the same focus id that replaced it) if it is still
 * visible, else the page heading.
 */
export function restoreFocus(target: FocusableElement | null): void {
  const element = target && currentElement(target)
  if (element && isVisible(element)) element.focus()
  else focusPageHeading()
}

/** True when focus is lost: on `<body>`, or on an element that is gone or hidden. */
export function isFocusLost(): boolean {
  const active = document.activeElement
  return !active || active === document.body || !isVisible(active)
}
