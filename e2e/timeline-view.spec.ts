import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedRecords } from './seed.ts'

const NODE_COUNT = 6
const AT = '2026-01-01T00:00:00.000Z'

/** Opens the app and waits until Dexie has created the database (empty list rendered). */
async function openEmptyApp(page: Page) {
  await page.goto('/')
  await expect(page.getByText('No timelines yet')).toBeVisible()
}

async function seedTimeline(page: Page): Promise<string> {
  const timelineId = crypto.randomUUID()
  await seedRecords(page, {
    timelines: [
      {
        id: timelineId,
        title: 'Road **trip**',
        description: 'Summer *2026*',
        orientation: 'vertical',
        created_at: AT,
        updated_at: AT,
      },
    ],
    nodes: Array.from({ length: NODE_COUNT }, (_, position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title: `Stop ${position + 1}`,
      description: Array.from(
        { length: 6 },
        (_, line) => `Line ${line + 1} of stop ${position + 1}`,
      ).join('\n\n'),
      position,
      created_at: AT,
      updated_at: AT,
    })),
  })
  return timelineId
}

const nodeList = (page: Page) => page.getByRole('list', { name: 'Nodes' })
const cards = (page: Page) => nodeList(page).getByRole('listitem')

async function boxes(items: Locator) {
  const count = await items.count()
  return Promise.all(Array.from({ length: count }, (_, i) => items.nth(i).boundingBox()))
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test('timeline view: layouts, excerpt clamp, orientation persisted', async ({ page }) => {
  await openEmptyApp(page)
  const timelineId = await seedTimeline(page)
  await page.goto(`/timelines/${timelineId}`)

  await expect(page.getByRole('heading', { name: 'Road trip', level: 2 })).toBeVisible()
  await expect(cards(page)).toHaveCount(NODE_COUNT)
  await expect(nodeList(page)).toHaveAttribute('data-orientation', 'vertical')

  // Cards show the inline title and a description clamped to 3 lines.
  const first = cards(page).first()
  await expect(first.getByRole('heading', { name: 'Stop 1', level: 3 })).toBeVisible()
  await expect(first.getByText('Line 1 of stop 1')).toBeVisible()
  const excerpt = first.locator('[data-slot="markdown-excerpt"]')
  const { height, lineHeight } = await excerpt.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(element).lineHeight),
  }))
  expect(height).toBeLessThanOrEqual(lineHeight * 3 + 1)

  // Vertical: cards stacked in order, aligned on the same column.
  let [a, b] = await boxes(cards(page))
  expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height)
  expect(b!.x).toBe(a!.x)
  await expectNoPageOverflow(page)
  await page.screenshot({ path: test.info().outputPath('vertical.png'), fullPage: true })

  // Switch to horizontal from the header.
  const toggle = page.getByRole('radiogroup', { name: 'Orientation' })
  await toggle.getByRole('radio', { name: 'Horizontal' }).click()
  await expect(nodeList(page)).toHaveAttribute('data-orientation', 'horizontal')

  const checkHorizontal = async () => {
    const width = page.viewportSize()!.width
    ;[a, b] = await boxes(cards(page))
    expect(b!.x).toBeGreaterThanOrEqual(a!.x + a!.width)
    expect(b!.y).toBe(a!.y)
    // Fixed card width: 16rem below `md`, 18rem from `md` up.
    expect(a!.width).toBe(width < 768 ? 256 : 288)
    await expectNoPageOverflow(page)

    // The row scrolls on its own and snaps to a card.
    const scroller = page.locator('[data-slot="node-scroller"]')
    const { scrollWidth, clientWidth } = await scroller.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }))
    expect(scrollWidth).toBeGreaterThan(clientWidth)
    await cards(page).last().scrollIntoViewIfNeeded()
    await expect(cards(page).last()).toBeInViewport()
  }
  await checkHorizontal()
  await page.screenshot({ path: test.info().outputPath('horizontal.png'), fullPage: true })

  // Survives a reload.
  await page.reload()
  await expect(nodeList(page)).toHaveAttribute('data-orientation', 'horizontal')
  await expect(toggle.getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await checkHorizontal()

  // Back to vertical, also persisted.
  await toggle.getByRole('radio', { name: 'Vertical' }).click()
  await expect(nodeList(page)).toHaveAttribute('data-orientation', 'vertical')
  await page.reload()
  await expect(nodeList(page)).toHaveAttribute('data-orientation', 'vertical')
})

test('timeline view: empty state and add node action', async ({ page }) => {
  await openEmptyApp(page)
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
  await page.goto(`/timelines/${timelineId}`)

  await expect(page.getByText('No nodes yet')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Add first node' })).toBeVisible()
  const add = page.getByRole('link', { name: 'Add node' })
  await expect(add).toBeVisible()
  await expect(add).toHaveAttribute('href', `/timelines/${timelineId}/nodes/new`)

  // Floating action button in the bottom-right corner on mobile, in the header on desktop.
  const box = (await add.boundingBox())!
  const viewport = page.viewportSize()!
  if (viewport.width < 1024) {
    expect(box.x + box.width).toBeCloseTo(viewport.width - 16, 0)
    expect(box.y + box.height).toBeCloseTo(viewport.height - 16, 0)
  } else {
    const header = (await page.locator('main header').boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(header.y)
    expect(box.y + box.height).toBeLessThanOrEqual(header.y + header.height)
  }
  await expectNoPageOverflow(page)
})
