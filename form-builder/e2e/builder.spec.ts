import { expect, test, type Page } from '@playwright/test'

/** Drags one element onto another via real, incremental mouse events —
 * `locator.dragTo()` alone is too instantaneous for @hello-pangea/dnd's
 * sensors to register as a genuine pick-up-and-move gesture in most
 * runs, so this does the down/move/move/up sequence by hand, with
 * pauses between each phase. The pauses aren't cosmetic: the library's
 * sensor lifts the item on its own requestAnimationFrame after
 * mousedown, and synthetic Playwright events can otherwise arrive
 * faster than that frame renders, so a move right after mousedown (or a
 * drop right after the final move) can be missed entirely. */
async function dragOnto(
  page: Page,
  sourceSelector: string,
  targetSelector: string,
) {
  const source = page.locator(sourceSelector)
  const sourceBox = await source.boundingBox()
  if (!sourceBox) {
    throw new Error('drag source not visible')
  }
  const startX = sourceBox.x + sourceBox.width / 2
  const startY = sourceBox.y + sourceBox.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.waitForTimeout(200)
  // A small nudge first so the drag is recognized as a drag rather than
  // a click.
  await page.mouse.move(startX + 10, startY + 10, { steps: 10 })
  await page.waitForTimeout(200)

  // Re-measure the target after the nudge — lifting the source item can
  // reflow the canvas (e.g. swapping out the empty-state placeholder),
  // which would move the target's coordinates out from under a box
  // captured before the drag started.
  const target = page.locator(targetSelector)
  const targetBox = await target.boundingBox()
  if (!targetBox) {
    throw new Error('drag target not visible')
  }
  const endX = targetBox.x + targetBox.width / 2
  // Bias toward the target's far edge (in the direction of travel)
  // rather than its exact center. For a reorder drag onto an
  // equal-sized sibling card, @hello-pangea/dnd only commits the swap
  // once the dragged item's center has crossed past the target's own
  // center — landing exactly on that midpoint leaves no margin for the
  // small placeholder-driven reflow that happens the instant the drag
  // starts, so this aims a few pixels shy of the target's far edge
  // instead, which comfortably clears the threshold either way.
  const movingDown = targetBox.y + targetBox.height / 2 > startY
  const endY = movingDown ? targetBox.y + targetBox.height - 4 : targetBox.y + 4

  await page.mouse.move(endX, endY, { steps: 20 })
  await page.waitForTimeout(200)
  await page.mouse.move(endX, endY, { steps: 5 }) // settle, lets rAF catch up
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(200)
}

