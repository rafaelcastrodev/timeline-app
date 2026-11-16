import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import { createNode, createTimeline, getNode, listNodes } from '@/db'
import { advance, setupTestDatabase } from '@/test/db'

setupTestDatabase()

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(<RouterProvider router={router} />)
  return { router, user }
}

async function seed() {
  const timeline = await createTimeline({ title: 'Trip' })
  const node = await createNode(timeline.id, {
    title: 'Day **one**',
    description: '- pack\n- leave\n\nSee [map](https://example.com)',
  })
  advance()
  return { timeline, node }
}

const confirmDiscard = () => screen.findByRole('alertdialog', { name: 'Discard unsaved changes?' })
const noAlert = () => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

describe('node detail', () => {
  it('opens from the card in read mode and closes back to the timeline', async () => {
    const { timeline, node } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}`)

    const list = await screen.findByRole('list', { name: 'Nodes' })
    await user.click(within(list).getByRole('link', { name: 'Day one' }))

    const dialog = await screen.findByRole('dialog', { name: 'Day one' })
    expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}/nodes/${node.id}`)
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2)
    expect(within(dialog).getByRole('link', { name: 'map' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Closing went back in history instead of pushing the timeline again.
    expect(router.state.historyAction).toBe('POP')
  })

  it('shows not found for a missing node or a node of another timeline', async () => {
    const { node } = await seed()
    const other = await createTimeline({ title: 'Other' })
    renderAt(`/timelines/${other.id}/nodes/${node.id}`)
    expect(await screen.findByRole('dialog', { name: 'Node not found' })).toBeInTheDocument()
  })

  it('edits in place and returns to read mode after saving', async () => {
    const { timeline, node } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}/nodes/${node.id}`)

    const dialog = await screen.findByRole('dialog', { name: 'Day one' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))

    const form = await screen.findByRole('dialog', { name: 'Edit node' })
    const title = within(form).getByLabelText('Title')
    expect(title).toHaveFocus()
    expect(title).toHaveValue('Day **one**')
    expect(within(form).getByLabelText('Description')).toHaveValue(node.description)
    await user.clear(title)
    await user.type(title, 'Day *two*')
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    const read = await screen.findByRole('dialog', { name: 'Day two' })
    noAlert()
    expect(within(read).getByRole('button', { name: 'Edit' })).toHaveFocus()
    expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}/nodes/${node.id}`)
    const stored = await getNode(node.id)
    expect(stored).toMatchObject({ title: 'Day *two*', created_at: node.created_at })
    expect(stored!.updated_at).not.toBe(node.updated_at)
  })

  it('picks a card color in the edit form and colors the card', async () => {
    const { timeline, node } = await seed()
    const { user } = renderAt(`/timelines/${timeline.id}/nodes/${node.id}`)

    const dialog = await screen.findByRole('dialog', { name: 'Day one' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const form = await screen.findByRole('dialog', { name: 'Edit node' })
    const colors = within(form).getByRole('group', { name: 'Card color' })
    expect(within(colors).getAllByRole('radio')).toHaveLength(18)
    expect(within(colors).getByRole('radio', { name: 'Default' })).toBeChecked()

    await user.click(within(colors).getByRole('radio', { name: 'Indigo' }))
    expect(within(colors).getByRole('radio', { name: 'Indigo' })).toBeChecked()
    // The header previews the picked color before saving.
    const header = () => document.querySelector('[data-slot=route-dialog-header]')
    expect(header()).toHaveClass('[--node-color:var(--color-indigo-500)]', 'bg-(--node-tint)')
    // Selecting the active swatch again keeps it selected.
    await user.click(within(colors).getByRole('radio', { name: 'Indigo' }))
    expect(within(colors).getByRole('radio', { name: 'Indigo' })).toBeChecked()
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    await screen.findByRole('dialog', { name: 'Day one' })
    expect(await getNode(node.id)).toMatchObject({ color: 'indigo' })
    await waitFor(() => expect(header()).toHaveClass('[--node-color:var(--color-indigo-500)]'))
    await user.keyboard('{Escape}')
    const list = await screen.findByRole('list', { name: 'Nodes' })
    const card = within(list)
      .getByRole('link', { name: 'Day one' })
      .closest('[data-slot=node-card]')
    await waitFor(() => expect(card).toHaveAttribute('data-color', 'indigo'))
    expect(card).toHaveClass('[--node-color:var(--color-indigo-500)]', 'bg-(--node-tint)')
    const marker = card!.closest('li')!.querySelector('[data-slot=node-marker]')
    expect(marker).toHaveClass('[--node-color:var(--color-indigo-500)]', 'border-(--node-color)')
  })

  it('deletes the node after confirmation and closes', async () => {
    const { timeline, node } = await seed()
    await createNode(timeline.id, { title: 'Day two' })
    const { router, user } = renderAt(`/timelines/${timeline.id}/nodes/${node.id}`)

    const dialog = await screen.findByRole('dialog', { name: 'Day one' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    let confirm = await screen.findByRole('alertdialog', { name: 'Delete this node?' })
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    await waitFor(noAlert)
    expect(await getNode(node.id)).toBeDefined()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    confirm = await screen.findByRole('alertdialog', { name: 'Delete this node?' })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const remaining = await listNodes(timeline.id)
    expect(remaining).toMatchObject([{ title: 'Day two', position: 0 }])
    const list = await screen.findByRole('list', { name: 'Nodes' })
    await waitFor(() => expect(within(list).getAllByRole('heading', { level: 3 })).toHaveLength(1))
  })
})

describe('node create', () => {
  it('validates, creates the node at the end and closes', async () => {
    const { timeline } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}`)

    await user.click(await screen.findByRole('link', { name: 'Add node' }))
    const dialog = await screen.findByRole('dialog', { name: 'New node' })
    await user.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Title'), '  Day two  ')
    await user.type(within(dialog).getByLabelText('Description'), 'Rest')
    await user.click(within(dialog).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    noAlert()
    const nodes = await listNodes(timeline.id)
    expect(nodes).toHaveLength(2)
    expect(nodes[1]).toMatchObject({ title: 'Day two', description: 'Rest', position: 1 })
    const list = await screen.findByRole('list', { name: 'Nodes' })
    await waitFor(() => expect(within(list).getAllByRole('heading', { level: 3 })).toHaveLength(2))
  })
})

describe('node create color', () => {
  it('creates a node with the chosen color', async () => {
    const { timeline } = await seed()
    const { user } = renderAt(`/timelines/${timeline.id}/nodes/new`)
    const form = await screen.findByRole('dialog', { name: 'New node' })
    await user.type(within(form).getByLabelText('Title'), 'Colored')
    await user.click(within(form).getByRole('radio', { name: 'Emerald' }))
    await user.click(within(form).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const nodes = await listNodes(timeline.id)
    expect(nodes.at(-1)).toMatchObject({ title: 'Colored', color: 'emerald' })
  })
})

describe('node layer', () => {
  it('creates a node on the chosen layer and edits it', async () => {
    const { timeline } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}/nodes/new`)
    const form = await screen.findByRole('dialog', { name: 'New node' })
    await user.type(within(form).getByLabelText('Title'), 'Deep')
    const layer = within(form).getByRole('combobox', { name: 'Layer' })
    expect(layer).toHaveTextContent('1')
    await user.click(layer)
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['1', '2', '3', '4', '5'])
    await user.click(screen.getByRole('option', { name: '3' }))
    expect(layer).toHaveTextContent('3')
    await user.click(within(form).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const created = (await listNodes(timeline.id)).at(-1)!
    expect(created).toMatchObject({ title: 'Deep', layer: 3 })

    await act(() => router.navigate(`/timelines/${timeline.id}/nodes/${created.id}`))
    const dialog = await screen.findByRole('dialog', { name: 'Deep' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const edit = await screen.findByRole('dialog', { name: 'Edit node' })
    const editLayer = within(edit).getByRole('combobox', { name: 'Layer' })
    expect(editLayer).toHaveTextContent('3')
    await user.click(editLayer)
    await user.click(await screen.findByRole('option', { name: '5' }))
    await user.click(within(edit).getByRole('button', { name: 'Save' }))

    await screen.findByRole('dialog', { name: 'Deep' })
    expect(await getNode(created.id)).toMatchObject({ layer: 5 })
  })
})

describe('node severity', () => {
  it('creates a node with the chosen severity and edits it', async () => {
    const { timeline } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}/nodes/new`)
    const form = await screen.findByRole('dialog', { name: 'New node' })
    await user.type(within(form).getByLabelText('Title'), 'Critical')
    const severity = within(form).getByRole('combobox', { name: 'Severity' })
    expect(severity).toHaveTextContent('1')
    await user.click(severity)
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['1', '2', '3', '4', '5'])
    await user.click(screen.getByRole('option', { name: '4' }))
    expect(severity).toHaveTextContent('4')
    await user.click(within(form).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const created = (await listNodes(timeline.id)).at(-1)!
    expect(created).toMatchObject({ title: 'Critical', layer: 1, severity: 4 })

    await act(() => router.navigate(`/timelines/${timeline.id}/nodes/${created.id}`))
    const dialog = await screen.findByRole('dialog', { name: 'Critical' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const edit = await screen.findByRole('dialog', { name: 'Edit node' })
    const editSeverity = within(edit).getByRole('combobox', { name: 'Severity' })
    expect(editSeverity).toHaveTextContent('4')
    await user.click(editSeverity)
    await user.click(await screen.findByRole('option', { name: '2' }))
    await user.click(within(edit).getByRole('button', { name: 'Save' }))

    await screen.findByRole('dialog', { name: 'Critical' })
    expect(await getNode(created.id)).toMatchObject({ severity: 2 })
  })
})

describe('unsaved-changes guard', () => {
  it('asks before closing a dirty form with Esc, X and Cancel', async () => {
    const { timeline } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}`)
    await user.click(await screen.findByRole('link', { name: 'Add node' }))
    const dialog = await screen.findByRole('dialog', { name: 'New node' })
    await user.type(within(dialog).getByLabelText('Title'), 'Draft')

    for (const close of [
      () => user.keyboard('{Escape}'),
      () => user.click(within(dialog).getByRole('button', { name: 'Close' })),
      () => user.click(within(dialog).getByRole('button', { name: 'Cancel' })),
    ]) {
      await close()
      const confirm = await confirmDiscard()
      await user.click(within(confirm).getByRole('button', { name: 'Keep editing' }))
      await waitFor(noAlert)
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Title')).toHaveValue('Draft')
      expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}/nodes/new`)
    }

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(within(await confirmDiscard()).getByRole('button', { name: 'Discard' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await listNodes(timeline.id)).toHaveLength(1)
  })

  it('blocks history navigation while dirty until confirmed', async () => {
    const { timeline, node } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}`)
    await user.click(await screen.findByRole('link', { name: 'Day one' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Day one' })).getByRole('button', {
        name: 'Edit',
      }),
    )
    const form = await screen.findByRole('dialog', { name: 'Edit node' })
    await user.type(within(form).getByLabelText('Description'), ' more')

    await act(() => router.navigate(-1))
    await user.click(within(await confirmDiscard()).getByRole('button', { name: 'Keep editing' }))
    await waitFor(noAlert)
    expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}/nodes/${node.id}`)

    await act(() => router.navigate(-1))
    await user.click(within(await confirmDiscard()).getByRole('button', { name: 'Discard' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    expect(await getNode(node.id)).toMatchObject({ description: node.description })
  })

  it('cancel in the edit form confirms, then returns to read mode', async () => {
    const { timeline, node } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}/nodes/${node.id}`)
    const dialog = await screen.findByRole('dialog', { name: 'Day one' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const form = await screen.findByRole('dialog', { name: 'Edit node' })
    await user.type(within(form).getByLabelText('Title'), '!')
    await user.click(within(form).getByRole('button', { name: 'Cancel' }))
    await user.click(within(await confirmDiscard()).getByRole('button', { name: 'Discard' }))

    expect(await screen.findByRole('dialog', { name: 'Day one' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}/nodes/${node.id}`)
    expect(await getNode(node.id)).toMatchObject({ title: node.title })
  })

  it('does not ask when the form is clean', async () => {
    const { timeline, node } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}`)
    await user.click(await screen.findByRole('link', { name: 'Day one' }))
    const dialog = await screen.findByRole('dialog', { name: 'Day one' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const form = await screen.findByRole('dialog', { name: 'Edit node' })

    // Typing and reverting leaves the form clean.
    await user.type(within(form).getByLabelText('Title'), 'x')
    await user.keyboard('{Backspace}')
    await user.click(within(form).getByRole('button', { name: 'Cancel' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Day one' })).getByRole('button', {
        name: 'Edit',
      }),
    )
    await screen.findByRole('dialog', { name: 'Edit node' })
    await user.keyboard('{Escape}')

    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    noAlert()
    expect(await getNode(node.id)).toMatchObject({ updated_at: node.updated_at })
  })

  it('registers a beforeunload prompt only while dirty', async () => {
    const { timeline } = await seed()
    const { user } = renderAt(`/timelines/${timeline.id}/nodes/new`)
    const dialog = await screen.findByRole('dialog', { name: 'New node' })

    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(unload()).toBe(false)
    await user.type(within(dialog).getByLabelText('Title'), 'Draft')
    expect(unload()).toBe(true)
    await user.clear(within(dialog).getByLabelText('Title'))
    expect(unload()).toBe(false)
  })

  it('guards the timeline form too', async () => {
    const { timeline } = await seed()
    const { router, user } = renderAt(`/timelines/${timeline.id}`)
    await user.click(await screen.findByRole('button', { name: 'Timeline actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit timeline' })
    await user.type(within(dialog).getByLabelText('Title'), ' 2026')

    await user.keyboard('{Escape}')
    await user.click(within(await confirmDiscard()).getByRole('button', { name: 'Keep editing' }))
    await waitFor(noAlert)
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/timelines/${timeline.id}`))
    noAlert()
    expect(await screen.findByRole('heading', { name: 'Trip 2026' })).toBeInTheDocument()
  })
})
