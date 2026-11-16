import { afterEach, describe, expect, it } from 'vitest'
import { focusIdAttribute, focusOrigin, pageHeadingProps, restoreFocus } from './focus'

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgPoint(focusId: string): SVGGElement {
  const point = document.createElementNS(SVG_NS, 'g')
  point.setAttribute('tabindex', '0')
  point.setAttribute(focusIdAttribute, focusId)
  return point
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('restoreFocus', () => {
  it('records and refocuses a focused SVG element', () => {
    const svg = document.createElementNS(SVG_NS, 'svg')
    const point = svgPoint('p1')
    svg.append(point)
    document.body.append(svg)
    point.focus()

    const origin = focusOrigin()
    expect(origin).toBe(point)
    document.body.focus()
    restoreFocus(origin)
    expect(document.activeElement).toBe(point)
  })

  it('focuses the element with the same focus id when the target was replaced', () => {
    const svg = document.createElementNS(SVG_NS, 'svg')
    const original = svgPoint('p1')
    svg.append(original)
    document.body.append(svg)

    const replacement = svgPoint('p1')
    original.replaceWith(replacement)
    restoreFocus(original)
    expect(document.activeElement).toBe(replacement)
  })

  it('falls back to the page heading when the target is gone', () => {
    const heading = document.createElement('h2')
    heading.tabIndex = pageHeadingProps.tabIndex
    heading.setAttribute('data-page-heading', '')
    document.body.append(heading)

    restoreFocus(svgPoint('missing'))
    expect(document.activeElement).toBe(heading)
  })
})