test.describe('drag-and-drop builder dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Builder' }).click()
  })

  test('building a form via clicks: add fields, edit properties, see them in the live preview', async ({
    page,
  }) => {
    // Scoped to the live preview panel specifically: FieldCard renders
    // "Move Full name up" / "Remove Full name" etc. aria-labels on the
    // canvas, and Playwright's getByLabel does a substring match, so an
    // unscoped lookup for "Full name" is ambiguous the moment a field by
    // that label exists.
    const preview = page.locator('.builder-preview')

    // Add a text field via the palette's click-to-add path (the WCAG
    // 2.5.7 single-pointer alternative to dragging).
    await page.getByRole('button', { name: /^Text/ }).click()

    const labelInput = page.getByLabel('Label', { exact: true })
    await labelInput.fill('Full name')
    await page.getByRole('checkbox', { name: 'Required' }).check()

    // The live preview — the real FormRenderer/workflow store, not a
    // mock — reflects the edit immediately.
    await expect(preview.getByLabel('Full name')).toBeVisible()

    // Add a second field and wire a conditional dependency onto it.
    await page.getByRole('button', { name: /^Email/ }).click()
    await page.getByLabel('Label', { exact: true }).fill('Newsletter email')
    await page
      .getByRole('checkbox', { name: 'Only show this field conditionally' })
      .check()

    await expect(preview.getByLabel('Newsletter email')).not.toBeVisible()

    // Satisfying the condition (typing into "Full name", the referenced
    // field) reveals it.
    await preview.getByLabel('Full name').fill('Ada Lovelace')
    await expect(preview.getByLabel('Newsletter email')).toBeVisible()

    // The JSON view is the same schema object, not a re-derived summary.
    await page.getByRole('button', { name: 'Schema JSON' }).click()
    const json = page.getByLabel('Form schema JSON')
    await expect(json).toContainText('"label": "Full name"')
    await expect(json).toContainText('"type": "required"')
    await expect(json).toContainText('"operator": "notEmpty"')
  })

  test('dragging a field type from the palette onto the canvas adds it', async ({
    page,
  }) => {
    // Tall enough that the palette (8 field types) and the canvas panel
    // sit in the same screenful side by side. A drag that has to scroll
    // the page mid-gesture to bring its target into view is a real
    // thing @hello-pangea/dnd supports, but simulating that scroll
    // accurately with synthetic mouse events adds a lot of flakiness
    // for no real coverage gain here — the default 720px viewport was
    // clipping the canvas panel off the top of the screen by the time
    // the palette's later entries scrolled into view. Scoped to this
    // test only: the other two don't need the extra height, and it
    // shouldn't change what they're exercising.
    await page.setViewportSize({ width: 1280, height: 1400 })

    await expect(
      page.getByText('Drag a field type here, or click one in the palette.'),
    ).toBeVisible()

    // A pointer-simulated drag through @hello-pangea/dnd's mouse sensor
    // is inherently a little racy in headless Chromium — the sensor's
    // own lift/lower cycle runs on requestAnimationFrame timing that
    // doesn't always keep pace with back-to-back synthetic events, even
    // with the pauses inside dragOnto. `toPass` retries the whole
    // gesture rather than fail the test outright on the first miss; the
    // "still empty" guard keeps a retry from dropping a second field if
    // the first attempt actually landed and only the assertion below it
    // raced.
    await expect(async () => {
      const stillEmpty = await page.locator('.builder-canvas__empty').count()
      if (stillEmpty > 0) {
        await dragOnto(
          page,
          '.builder-palette__add:has-text("Dropdown")',
          '.builder-canvas__list',
        )
      }
      await expect(page.getByLabel('Label', { exact: true })).toHaveValue(
        'Dropdown',
      )
    }).toPass({ timeout: 20_000 })

    // The dropped field is now on the canvas (selected, per addField's
    // contract) and its default label appears in the live preview.
    await expect(
      page.getByText('Drag a field type here, or click one in the palette.'),
    ).not.toBeVisible()
    await expect(
      page.locator('.builder-preview').getByLabel('Dropdown'),
    ).toBeVisible()
  })

  test('dragging a field card reorders it within the canvas', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^Text/ }).click()
    await page.getByLabel('Label', { exact: true }).fill('First')
    await page.getByRole('button', { name: /^Email/ }).click()
    await page.getByLabel('Label', { exact: true }).fill('Second')

    // Both fields are on the canvas now, "First" above "Second". Drag
    // "First"'s card below "Second"'s. Wrapped in `toPass` for the same
    // reason as the palette drag above; the order check up front keeps
    // a retry from dragging a card that's already where it should be
    // (which would just flip it right back).
    await expect(async () => {
      const labels = await page
        .locator('.builder-field-card__label')
        .allTextContents()
      if (labels[0] !== 'Second') {
        await dragOnto(
          page,
          '.builder-field-card__select:has-text("First")',
          '.builder-field-card__select:has-text("Second")',
        )
      }
      const labelsNow = await page
        .locator('.builder-field-card__label')
        .allTextContents()
      expect(labelsNow[0]).toBe('Second')
    }).toPass({ timeout: 20_000 })

    // The JSON view is the same schema object driving the canvas, not a
    // separately-derived summary.
    await page.getByRole('button', { name: 'Schema JSON' }).click()

    // Wait for the JSON to reflect the reordered fields
    await expect(async () => {
      const json = await page.getByLabel('Form schema JSON').innerText()
      expect(json.indexOf('"Second"')).toBeLessThan(json.indexOf('"First"'))
    }).toPass({ timeout: 5_000 })
  })
})
