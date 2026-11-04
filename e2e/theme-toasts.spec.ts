import { expect, test } from '@playwright/test'

test('the chosen theme is applied and survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const html = page.locator('html')
  await expect(html).toHaveClass(/\blight\b/)

  await page.getByRole('button', { name: 'Theme' }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await expect(html).toHaveClass(/\bdark\b/)
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    /oklch\(0\.145 0 0\)|rgb\(10, 10, 10\)/,
  )

  await page.reload()
  await expect(html).toHaveClass(/\bdark\b/)

  // "System" follows the preferred color scheme.
  await page.getByRole('button', { name: 'Theme' }).click()
  await page.getByRole('menuitemradio', { name: 'System' }).click()
  await expect(html).toHaveClass(/\blight\b/)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(html).toHaveClass(/\bdark\b/)
})

test('save, delete and export outcomes show toasts', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'New timeline' }).click()
  const create = page.getByRole('dialog', { name: 'New timeline' })
  await create.getByLabel('Title').fill('Toasty')
  await create.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('Timeline created')).toBeVisible()

  await page.getByRole('link', { name: 'Add node' }).click()
  const node = page.getByRole('dialog', { name: 'New node' })
  await node.getByLabel('Title').fill('First')
  await node.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('Node created')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Timeline actions' }).click()
  await page.getByRole('menuitem', { name: 'Export' }).click()
  await download
  await expect(page.getByText('Timeline exported')).toBeVisible()

  await page.getByRole('button', { name: 'Timeline actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Timeline deleted')).toBeVisible()
})
