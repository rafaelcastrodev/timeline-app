import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import { createNode, createTimeline, getTimeline } from '@/db'
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
    await createNode(timeline.id, {
      title: 'First **day**',
      description: 'Arrive [here](https://example.com)',
    })
    await createNode(timeline.id, { title: 'Second day' })
    renderTimeline(timeline.id)

    const list = await nodeList()
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByRole('heading', { level: 3 })).toHaveTextContent('First day')
    expect(within(items[0]!).getByText('day').tagName).toBe('STRONG')
    expect(items[0]).toHaveTextContent('Arrive here')
    // Cards are going to be clickable: no nested links.
    expect(within(list).queryByRole('link')).not.toBeInTheDocument()
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
})
