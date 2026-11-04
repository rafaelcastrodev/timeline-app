import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { createNode, createTimeline, getTimeline, listNodes, listTimelines } from '@/db'
import { TIMELINE_PAGE_SIZE } from '@/features/timelines/timeline-list-pane'
import { advance, setupTestDatabase } from '@/test/db'
import { MockIntersectionObserver } from '@/test/intersection-observer'
import { routes } from './routes'

setupTestDatabase()

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(<RouterProvider router={router} />)
  return { router, user }
}

const listPane = () => screen.getByRole('complementary', { name: 'Timelines' })
const listItems = () => within(listPane()).queryAllByRole('listitem')

describe('dashboard', () => {
  it('shows the empty state when there are no timelines', async () => {
    renderApp()
    expect(await within(listPane()).findByText('No timelines yet')).toBeInTheDocument()
  })

  it('creates a timeline, validating the title', async () => {
    const { router, user } = renderApp()
    await user.click(await screen.findByRole('link', { name: 'New timeline' }))

    const dialog = await screen.findByRole('dialog', { name: 'New timeline' })
    await user.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument()
    expect(await listTimelines(10)).toEqual([])

    await user.type(within(dialog).getByLabelText('Title'), '  **Trip**  ')
    await user.type(within(dialog).getByLabelText('Description'), 'Day one')
    await user.click(within(dialog).getByRole('radio', { name: 'Horizontal' }))
    await user.click(within(dialog).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [created] = await listTimelines(10)
    expect(created).toMatchObject({
      title: '**Trip**',
      description: 'Day one',
      orientation: 'horizontal',
    })
    expect(router.state.location.pathname).toBe(`/timelines/${created!.id}`)
    expect(await screen.findByRole('heading', { name: 'Trip' })).toBeInTheDocument()
    expect(within(listPane()).getByRole('link', { name: /Trip/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('cancel closes the create dialog after confirming and writes nothing', async () => {
    const { router, user } = renderApp()
    await user.click(await screen.findByRole('link', { name: 'New timeline' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Title'), 'Draft')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Discard unsaved changes?' })
    await user.click(within(confirm).getByRole('button', { name: 'Discard' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await listTimelines(10)).toEqual([])
  })

  it('lists timelines by recent activity with node count', async () => {
    const older = await createTimeline({ title: 'Older', description: 'Excerpt text' })
    await createNode(older.id, { title: 'n1' })
    await createNode(older.id, { title: 'n2' })
    advance()
    await createTimeline({ title: 'Newer' })

    renderApp()
    await waitFor(() => expect(listItems()).toHaveLength(2))
    const [first, second] = listItems()
    expect(first).toHaveTextContent('Newer')
    expect(await within(first!).findByText(/0 nodes/)).toBeInTheDocument()
    expect(second).toHaveTextContent('Older')
    expect(second).toHaveTextContent('Excerpt text')
    expect(await within(second!).findByText(/2 nodes/)).toBeInTheDocument()
  })

  it('loads the next page when the end of the list is visible', async () => {
    const total = TIMELINE_PAGE_SIZE + 5
    for (let i = 0; i < total; i++) {
      await createTimeline({ title: `Timeline ${i}` })
      advance()
    }

    renderApp()
    await waitFor(() => expect(listItems()).toHaveLength(TIMELINE_PAGE_SIZE))
    act(() => MockIntersectionObserver.trigger(true))
    await waitFor(() => expect(listItems()).toHaveLength(total))
  })

  it('edits a timeline', async () => {
    const timeline = await createTimeline({ title: 'Before', description: 'Keep me' })
    const { router, user } = renderApp(`/timelines/${timeline.id}`)

    await user.click(await screen.findByRole('button', { name: 'Timeline actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit timeline' })
    const title = within(dialog).getByLabelText('Title')
    expect(title).toHaveValue('Before')
    await user.clear(title)
    await user.type(title, 'After')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    expect(await screen.findByRole('heading', { name: 'After' })).toBeInTheDocument()
    expect(await getTimeline(timeline.id)).toMatchObject({
      title: 'After',
      description: 'Keep me',
      created_at: timeline.created_at,
    })
  })

  it('deletes a timeline after confirmation', async () => {
    const timeline = await createTimeline({ title: 'Doomed' })
    await createNode(timeline.id, { title: 'n1' })
    const { router, user } = renderApp(`/timelines/${timeline.id}`)

    const openDelete = async () => {
      await user.click(await screen.findByRole('button', { name: 'Timeline actions' }))
      await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
      return screen.findByRole('alertdialog', { name: 'Delete this timeline?' })
    }

    await user.click(within(await openDelete()).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await getTimeline(timeline.id)).toBeDefined()

    await user.click(within(await openDelete()).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await getTimeline(timeline.id)).toBeUndefined()
    expect(await listNodes(timeline.id)).toEqual([])
    expect(await within(listPane()).findByText('No timelines yet')).toBeInTheDocument()
  })

  it('shows not found for a missing timeline', async () => {
    renderApp(`/timelines/${crypto.randomUUID()}`)
    expect(await screen.findByText('Timeline not found')).toBeInTheDocument()
  })

  it('hides the list on small screens while a timeline is selected', async () => {
    const timeline = await createTimeline({ title: 'Selected' })
    renderApp(`/timelines/${timeline.id}`)
    await screen.findByRole('heading', { name: 'Selected' })
    // `hidden` applies below `lg`; `lg:flex` restores it on desktop.
    expect(document.querySelector('aside')).toHaveClass('hidden')
    expect(document.querySelector('main')).not.toHaveClass('hidden')
  })
})
