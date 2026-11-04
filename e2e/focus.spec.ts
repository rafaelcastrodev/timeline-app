import { expect, test, type Page } from '@playwright/test'
import { seedRecords } from './seed.ts'

const AT = '2026-01-01T00:00:00.000Z'

async function seedTimeline(page: Page): Promise<string> {
  await page.goto('/')
  await expect(page.getByText('No timelines yet')).toBeVisible()
  const timelineId = crypto.randomUUID()
  await seedRecords(page, {
    timelines: [
      {
        id: timelineId,
        title: 'Trip',
        description: '',
        orientation: 'vertical',
        created_at: AT,
        updated_at: AT,
      },
    ],
    nodes: ['Leave', 'Arrive'].map((title, position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title,
      description: '',
      color: null,
      position,
      created_at: AT,
      updated_at: AT,
    })),
  })
  return timelineId
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024

test('focus returns to the opener after dialogs, or to the heading when it is gone', async ({
  page,
}) => {
  const timelineId = await seedTimeline(page)
  await page.goto(`/timelines/${timelineId}`)
  const heading = page.getByRole('heading', { name: 'Trip', level: 2 })
  await expect(heading).toBeVisible()

  // Node detail closed with Esc: back to the card link.
  const leave = page.getByRole('link', { name: 'Leave', exact: true })
  await leave.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Leave' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(leave).toBeFocused()

  // Create dialog saved: back to "Add node".
  const addNode = page.getByRole('link', { name: 'Add node' })
  await addNode.focus()
  await page.keyboard.press('Enter')
  const create = page.getByRole('dialog', { name: 'New node' })
  await create.getByLabel('Title').fill('Return')
  await create.getByRole('button', { name: 'Create' }).click()
  await expect(create).toBeHidden()
  await expect(addNode).toBeFocused()

  // "Keep editing" in the discard prompt: back to the field being edited.
  await page.getByRole('link', { name: 'Arrive', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Edit' }).click()
  const title = page.getByRole('dialog', { name: 'Edit node' }).getByLabel('Title')
  await expect(title).toBeFocused()
  await title.fill('Arrive late')
  await page.keyboard.press('Escape')
  const discard = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
  await discard.getByRole('button', { name: 'Keep editing' }).click()
  await expect(discard).toBeHidden()
  await expect(title).toBeFocused()

  // Deleting the node removes its card: focus goes to the timeline heading.
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(heading).toBeFocused()

  // A confirmation opened from the actions menu returns to the menu trigger.
  const actions = page.getByRole('button', { name: 'Timeline actions' })
  await actions.click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(actions).toBeFocused()

  // Deleting the timeline: focus goes to the list heading.
  await actions.click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Timelines', level: 2 })).toBeFocused()
})

test('focus follows the screen change between list and timeline on mobile', async ({ page }) => {
  test.skip(!isMobile(page), 'two panes stay visible on desktop')
  await seedTimeline(page)
  await page.goto('/')

  const link = page.getByRole('link', { name: /Trip/ })
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Trip', level: 2 })).toBeFocused()

  await page.getByRole('link', { name: 'Back to timelines' }).click()
  await expect(page.getByRole('heading', { name: 'Timelines', level: 2 })).toBeFocused()
})
