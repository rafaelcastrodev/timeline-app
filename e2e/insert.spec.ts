import { expect, test, type Locator, type Page } from '@playwright/test'
import { readRecords, seedRecords } from './seed.ts'

type Orientation = 'vertical' | 'horizontal'

const AT = '2026-01-01T00:00:00.000Z'

async function openTimeline(page: Page, orientation: Orientation): Promise<string> {
  await page.goto('/')
  await expect(page.getByText('No timelines yet')).toBeVisible()
  const timelineId = crypto.randomUUID()
  await seedRecords(page, {
    timelines: [
      {
        id: timelineId,
        title: 'Trip',
        description: '',
        orientation,
        created_at: AT,
        updated_at: AT,
      },
    ],
    nodes: (
      [
        ['Start', 2],
        ['End', 7],
      ] as const
    ).map(([title, severity], position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title,
      description: `About ${title}`,
      color: null,
      layer: 1,
      severity,
      position,
      created_at: AT,
      updated_at: AT,
    })),
  })
  await page.goto(`/timelines/${timelineId}`)
  await expect(items(page)).toHaveCount(2)
  return timelineId
}

const items = (page: Page) => page.getByRole('list', { name: 'Nodes' }).getByRole('listitem')
const insertLink = (page: Page) => page.getByRole('link', { name: 'Insert node at position 2' })
const opacity = (locator: Locator) =>
  locator.evaluate((element) => Number(getComputedStyle(element).opacity))

for (const orientation of ['vertical', 'horizontal'] as const) {
  test(`inserts a node between two cards (${orientation})`, async ({ page, isMobile }) => {
    const timelineId = await openTimeline(page, orientation)
    // Only the gap between the two cards has an insert button.
    await expect(page.getByRole('link', { name: /^Insert node at position/ })).toHaveCount(1)

    const link = insertLink(page)
    if (isMobile) {
      // Touch screens have no hover: the button is always shown.
      await expect.poll(() => opacity(link)).toBe(1)
      await link.tap()
    } else {
      await expect.poll(() => opacity(link)).toBe(0)
      await page.locator('[data-slot=node-insert]').hover()
      await expect.poll(() => opacity(link)).toBe(1)
      await link.click()
    }

    const dialog = page.getByRole('dialog', { name: 'New node' })
    await expect(dialog.getByText('Inserted at position 2.')).toBeVisible()
    await dialog.getByLabel('Title').fill('Middle')
    await dialog.getByRole('button', { name: 'Create' }).click()

    await expect(page).toHaveURL(`/timelines/${timelineId}`)
    await expect(items(page).getByRole('heading', { level: 3 })).toHaveText([
      'Start',
      'Middle',
      'End',
    ])
    const { nodes } = await readRecords(page)
    expect(
      nodes
        .toSorted((a, b) => Number(a.position) - Number(b.position))
        .map((node) => [node.title, node.position]),
    ).toEqual([
      ['Start', 0],
      ['Middle', 1],
      ['End', 2],
    ])
  })
}

test('the insert button shows on keyboard focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'touch screens always show it')
  await openTimeline(page, 'vertical')
  const link = insertLink(page)
  await page.getByRole('button', { name: 'Reorder Start' }).focus()
  await page.keyboard.press('Tab')
  await expect(link).toBeFocused()
  await expect.poll(() => opacity(link)).toBe(1)
})

test('timeline markers show the node severity', async ({ page }) => {
  await openTimeline(page, 'vertical')
  const markers = page.locator('[data-slot=node-marker]')
  await expect(markers).toHaveText(['2Severity 2 (Lowest)', '7Severity 7 (Climax)'])
  // The number fits inside the marker.
  const box = await markers.first().boundingBox()
  expect(box?.width).toBe(20)
})
