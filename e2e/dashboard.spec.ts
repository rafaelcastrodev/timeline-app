import { expect, test, type Page } from '@playwright/test'

const PAGE_SIZE = 20
const SEEDED = 25

/** Writes timelines straight into IndexedDB (the app must have opened the database). */
async function seedTimelines(page: Page, count: number) {
  await page.evaluate(async (count) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('timeline-app')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction('timelines', 'readwrite')
    const store = tx.objectStore('timelines')
    const base = Date.parse('2026-01-01T00:00:00.000Z')
    for (let i = 0; i < count; i++) {
      const at = new Date(base - i * 60_000).toISOString()
      store.put({
        id: crypto.randomUUID(),
        title: `Seeded ${String(i + 1).padStart(2, '0')}`,
        description: '',
        orientation: 'vertical',
        created_at: at,
        updated_at: at,
      })
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, count)
}

const listPane = (page: Page) => page.getByRole('complementary', { name: 'Timelines' })
const listItems = (page: Page) => listPane(page).getByRole('listitem')
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024

async function backToList(page: Page) {
  if (isMobile(page)) await page.getByRole('link', { name: 'Back to timelines' }).click()
  await expect(listPane(page)).toBeVisible()
}

async function createTimeline(page: Page, title: string, description: string) {
  await listPane(page).getByRole('link', { name: 'New timeline' }).click()
  const dialog = page.getByRole('dialog', { name: 'New timeline' })
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByLabel('Description').fill(description)
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: title, level: 2 })).toBeVisible()
}

test('dashboard: create, infinite scroll, select, edit, delete', async ({ page }) => {
  await page.goto('/')
  await expect(listPane(page).getByText('No timelines yet')).toBeVisible()

  // Create two timelines through the UI.
  await createTimeline(page, 'Alpha', 'First **timeline**')
  await backToList(page)
  await createTimeline(page, 'Beta', 'Second timeline')
  await expect(page).toHaveURL(/\/timelines\/[0-9a-f-]{36}$/)
  await backToList(page)

  // Seed more than a page, older than the UI-created ones, and reload.
  await seedTimelines(page, SEEDED)
  await page.goto('/')
  await expect(listItems(page)).toHaveCount(PAGE_SIZE)
  await expect(listItems(page).first()).toContainText('Beta')
  await expect(listItems(page).nth(1)).toContainText('Alpha')
  await expect(listItems(page).nth(1)).toContainText('First timeline')

  // Scrolling to the end loads the rest.
  await listItems(page).last().scrollIntoViewIfNeeded()
  await expect(listItems(page)).toHaveCount(SEEDED + 2)
  await expect(listItems(page).last()).toContainText(`Seeded ${SEEDED}`)

  // Select one.
  await listPane(page).getByRole('link', { name: /Alpha/ }).click()
  await expect(page.getByRole('heading', { name: 'Alpha', level: 2 })).toBeVisible()
  await expect(page.getByRole('main').getByText('timeline', { exact: true })).toBeVisible()
  if (isMobile(page)) await expect(listPane(page)).toBeHidden()
  else await expect(listPane(page)).toBeVisible()

  // Edit.
  await page.getByRole('button', { name: 'Timeline actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog', { name: 'Edit timeline' })
  await expect(editDialog.getByLabel('Title')).toHaveValue('Alpha')
  await editDialog.getByLabel('Title').fill('Alpha edited')
  await editDialog.getByRole('button', { name: 'Save' }).click()
  await expect(editDialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Alpha edited', level: 2 })).toBeVisible()

  // Delete: cancel first, then confirm.
  const openDelete = async () => {
    await page.getByRole('button', { name: 'Timeline actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    return page.getByRole('alertdialog', { name: 'Delete this timeline?' })
  }
  let confirm = await openDelete()
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(confirm).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Alpha edited', level: 2 })).toBeVisible()

  confirm = await openDelete()
  await confirm.getByRole('button', { name: 'Delete' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(listPane(page)).toBeVisible()
  await expect(listItems(page).first()).toContainText('Beta')
  await expect(listPane(page).getByText('Alpha edited')).toHaveCount(0)

  // Deletion persisted.
  await page.reload()
  await expect(listItems(page).first()).toContainText('Beta')
  await expect(listPane(page).getByText('Alpha edited')).toHaveCount(0)
})

test('form dialog is full screen on mobile and a modal on desktop', async ({ page }) => {
  await page.goto('/timelines/new')
  const dialog = page.getByRole('dialog', { name: 'New timeline' })
  await expect(dialog).toBeVisible()
  // Let the open animation (zoom-in) finish before measuring.
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  )
  const box = await dialog.boundingBox()
  const viewport = page.viewportSize()!
  if (isMobile(page)) {
    expect(box).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height })
  } else {
    expect(box!.width).toBeLessThan(viewport.width / 2)
  }

  // Opened by direct URL: closing falls back to the dashboard.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/$/)
})

test('unknown URL shows not found', async ({ page }) => {
  await page.goto('/does/not/exist')
  await expect(page.getByText('Page not found')).toBeVisible()
})
