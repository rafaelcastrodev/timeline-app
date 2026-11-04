import { readFile, writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { readRecords, seedRecords } from './seed.ts'

const AT = '2026-01-01T00:00:00.000Z'

async function seedTimeline(page: Page): Promise<string> {
  await page.goto('/')
  await expect(page.getByText('No timelines yet')).toBeVisible()
  const timelineId = crypto.randomUUID()
  await seedRecords(page, {
    timelines: [
      {
        id: timelineId,
        title: 'Road **trip**',
        description: 'Summer',
        orientation: 'horizontal',
        created_at: AT,
        updated_at: AT,
      },
    ],
    nodes: ['Leave', 'Drive', 'Arrive'].map((title, position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title,
      description: `${title} *notes*`,
      color: null,
      layer: 1,
      position,
      created_at: `2025-0${position + 1}-01T00:00:00.000Z`,
      updated_at: `2025-0${position + 4}-01T00:00:00.000Z`,
    })),
  })
  return timelineId
}

const cards = (page: Page) => page.getByRole('list', { name: 'Nodes' }).locator('> li')
const timelineActions = (page: Page) => page.getByRole('button', { name: 'Timeline actions' })

async function chooseFile(page: Page, open: () => Promise<void>, path: string) {
  const chooser = page.waitForEvent('filechooser')
  await open()
  await (await chooser).setFiles(path)
}

test('transfer: export, import as new, replace, invalid file', async ({ page }) => {
  const timelineId = await seedTimeline(page)
  await page.goto(`/timelines/${timelineId}`)
  await expect(cards(page)).toHaveCount(3)

  // Export.
  await timelineActions(page).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^timeline-road-trip-\d{8}\.json$/)
  const exportPath = test.info().outputPath(download.suggestedFilename())
  await download.saveAs(exportPath)
  const exported = JSON.parse(await readFile(exportPath, 'utf8')) as {
    format: string
    schema_version: number
    timeline: { id: string; title: string }
    nodes: Array<{ title: string; position: number; created_at: string }>
  }
  expect(exported).toMatchObject({
    format: 'timeline-app',
    schema_version: 1,
    timeline: { id: timelineId, title: 'Road **trip**' },
  })
  expect(exported.nodes.map((node) => [node.title, node.position])).toEqual([
    ['Leave', 0],
    ['Drive', 1],
    ['Arrive', 2],
  ])

  // Import as new from the dashboard.
  await page.goto('/')
  await chooseFile(
    page,
    () => page.getByRole('button', { name: 'Import timeline' }).click(),
    exportPath,
  )
  const preview = page.getByRole('alertdialog', { name: 'Import this timeline?' })
  await expect(preview).toContainText('Road trip')
  await expect(preview).toContainText('3 nodes')
  await page.screenshot({ path: test.info().outputPath('import-preview.png') })
  await preview.getByRole('button', { name: 'Import' }).click()
  await expect(preview).toBeHidden()
  await expect(page).not.toHaveURL(`/timelines/${timelineId}`)
  await expect(page).toHaveURL(/\/timelines\/[0-9a-f-]{36}$/)
  const importedId = page.url().split('/').pop()!
  await expect(page.getByRole('heading', { name: 'Road trip', level: 2 })).toBeVisible()
  await expect(cards(page)).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Nodes' })).toHaveAttribute(
    'data-orientation',
    'horizontal',
  )

  const afterImport = await readRecords(page)
  expect(afterImport.timelines).toHaveLength(2)
  const nodesOf = (records: typeof afterImport, id: string) =>
    records.nodes
      .filter((node) => node.timeline_id === id)
      .sort((a, b) => (a.position as number) - (b.position as number))
  const strip = (nodes: Array<Record<string, unknown>>) =>
    nodes.map(({ title, description, position, created_at, updated_at }) => ({
      title,
      description,
      position,
      created_at,
      updated_at,
    }))
  expect(strip(nodesOf(afterImport, importedId))).toEqual(strip(nodesOf(afterImport, timelineId)))

  // Replace the original timeline with an edited file.
  const replacement = {
    ...exported,
    timeline: { ...exported.timeline, title: 'Replaced', orientation: 'vertical' },
    nodes: exported.nodes.slice(0, 1),
  }
  const replacePath = test.info().outputPath('replacement.json')
  await writeFile(replacePath, JSON.stringify(replacement))
  await page.goto(`/timelines/${timelineId}`)
  await expect(cards(page)).toHaveCount(3)
  await timelineActions(page).click()
  await chooseFile(
    page,
    () => page.getByRole('menuitem', { name: 'Replace from file' }).click(),
    replacePath,
  )
  const confirm = page.getByRole('alertdialog', { name: 'Replace this timeline?' })
  await expect(confirm).toContainText('1 node')
  await confirm.getByRole('button', { name: 'Replace' }).click()
  await expect(confirm).toBeHidden()
  await expect(page).toHaveURL(`/timelines/${timelineId}`)
  await expect(page.getByRole('heading', { name: 'Replaced', level: 2 })).toBeVisible()
  await expect(cards(page)).toHaveCount(1)
  await expect(page.getByRole('list', { name: 'Nodes' })).toHaveAttribute(
    'data-orientation',
    'vertical',
  )
  const afterReplace = await readRecords(page)
  expect(afterReplace.timelines.find((t) => t.id === timelineId)).toMatchObject({
    title: 'Replaced',
    created_at: AT,
  })
  expect(nodesOf(afterReplace, importedId)).toHaveLength(3)

  // An invalid file shows an error and writes nothing.
  const invalidPath = test.info().outputPath('invalid.json')
  await writeFile(invalidPath, JSON.stringify({ ...exported, nodes: [{ title: 'x' }] }))
  await page.goto('/')
  await chooseFile(
    page,
    () => page.getByRole('button', { name: 'Import timeline' }).click(),
    invalidPath,
  )
  const error = page.getByRole('alertdialog', { name: 'Could not import the file' })
  await expect(error).toContainText('The file is invalid: nodes[0].id:')
  await page.screenshot({ path: test.info().outputPath('import-error.png') })
  await error.getByRole('button', { name: 'Close' }).click()
  await expect(error).toBeHidden()
  expect(await readRecords(page)).toEqual(afterReplace)
})
