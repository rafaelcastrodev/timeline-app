import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedRecords } from './seed.ts'

const AT = '2026-01-01T00:00:00.000Z'

/** Seeds an empty timeline and opens it. */
async function openTimeline(page: Page): Promise<string> {
  await page.goto('/')
  await expect(page.getByText('No timelines yet')).toBeVisible()
  const timelineId = crypto.randomUUID()
  await seedRecords(page, {
    timelines: [
      {
        id: timelineId,
        title: 'Road trip',
        description: '',
        orientation: 'vertical',
        created_at: AT,
        updated_at: AT,
      },
    ],
  })
  await page.goto(`/timelines/${timelineId}`)
  await expect(page.getByText('No nodes yet')).toBeVisible()
  return timelineId
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024
const cards = (page: Page) => page.getByRole('list', { name: 'Nodes' }).locator('> li')
const discardPrompt = (page: Page) =>
  page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })

async function expectLayout(page: Page, dialog: Locator) {
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  )
  const box = (await dialog.boundingBox())!
  const viewport = page.viewportSize()!
  if (isMobile(page)) {
    expect(box).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height })
  } else {
    expect(box.width).toBeLessThan(viewport.width / 2)
  }
}

test('nodes: create, view, edit, delete', async ({ page }) => {
  const timelineId = await openTimeline(page)

  // Create.
  await page.getByRole('link', { name: 'Add node' }).click()
  const create = page.getByRole('dialog', { name: 'New node' })
  await expectLayout(page, create)
  await create.getByLabel('Title').fill('Day **one**')
  await create.getByLabel('Description').fill('- pack\n- leave\n\nThird *line*\n\nFourth line')
  await create.getByRole('button', { name: 'Create' }).click()
  await expect(create).toBeHidden()
  await expect(page).toHaveURL(`/timelines/${timelineId}`)
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first().getByRole('heading', { name: 'Day one' })).toBeVisible()

  // View: clicking anywhere on the card opens the detail in read mode. The click lands on the
  // excerpt, which the title link's overlay covers.
  const card = page.locator('[data-slot="node-card"]').first()
  const excerpt = (await card.getByText('pack').boundingBox())!
  const cardBox = (await card.boundingBox())!
  await card.click({
    position: { x: excerpt.x - cardBox.x + 4, y: excerpt.y - cardBox.y + excerpt.height / 2 },
  })
  const detail = page.getByRole('dialog', { name: 'Day one' })
  await expect(detail).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/timelines/${timelineId}/nodes/[0-9a-f-]{36}$`))
  await expectLayout(page, detail)
  await expect(detail.getByText('Fourth line')).toBeVisible()
  await expect(detail.getByRole('listitem')).toHaveCount(2)
  await expect(detail.getByRole('textbox')).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath('detail.png') })

  // Edit in place, back to read mode after saving.
  await detail.getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit node' })
  await expect(edit.getByLabel('Title')).toBeFocused()
  await page.screenshot({ path: test.info().outputPath('edit.png') })
  await edit.getByLabel('Title').fill('Day *two*')
  await edit.getByRole('button', { name: 'Save' }).click()
  const updated = page.getByRole('dialog', { name: 'Day two' })
  await expect(updated).toBeVisible()
  await expect(discardPrompt(page)).toHaveCount(0)

  // Close, the card shows the new title; survives a reload.
  await page.keyboard.press('Escape')
  await expect(updated).toBeHidden()
  await expect(page).toHaveURL(`/timelines/${timelineId}`)
  await page.reload()
  await expect(cards(page).first().getByRole('heading', { name: 'Day two' })).toBeVisible()

  // Delete: cancel first, then confirm.
  await cards(page).first().getByRole('link').click()
  await updated.getByRole('button', { name: 'Delete' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete this node?' })
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(confirm).toBeHidden()
  await expect(updated).toBeVisible()
  await updated.getByRole('button', { name: 'Delete' }).click()
  await confirm.getByRole('button', { name: 'Delete' }).click()
  await expect(updated).toBeHidden()
  await expect(page).toHaveURL(`/timelines/${timelineId}`)
  await expect(page.getByText('No nodes yet')).toBeVisible()
  await page.reload()
  await expect(page.getByText('No nodes yet')).toBeVisible()
})

test('unsaved-changes guard: Esc, X, back and Cancel ask only while dirty', async ({ page }) => {
  const timelineId = await openTimeline(page)

  // Clean form: Esc closes right away.
  await page.getByRole('link', { name: 'Add node' }).click()
  const dialog = page.getByRole('dialog', { name: 'New node' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(discardPrompt(page)).toHaveCount(0)

  // Dirty form: every close path asks; "Keep editing" keeps the draft.
  await page.getByRole('link', { name: 'Add node' }).click()
  await dialog.getByLabel('Title').fill('Draft')
  const closePaths: Array<[string, () => Promise<unknown>]> = [
    ['Esc', () => page.keyboard.press('Escape')],
    ['X', () => dialog.getByRole('button', { name: 'Close' }).click()],
    ['back', () => page.goBack()],
    ['Cancel', () => dialog.getByRole('button', { name: 'Cancel' }).click()],
  ]
  for (const [name, close] of closePaths) {
    await test.step(name, async () => {
      await close()
      await expect(discardPrompt(page)).toBeVisible()
      await discardPrompt(page).getByRole('button', { name: 'Keep editing' }).click()
      await expect(discardPrompt(page)).toBeHidden()
      await expect(dialog.getByLabel('Title')).toHaveValue('Draft')
      await expect(page).toHaveURL(`/timelines/${timelineId}/nodes/new`)
    })
  }

  // Discard closes without saving.
  await page.goBack()
  await discardPrompt(page).getByRole('button', { name: 'Discard' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(`/timelines/${timelineId}`)
  await expect(page.getByText('No nodes yet')).toBeVisible()

  // After saving: no prompt.
  await page.getByRole('link', { name: 'Add node' }).click()
  await dialog.getByLabel('Title').fill('Saved')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(dialog).toBeHidden()
  await expect(discardPrompt(page)).toHaveCount(0)
  await expect(cards(page)).toHaveCount(1)

  // Dirty timeline form is guarded too.
  await page.getByRole('button', { name: 'Timeline actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const timelineForm = page.getByRole('dialog', { name: 'Edit timeline' })
  await timelineForm.getByLabel('Title').fill('Changed')
  await page.keyboard.press('Escape')
  await discardPrompt(page).getByRole('button', { name: 'Discard' }).click()
  await expect(timelineForm).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Road trip', level: 2 })).toBeVisible()

  // Tab close while dirty: the browser shows its own prompt.
  await page.getByRole('link', { name: 'Add node' }).click()
  await dialog.getByLabel('Title').fill('Unsaved')
  const prompt = page.waitForEvent('dialog')
  await page.close({ runBeforeUnload: true })
  const beforeUnload = await prompt
  expect(beforeUnload.type()).toBe('beforeunload')
  await beforeUnload.accept()
})
