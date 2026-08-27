import { expect, test } from '@playwright/test'

test.describe('metadata-driven form renderer', () => {
  test('blocks advancing past required fields and reveals their errors', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Next' }).click()

    await expect(page.getByRole('group', { name: 'About you' })).toBeVisible()
    await expect(page.getByLabel('Full name')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page.getByLabel('Email address')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page.getByRole('alert')).toHaveCount(2)
  })

  test('fills a multi-step form entirely rendered from the schema', async ({
    page,
  }) => {
    await page.goto('/')

    // Step 1: About you
    await expect(page.getByRole('group', { name: 'About you' })).toBeVisible()
    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Email address').fill('ada@example.com')
    await page.getByLabel('Date of birth').fill('1990-12-10')

    await page.getByRole('button', { name: 'Next' }).click()

    // Step 2: Preferences
    await expect(page.getByRole('group', { name: 'Preferences' })).toBeVisible()
    await page.getByLabel('Years of professional experience').fill('12')
    await page.getByLabel('Role').selectOption('engineer')
    await page.getByLabel('SMS').check()
    await page.getByLabel('Short bio').fill('Mathematician and writer.')
    await page.getByLabel('I agree to the event code of conduct').check()

    // Next is disabled on the last step; Back returns to step 1 without
    // losing what was entered there.
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByLabel('Full name')).toHaveValue('Ada Lovelace')

    await page.getByRole('button', { name: 'Next' }).click()

    // The debug panel echoes the live values object — the same schema
    // and controller the form is rendered from, not a hardcoded summary.
    const debugPanel = page.getByRole('region', { name: 'Live form values' })
    await expect(debugPanel).toContainText('"fullName": "Ada Lovelace"')
    await expect(debugPanel).toContainText('"email": "ada@example.com"')
    await expect(debugPanel).toContainText('"yearsExperience": 12')
    await expect(debugPanel).toContainText('"role": "engineer"')
    await expect(debugPanel).toContainText('"contactMethod": "sms"')
    await expect(debugPanel).toContainText('"agreeToTerms": true')
    await expect(debugPanel).toContainText('Dirty: yes')
  })

  test('the progress list gates step navigation and Start over resets everything', async ({
    page,
  }) => {
    await page.goto('/')

    const progress = page.getByRole('list', { name: 'Form steps' })

    // "Preferences" hasn't been visited yet, so it isn't clickable — the
    // workflow engine won't let you skip ahead of the step you're on.
    await expect(
      progress.getByRole('button', { name: 'Preferences' }),
    ).toBeDisabled()

    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Email address').fill('ada@example.com')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('group', { name: 'Preferences' })).toBeVisible()

    // Now that it's been visited, jumping back to "About you" via the
    // progress list (not the Back button) should work and preserve data.
    await progress.getByRole('button', { name: 'About you' }).click()
    await expect(page.getByRole('group', { name: 'About you' })).toBeVisible()
    await expect(page.getByLabel('Full name')).toHaveValue('Ada Lovelace')

    // Start over clears the value and returns to step 1.
    await page.getByRole('button', { name: 'Start over' }).click()
    await expect(page.getByLabel('Full name')).toHaveValue('')
    const debugPanel = page.getByRole('region', { name: 'Live form values' })
    await expect(debugPanel).toContainText('Dirty: no')
  })

  test('an async validation check on one field reveals another once it passes', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Email address').fill('ada@example.com')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('group', { name: 'Preferences' })).toBeVisible()

    // "Enable priority support" is hidden until Promo code's async check
    // resolves valid — the project brief's "async API check on Field A
    // hiding Field B" example, live.
    const prioritySupport = page.getByLabel(
      'Enable priority support for this registration',
    )
    await expect(prioritySupport).not.toBeVisible()

    const promoCode = page.getByLabel('Promo code')
    await promoCode.fill('USED')

    // While the (mocked) network round trip is in flight, Next shows
    // that a check is in progress and can't be clicked past.
    await expect(page.getByRole('status')).toHaveText('Checking…')
    await expect(page.getByRole('button', { name: 'Checking…' })).toBeDisabled()

    // A blocklisted code resolves invalid — Field B stays hidden, and
    // the error is field-specific, not a generic step-level failure. The
    // check is no longer in flight, so the button reverts from
    // "Checking…" to its normal label — it stays disabled here only
    // because Preferences is the last step, same as every other field on
    // it (see the "fills a multi-step form" test).
    await expect(page.getByRole('alert')).toHaveText(
      'This code has already been used.',
    )
    await expect(prioritySupport).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()

    // Correcting the value re-triggers the check; a non-blocklisted code
    // resolves valid and reveals the dependent field.
    await promoCode.fill('FRESH50')
    await expect(page.getByRole('status')).toHaveText('Checking…')
    await expect(prioritySupport).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)

    await prioritySupport.check()
    await page.getByLabel('Role').selectOption('engineer')
    await page.getByLabel('I agree to the event code of conduct').check()

    // Preferences is the last step (Next stays disabled here regardless
    // of validity — see above), so there's no further step to advance
    // into; the debug panel already reflects live values as they're
    // entered, same as it does mid-form in the other tests.
    const debugPanel = page.getByRole('region', { name: 'Live form values' })
    await expect(debugPanel).toContainText('"promoCode": "FRESH50"')
    await expect(debugPanel).toContainText('"prioritySupport": true')
  })
})
