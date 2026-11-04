import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedRecords } from './seed.ts'

type Orientation = 'vertical' | 'horizontal'

const AT = '2026-01-01T00:00:00.000Z'
const TITLES = ['Stop 1', 'Stop 2', 'Stop 3', 'Stop 4']

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
    nodes: TITLES.map((title, position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title,
      description: `About ${title}`,
      color: null,
      position,
      created_at: AT,
      updated_at: AT,
    })),
  })
  await page.goto(`/timelines/${timelineId}`)
  await expect(cards(page)).toHaveCount(TITLES.length)
  return timelineId
}

const cards = (page: Page) => page.getByRole('list', { name: 'Nodes' }).getByRole('listitem')
const handle = (page: Page, title: string) => page.getByRole('button', { name: `Reorder ${title}` })
const announcer = (page: Page) => page.locator('[id^="DndLiveRegion"]')

async function expectOrder(page: Page, titles: string[]) {
  await expect(cards(page).getByRole('heading', { level: 3 })).toHaveText(titles)
}

/** Node titles of the timeline as stored in IndexedDB, by position. */
function storedOrder(page: Page, timelineId: string): Promise<string[]> {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('timeline-app')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const request = db.transaction('nodes').objectStore('nodes').index('timeline_id').getAll(id)
    const nodes = await new Promise<{ title: string; position: number }[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return nodes.sort((a, b) => a.position - b.position).map((node) => node.title)
  }, timelineId)
}

/** Waits for the optimistic order to be persisted, then reloads and checks it again. */
async function expectPersistedOrder(page: Page, timelineId: string, titles: string[]) {
  await expectOrder(page, titles)
  await expect.poll(() => storedOrder(page, timelineId)).toEqual(titles)
  await page.reload()
  await expectOrder(page, titles)
}

async function center(locator: Locator) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Mouse drag from the handle of `title` by (`dx`, `dy`), in small steps. */
async function mouseDrag(page: Page, title: string, dx: number, dy: number) {
  const start = await center(handle(page, title))
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + dx / 4, start.y + dy / 4, { steps: 5 })
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 15 })
  await page.mouse.up()
}

/** Keyboard drag: pick up with Space, move `by` places with the arrow `key`, drop with Space. */
async function keyboardDrag(page: Page, title: string, key: string, by: number) {
  const button = handle(page, title)
  await button.focus()
  await page.keyboard.press('Space')
  await expect(announcer(page)).toContainText('Picked up node at position')
  const picked = /Picked up node at position (\d+) of/.exec(
    (await announcer(page).textContent()) ?? '',
  )
  expect(picked).not.toBeNull()
  const from = Number(picked![1])
  const step = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1
  for (let i = 1; i <= by; i++) {
    await page.keyboard.press(key)
    await expect(announcer(page)).toContainText(`Node moved to position ${from + step * i} of`)
  }
  await page.keyboard.press('Space')
  await expect(announcer(page)).toContainText('Node dropped at position')
}

test('reorder a vertical timeline by mouse and keyboard; order survives reload', async ({
  page,
}) => {
  const timelineId = await openTimeline(page, 'vertical')

  // Mouse: drag Stop 1 just past the center of Stop 3.
  const first = (await cards(page).nth(0).boundingBox())!
  const third = (await cards(page).nth(2).boundingBox())!
  await mouseDrag(page, 'Stop 1', 0, third.y + third.height / 2 - (first.y + first.height / 2) + 4)
  await expectPersistedOrder(page, timelineId, ['Stop 2', 'Stop 3', 'Stop 1', 'Stop 4'])

  // Keyboard: move Stop 4 up two places; the handle keeps focus after the drop.
  await keyboardDrag(page, 'Stop 4', 'ArrowUp', 2)
  await expect(handle(page, 'Stop 4')).toBeFocused()
  await expectPersistedOrder(page, timelineId, ['Stop 2', 'Stop 4', 'Stop 3', 'Stop 1'])

  // Escape cancels a keyboard drag.
  await handle(page, 'Stop 2').focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(100)
  await page.keyboard.press('Escape')
  await expect(announcer(page)).toContainText('Reordering cancelled')
  await expectOrder(page, ['Stop 2', 'Stop 4', 'Stop 3', 'Stop 1'])

  // Clicking the card body still opens the detail; the handle does not.
  await handle(page, 'Stop 3').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await cards(page).nth(2).locator('[data-slot="node-card"]').click()
  await expect(page.getByRole('dialog', { name: 'Stop 3' })).toBeVisible()
})

test('reorder a horizontal timeline by mouse and keyboard; order survives reload', async ({
  page,
}) => {
  const timelineId = await openTimeline(page, 'horizontal')

  // Mouse: drag Stop 1 most of a card width to the right, over Stop 2. A 360 px viewport shows a
  // single card, so the pointer would leave it and auto-scroll past Stop 2: desktop only.
  if (page.viewportSize()!.width >= 1024) {
    await mouseDrag(page, 'Stop 1', 200, 0)
    await expectPersistedOrder(page, timelineId, ['Stop 2', 'Stop 1', 'Stop 3', 'Stop 4'])
  }

  // Keyboard: move the first node right twice.
  const firstTitle = (await cards(page).first().getByRole('heading', { level: 3 }).textContent())!
  const rest = TITLES.filter((title) => title !== firstTitle)
  const expected = [rest[0]!, rest[1]!, firstTitle, rest[2]!]
  await keyboardDrag(page, firstTitle, 'ArrowRight', 2)
  await expectPersistedOrder(page, timelineId, expected)
  await expect(page.getByRole('list', { name: 'Nodes' })).toHaveAttribute(
    'data-orientation',
    'horizontal',
  )
})

test('touch: long press on the handle drags, an immediate swipe does not', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch emulation runs on the mobile project')
  const timelineId = await openTimeline(page, 'vertical')
  const client = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x?: number, y?: number) =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: x === undefined ? [] : [{ x, y: y! }],
    })
  const touchDrag = async (title: string, dy: number, holdMs: number) => {
    const start = await center(handle(page, title))
    await touch('touchStart', start.x, start.y)
    await page.waitForTimeout(holdMs)
    for (let step = 1; step <= 15; step++) {
      await touch('touchMove', start.x, start.y + (dy * step) / 15)
      await page.waitForTimeout(16)
    }
    await touch('touchEnd')
  }

  const first = (await cards(page).nth(0).boundingBox())!
  const second = (await cards(page).nth(1).boundingBox())!
  const dy = second.y + second.height / 2 - (first.y + first.height / 2) + 4

  // Moving right away exceeds the tolerance during the activation delay: no drag.
  await touchDrag('Stop 1', dy, 0)
  await page.waitForTimeout(300)
  await expectOrder(page, TITLES)

  // Holding past the delay starts the drag.
  await touchDrag('Stop 1', dy, 400)
  await expectPersistedOrder(page, timelineId, ['Stop 2', 'Stop 1', 'Stop 3', 'Stop 4'])
})
