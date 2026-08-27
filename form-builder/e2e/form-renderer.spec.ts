import { expect, test } from '@playwright/test'

test.describe('metadata-driven form renderer', () => {
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
  })
})
