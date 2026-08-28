import { expect, test } from '@playwright/test'

test.describe('virtual file system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('the seeded file is selected by default and shown in the editor panel', async ({
    page,
  }) => {
    const files = page.getByRole('region', { name: 'File explorer' })
    const editor = page.getByRole('region', { name: 'Editor' })

    // `exact: true` matters here: Playwright's role-name matching is a
    // substring match by default, and "Rename index.js" / "Delete
    // index.js" both contain "index.js" — without it this resolves to
    // three buttons instead of one.
    await expect(
      files.getByRole('button', { name: 'index.js', exact: true }),
    ).toHaveAttribute('aria-current', 'true')
    await expect(editor.getByText('index.js')).toBeVisible()
    await expect(editor.getByText(/Hello from Anvil/)).toBeVisible()
  })

  test('creating, selecting, renaming, and deleting a file all update the tree live', async ({
    page,
  }) => {
    const files = page.getByRole('region', { name: 'File explorer' })
    const editor = page.getByRole('region', { name: 'Editor' })

    // Create, inside a freshly-created (auto-expanded) folder.
    await files.getByRole('button', { name: '+ Folder' }).click()
    await files.getByRole('textbox', { name: 'New folder name' }).fill('lib')
    await page.keyboard.press('Enter')

    await files.getByRole('button', { name: 'New file in lib' }).click()
    await files.getByRole('textbox', { name: 'New file name' }).fill('math.ts')
    await page.keyboard.press('Enter')

    const mathFile = files.getByRole('button', { name: 'math.ts', exact: true })
    await expect(mathFile).toBeVisible()

    // Select it — the (empty) content shows up in the editor panel.
    await mathFile.click()
    await expect(editor.getByText('lib/math.ts')).toBeVisible()

    // Rename it in place.
    await files.getByRole('button', { name: 'Rename math.ts' }).click()
    const renameInput = files.getByRole('textbox', { name: 'Rename math.ts' })
    await renameInput.fill('arithmetic.ts')
    await page.keyboard.press('Enter')
    await expect(
      files.getByRole('button', { name: 'arithmetic.ts', exact: true }),
    ).toBeVisible()

    // Delete it — the editor panel falls back to the Phase 3 placeholder
    // since the deleted file was the selected one.
    await files.getByRole('button', { name: 'Delete arithmetic.ts' }).click()
    await expect(
      files.getByRole('button', { name: 'arithmetic.ts', exact: true }),
    ).not.toBeVisible()
    await expect(editor.getByText(/Coming in Phase 3/)).toBeVisible()
  })
})
