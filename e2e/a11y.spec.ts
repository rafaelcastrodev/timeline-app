import AxeBuilder from '@axe-core/playwright'
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
        title: 'Road **trip**',
        description: 'Summer [plans](https://example.com)\n\n- one\n- two',
        orientation: 'vertical',
        created_at: AT,
        updated_at: AT,
      },
      {
        id: crypto.randomUUID(),
        title: 'Other',
        description: '',
        orientation: 'horizontal',
        created_at: AT,
        updated_at: AT,
      },
    ],
    nodes: ['Leave', 'Drive', 'Arrive'].map((title, position) => ({
      id: crypto.randomUUID(),
      timeline_id: timelineId,
      title: `**${title}**`,
      description: `${title} *notes*\n\nSecond paragraph`,
      // Colored and default cards; red and indigo are the lowest-contrast soft shades.
      color: (['red', 'indigo', null] as const)[position],
      layer: 1,
      severity: 1,
      position,
      created_at: AT,
      updated_at: AT,
    })),
  })
  return timelineId
}

async function settle(page: Page) {
  // Let dialog and menu animations finish so colors are measured at full opacity.
  await page.evaluate(() =>
    // A cancelled animation rejects `finished`; it is settled all the same.
    Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
  )
}

/**
 * Rules skipped while a modal menu or dialog is open. Radix hides the rest of the page with
 * `aria-hidden` and traps focus inside the overlay: the hidden content is not reachable
 * (`aria-hidden-focus`), and its main landmark and `h1` are hidden on purpose. Overlays are
 * portaled to `<body>`, outside the page landmarks (`region`). The page itself is scanned with
 * every rule while no overlay is open.
 */
const OVERLAY_RULES = ['aria-hidden-focus', 'landmark-one-main', 'page-has-heading-one', 'region']

async function expectNoViolations(page: Page, label: string, { overlay = false } = {}) {
  await settle(page)
  const builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ])
  if (overlay) builder.disableRules(OVERLAY_RULES)
  const { violations } = await builder.analyze()
  const summary = violations.map(
    (violation) =>
      `${violation.id}: ${violation.help}\n` +
      violation.nodes
        .map((node) => `  ${node.target.join(' ')}: ${node.failureSummary}`)
        .join('\n'),
  )
  expect(summary, label).toEqual([])
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    test('screens have no axe violations', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByText('No timelines yet')).toBeVisible()
      await expectNoViolations(page, 'empty dashboard')

      const timelineId = await seed(page)
      await page.goto('/')
      await expect(page.getByRole('link', { name: /Road trip/ })).toBeVisible()
      await expectNoViolations(page, 'dashboard')

      await page.getByRole('button', { name: 'Theme' }).click()
      await expect(page.getByRole('menu')).toBeVisible()
      await expectNoViolations(page, 'theme menu', { overlay: true })
      await page.keyboard.press('Escape')

      await page.goto(`/timelines/${timelineId}`)
      await expect(page.getByRole('list', { name: 'Nodes' }).locator('> li')).toHaveCount(3)
      await expectNoViolations(page, 'vertical timeline')

      await page.getByRole('radio', { name: 'Horizontal' }).click()
      await expect(page.getByRole('list', { name: 'Nodes' })).toHaveAttribute(
        'data-orientation',
        'horizontal',
      )
      await expectNoViolations(page, 'horizontal timeline')

      await page.getByRole('button', { name: 'Timeline actions' }).click()
      await expect(page.getByRole('menu')).toBeVisible()
      await expectNoViolations(page, 'actions menu', { overlay: true })
      await page.keyboard.press('Escape')

      await page.getByRole('link', { name: 'Leave' }).click()
      const detail = page.getByRole('dialog', { name: 'Leave' })
      await expect(detail).toBeVisible()
      await expectNoViolations(page, 'node detail', { overlay: true })

      await detail.getByRole('button', { name: 'Edit' }).click()
      await expect(page.getByRole('dialog', { name: 'Edit node' })).toBeVisible()
      await page.getByRole('dialog').getByRole('radio', { name: 'Cyan' }).click()
      await page.getByRole('dialog').getByLabel('Title').fill('')
      await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
      await expect(page.getByText('Title is required')).toBeVisible()
      await expectNoViolations(page, 'node form with error', { overlay: true })

      await page.goto(`/timelines/${timelineId}`)
      await page.getByRole('button', { name: 'Timeline actions' }).click()
      await page.getByRole('menuitem', { name: 'Delete' }).click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      await expectNoViolations(page, 'delete confirmation', { overlay: true })
    })
  })
}
