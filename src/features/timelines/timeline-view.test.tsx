import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import { createNode, createTimeline, getTimeline, updateNode } from '@/db'
import { setupTestDatabase } from '@/test/db'

setupTestDatabase()

function renderTimeline(timelineId: string) {
  const router = createMemoryRouter(routes, { initialEntries: [`/timelines/${timelineId}`] })
  const user = userEvent.setup()
  render(<RouterProvider router={router} />)
  return { router, user }
}

const nodeList = () => screen.findByRole('list', { name: 'Nodes' })

describe('timeline view', () => {
  it('shows the empty state with an add action when there are no nodes', async () => {
    const timeline = await createTimeline({ title: 'Empty' })
    renderTimeline(timeline.id)

    expect(await screen.findByText('No nodes yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add first node' })).toHaveAttribute(
      'href',
      `/timelines/${timeline.id}/nodes/new`,
    )
    expect(screen.getByRole('link', { name: 'Add node' })).toHaveAttribute(
      'href',
      `/timelines/${timeline.id}/nodes/new`,
    )
    expect(screen.queryByRole('list', { name: 'Nodes' })).not.toBeInTheDocument()
  })

  it('renders node cards in position order with inline title and excerpt', async () => {
    const timeline = await createTimeline({ title: 'Trip' })
    const nodes = [
      await createNode(timeline.id, {
        title: 'First **day**',
        description: 'Arrive [here](https://example.com)',
      }),
      await createNode(timeline.id, { title: 'Second day' }),
    ]
    renderTimeline(timeline.id)

    const list = await nodeList()
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByRole('heading', { level: 3 })).toHaveTextContent('First day')
    expect(within(items[0]!).getByText('day').tagName).toBe('STRONG')
    expect(items[0]).toHaveTextContent('Arrive here')
    // Each card has one link (its title) to the node detail; Markdown links render as text.
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(nodes.map((node) => `/timelines/${timeline.id}/nodes/${node.id}`))
    expect(within(items[1]!).getByRole('heading', { level: 3 })).toHaveTextContent('Second day')
    expect(items[1]!.querySelector('[data-slot="markdown-excerpt"]')).toBeNull()
    expect(items[0]!.querySelector('[data-slot="drag-handle"]')).not.toBeNull()
  })

  it('renders the layout stored on the timeline', async () => {
    const timeline = await createTimeline({ title: 'Wide', orientation: 'horizontal' })
    await createNode(timeline.id, { title: 'Only' })
    renderTimeline(timeline.id)

    expect(await nodeList()).toHaveAttribute('data-orientation', 'horizontal')
    expect(screen.getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('persists the orientation chosen in the header', async () => {
    const timeline = await createTimeline({ title: 'Switch' })
    await createNode(timeline.id, { title: 'Node' })
    const { user } = renderTimeline(timeline.id)

    expect(await nodeList()).toHaveAttribute('data-orientation', 'vertical')
    const group = screen.getByRole('radiogroup', { name: 'Orientation' })
    await user.click(within(group).getByRole('radio', { name: 'Horizontal' }))

    await waitFor(async () =>
      expect(await getTimeline(timeline.id)).toMatchObject({ orientation: 'horizontal' }),
    )
    await waitFor(async () =>
      expect(await nodeList()).toHaveAttribute('data-orientation', 'horizontal'),
    )

    // Clicking the active item again keeps the orientation.
    await user.click(within(group).getByRole('radio', { name: 'Horizontal' }))
    expect(within(group).getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(await getTimeline(timeline.id)).toMatchObject({ orientation: 'horizontal' })
  })

  it('has no layer focus button while every node is on one layer', async () => {
    const timeline = await createTimeline({ title: 'Flat' })
    await createNode(timeline.id, { title: 'A', layer: 2 })
    await createNode(timeline.id, { title: 'B', layer: 2 })
    renderTimeline(timeline.id)

    const items = within(await nodeList()).getAllByRole('listitem')
    expect(items.every((item) => !item.hasAttribute('data-dimmed'))).toBe(true)
    expect(screen.queryByRole('button', { name: /^Focused layer/ })).not.toBeInTheDocument()
  })

  it('focuses the lowest layer and cycles through the layers in use, dimming the others', async () => {
    const timeline = await createTimeline({ title: 'Plot' })
    await createNode(timeline.id, { title: 'Main', layer: 1 })
    await createNode(timeline.id, { title: 'Side', layer: 4 })
    await createNode(timeline.id, { title: 'Echo', layer: 2 })
    const { user } = renderTimeline(timeline.id)

    const dimmed = async () =>
      within(await nodeList())
        .getAllByRole('listitem')
        .filter((item) => item.hasAttribute('data-dimmed'))
        .map((item) => within(item).getByRole('heading', { level: 3 }).textContent)

    await waitFor(async () => expect(await dimmed()).toEqual(['Side', 'Echo']))
    const button = screen.getByRole('button', { name: 'Focused layer 1' })
    expect(button).toHaveAttribute('title', 'Switch to layer 2')

    await user.click(button)
    expect(button).toHaveAccessibleName('Focused layer 2')
    expect(await dimmed()).toEqual(['Main', 'Side'])

    await user.click(button)
    expect(button).toHaveAccessibleName('Focused layer 4')
    expect(await dimmed()).toEqual(['Main', 'Echo'])

    await user.click(button)
    expect(button).toHaveAccessibleName('Focused layer 1')
    expect(await dimmed()).toEqual(['Side', 'Echo'])
  })

  it('falls back to the lowest layer when the focused layer is no longer used', async () => {
    const timeline = await createTimeline({ title: 'Shrink' })
    await createNode(timeline.id, { title: 'Main', layer: 1 })
    const side = await createNode(timeline.id, { title: 'Side', layer: 3 })
    await createNode(timeline.id, { title: 'Other', layer: 5 })
    const { user } = renderTimeline(timeline.id)

    await user.click(await screen.findByRole('button', { name: 'Focused layer 1' }))
    expect(screen.getByRole('button', { name: 'Focused layer 3' })).toBeInTheDocument()
    await updateNode(side.id, { layer: 1 })

    expect(await screen.findByRole('button', { name: 'Focused layer 1' })).toBeInTheDocument()
  })
})
