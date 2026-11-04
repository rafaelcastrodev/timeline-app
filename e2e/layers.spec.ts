import { expect, test, type Locator, type Page } from '@playwright/test'
import { readRecords, seedRecords } from './seed.ts'

const AT = '2026-01-01T00:00:00.000Z'

async function seed(page: Page): Promise<string> {
  await page.goto('/')
  await expect(page.getByText('No timelines yet')).toBeVisible()
  const timelineId = crypto.randomUUID()
  await seedRecords(page, {
    timelines: [
      {
        id: timelineId,
        title: 'Plot',
        description: '',
        orientation: 'vertical',
        created_at: AT,
        updated_at: AT,
      },
    ],
    nodes: (
      [
        ['Main', 1],
        ['Side', 3],
      ] as const
    ).map(([title, layer], position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title,
      description: `${title} notes`,
      color: null,
      layer,
      position,
      created_at: AT,
      updated_at: AT,
    })),
  })
  return timelineId
}

const item = (page: Page, title: string) =>
  page
    .getByRole('list', { name: 'Nodes' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, level: 3 }) })

const opacity = (locator: Locator) =>
  locator.evaluate((element) => Number(getComputedStyle(element).opacity))

test('layer focus dims the other layers and switches between the layers in use', async ({
  page,
}) => {
  const timelineId = await seed(page)
  await page.goto(`/timelines/${timelineId}`)

  const button = page.getByRole('button', { name: 'Focused layer 1' })
  await expect(button).toBeVisible()
  await expect.poll(() => opacity(item(page, 'Main'))).toBe(1)
  await expect.poll(() => opacity(item(page, 'Side'))).toBe(0.4)

  await button.click()
  await expect(page.getByRole('button', { name: 'Focused layer 3' })).toBeVisible()
  await expect.poll(() => opacity(item(page, 'Main'))).toBe(0.4)
  await expect.poll(() => opacity(item(page, 'Side'))).toBe(1)

  // A dimmed node is shown at full opacity while its drag handle has keyboard focus.
  await item(page, 'Main').getByRole('button', { name: 'Reorder Main' }).focus()
  await expect.poll(() => opacity(item(page, 'Main'))).toBe(1)

  await page.getByRole('button', { name: 'Focused layer 3' }).click()
  await expect(page.getByRole('button', { name: 'Focused layer 1' })).toBeVisible()
})

test('the node form saves the layer chosen in the select', async ({ page }) => {
  const timelineId = await seed(page)
  await page.goto(`/timelines/${timelineId}/nodes/new`)

  const dialog = page.getByRole('dialog', { name: 'New node' })
  await dialog.getByLabel('Title').fill('Echo')
  await dialog.getByRole('combobox', { name: 'Layer' }).click()
  await page.getByRole('option', { name: '2' }).click()
  await expect(dialog.getByRole('combobox', { name: 'Layer' })).toHaveText('2')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(dialog).toBeHidden()

  await expect.poll(() => opacity(item(page, 'Echo'))).toBe(0.4)
  const { nodes } = await readRecords(page)
  expect(nodes.find((node) => node.title === 'Echo')).toMatchObject({ layer: 2 })
})
