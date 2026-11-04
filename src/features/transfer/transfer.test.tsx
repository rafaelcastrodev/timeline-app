import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { createNode, createTimeline, getTimeline, listNodes, listTimelines } from '@/db'
import { db } from '@/db/db'
import { setupTestDatabase } from '@/test/db'
import { jsonFile, makeTimelineFile } from '@/test/timeline-file'

setupTestDatabase()

afterEach(() => {
  vi.restoreAllMocks()
})

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(<RouterProvider router={router} />)
  return { router, user }
}

const fileInput = (mode: 'new' | 'replace' = 'new') =>
  screen.getByLabelText<HTMLInputElement>(
    mode === 'new' ? 'File to import' : 'File to replace with',
  )

async function snapshot() {
  return { timelines: await db.timelines.toArray(), nodes: await db.nodes.toArray() }
}

describe('import as new (dashboard)', () => {
  it('opens the file picker, previews the file and imports it', async () => {
    const { router, user } = renderApp()
    await screen.findByText('No timelines yet')
    const click = vi.spyOn(fileInput(), 'click')
    await user.click(screen.getByRole('button', { name: 'Import timeline' }))
    expect(click).toHaveBeenCalled()

    await user.upload(fileInput(), jsonFile(makeTimelineFile(2)))
    const dialog = await screen.findByRole('alertdialog', { name: 'Import this timeline?' })
    expect(within(dialog).getByText('trip').tagName).toBe('STRONG')
    expect(dialog).toHaveTextContent('Imported trip')
    expect(dialog).toHaveTextContent('2 nodes')
    expect(await listTimelines(10)).toEqual([])

    await user.click(within(dialog).getByRole('button', { name: 'Import' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    const [imported] = await listTimelines(10)
    expect(imported).toMatchObject({ title: 'Imported **trip**', orientation: 'horizontal' })
    expect(router.state.location.pathname).toBe(`/timelines/${imported!.id}`)
    expect(await screen.findByRole('list', { name: 'Nodes' })).toHaveAttribute(
      'data-orientation',
      'horizontal',
    )
    expect(await listNodes(imported!.id)).toHaveLength(2)
  })

  it('cancel after the preview writes nothing', async () => {
    const { router, user } = renderApp()
    await screen.findByText('No timelines yet')
    await user.upload(fileInput(), jsonFile(makeTimelineFile(1)))
    const dialog = await screen.findByRole('alertdialog', { name: 'Import this timeline?' })
    expect(dialog).toHaveTextContent('1 node ·')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await listTimelines(10)).toEqual([])
    expect(router.state.location.pathname).toBe('/')
  })

  it('rejects an invalid file with a readable error and writes nothing', async () => {
    const { user } = renderApp()
    await screen.findByText('No timelines yet')
    await user.upload(fileInput(), jsonFile('not json'))

    const dialog = await screen.findByRole('alertdialog', { name: 'Could not import the file' })
    expect(dialog).toHaveTextContent('The file is not valid JSON.')
    expect(await snapshot()).toEqual({ timelines: [], nodes: [] })

    // "Choose another file" opens the picker again from the click.
    const click = vi.spyOn(fileInput(), 'click')
    await user.click(within(dialog).getByRole('button', { name: 'Choose another file' }))
    expect(click).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    await user.upload(fileInput(), jsonFile(makeTimelineFile(1)))
    expect(
      await screen.findByRole('alertdialog', { name: 'Import this timeline?' }),
    ).toBeInTheDocument()
  })
})

describe('timeline menu: export and replace', () => {
  async function seed() {
    const target = await createTimeline({ title: 'Target', description: 'Old description' })
    await createNode(target.id, { title: 'Old node' })
    return target
  }

  async function openMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: 'Timeline actions' }))
  }

  it('exports the timeline as a JSON download', async () => {
    const target = await seed()
    let blob: Blob | undefined
    const createObjectURL = vi.fn((value: Blob) => {
      blob = value
      return 'blob:export'
    })
    // jsdom has no object URLs.
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const { user } = renderApp(`/timelines/${target.id}`)

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Export' }))

    await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce())
    const anchor = anchorClick.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.href).toBe('blob:export')
    expect(anchor.download).toMatch(/^timeline-target-\d{8}\.json$/)
    expect(anchor.isConnected).toBe(false)
    const exported = JSON.parse(await blob!.text()) as { timeline: unknown; nodes: unknown[] }
    expect(exported.timeline).toEqual(await getTimeline(target.id))
    expect(exported.nodes).toHaveLength(1)
  })

  it('replaces the timeline after confirmation, keeping its id', async () => {
    const target = await seed()
    const { router, user } = renderApp(`/timelines/${target.id}`)
    await screen.findByText('Old node')

    await openMenu(user)
    const click = vi.spyOn(fileInput('replace'), 'click')
    await user.click(screen.getByRole('menuitem', { name: 'Replace from file' }))
    expect(click).toHaveBeenCalled()
    await user.upload(fileInput('replace'), jsonFile(makeTimelineFile(3)))

    const dialog = await screen.findByRole('alertdialog', { name: 'Replace this timeline?' })
    expect(dialog).toHaveTextContent('This cannot be undone.')
    expect(dialog).toHaveTextContent('3 nodes')
    expect(await getTimeline(target.id)).toMatchObject({ title: 'Target' })

    await user.click(within(dialog).getByRole('button', { name: 'Replace' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('heading', { name: 'Imported trip', level: 2 })).toBeVisible()
    expect(screen.queryByText('Old node')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/timelines/${target.id}`)
    expect(await getTimeline(target.id)).toMatchObject({
      id: target.id,
      created_at: target.created_at,
      title: 'Imported **trip**',
    })
    expect((await listNodes(target.id)).map((node) => node.title)).toEqual([
      'Node 1',
      'Node 2',
      'Node 3',
    ])
  })

  it('shows a failed replace in the dialog and writes nothing', async () => {
    const target = await seed()
    const { user } = renderApp(`/timelines/${target.id}`)
    await screen.findByText('Old node')
    await user.upload(fileInput('replace'), jsonFile(makeTimelineFile(1)))
    const dialog = await screen.findByRole('alertdialog', { name: 'Replace this timeline?' })

    // The timeline disappears (e.g. deleted in another tab) before the user confirms.
    const before = await snapshot()
    vi.spyOn(db.timelines, 'get').mockResolvedValue(undefined)
    await user.click(within(dialog).getByRole('button', { name: 'Replace' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('timeline not found')
    vi.restoreAllMocks()
    expect(await snapshot()).toEqual(before)
  })
})
