import { expect, test, type Page } from '@playwright/test'
import { seedRecords } from './seed.ts'

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
        ['Calm', 1],
        ['Storm', 5],
        ['Aftermath', 3],
      ] as const
    ).map(([title, severity], position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title: `*${title}*`,
      description: `${title} notes`,
      color: null,
      layer: 1,
      severity,
      position,
      created_at: AT,
      updated_at: AT,
    })),
  })
  return timelineId
}

const point = (page: Page, name: string) => page.getByRole('link', { name, exact: true })

test('the timeline header opens the severity chart, one point per node', async ({ page }) => {
  const timelineId = await seed(page)
  await page.goto(`/timelines/${timelineId}`)

  await page.getByRole('link', { name: 'Severity chart' }).click()
  await expect(page).toHaveURL(`/timelines/${timelineId}/chart`)
  await expect(page.getByRole('heading', { name: 'Severity chart', level: 2 })).toBeVisible()
  await expect(point(page, 'Calm Severity 1')).toBeVisible()
  await expect(point(page, 'Storm Severity 5')).toBeVisible()
  await expect(point(page, 'Aftermath Severity 3')).toBeVisible()

  // Higher severity sits higher on the chart.
  const top = async (name: string) => (await point(page, name).boundingBox())?.y ?? Number.NaN
  expect(await top('Storm Severity 5')).toBeLessThan(await top('Aftermath Severity 3'))
  expect(await top('Aftermath Severity 3')).toBeLessThan(await top('Calm Severity 1'))

  await page.getByRole('link', { name: 'Back to timeline' }).click()
  await expect(page).toHaveURL(`/timelines/${timelineId}`)
})

test('hovering a point shows the node title in the tooltip', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover only')
  const timelineId = await seed(page)
  await page.goto(`/timelines/${timelineId}/chart`)

  await point(page, 'Storm Severity 5').hover()
  await expect(page.locator('.recharts-tooltip-wrapper')).toContainText('Storm')
})

test('clicking a point opens the node detail over the chart', async ({ page }) => {
  const timelineId = await seed(page)
  await page.goto(`/timelines/${timelineId}/chart`)

  await point(page, 'Storm Severity 5').click()
  const dialog = page.getByRole('dialog', { name: 'Storm' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Storm notes')).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/timelines/${timelineId}/chart/nodes/`))

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(`/timelines/${timelineId}/chart`)
  await expect(point(page, 'Storm Severity 5')).toBeFocused()
})

test('a point opens with Enter from the keyboard', async ({ page }) => {
  const timelineId = await seed(page)
  await page.goto(`/timelines/${timelineId}/chart`)

  await point(page, 'Aftermath Severity 3').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Aftermath' })).toBeVisible()
})

test('a direct link to a node of the chart closes back to the chart', async ({ page }) => {
  const timelineId = await seed(page)
  await page.goto(`/timelines/${timelineId}/chart`)
  await point(page, 'Calm Severity 1').click()
  const url = page.url()

  await page.goto(url)
  await expect(page.getByRole('dialog', { name: 'Calm' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page).toHaveURL(`/timelines/${timelineId}/chart`)
})

test('a timeline without nodes shows an empty chart state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No timelines yet')).toBeVisible()
  const timelineId = crypto.randomUUID()
  await seedRecords(page, {
    timelines: [
      {
        id: timelineId,
        title: 'Empty',
        description: '',
        orientation: 'vertical',
        created_at: AT,
        updated_at: AT,
      },
    ],
  })
  await page.goto(`/timelines/${timelineId}/chart`)
  await expect(page.getByText('No nodes yet')).toBeVisible()
})
