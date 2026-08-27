import { expect, test } from '@playwright/test'

test('app shell loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Anvil/i)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Anvil' }),
  ).toBeVisible()
})
