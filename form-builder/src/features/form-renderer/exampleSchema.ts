import type { FormSchema } from '@/types/schema'

/**
 * A demo schema exercising every field type — plus required/sync
 * validation, an async validation rule, and an async-conditional
 * `visibleWhen` — used by the App shell (so the renderer has something
 * real to prove itself against) and by the test suite. Not meant to ship
 * as real product copy.
 */
export const exampleFormSchema: FormSchema = {
  id: 'demo-form',
  title: 'Event Registration',
  description:
    'A two-step form exercising every field type the renderer supports.',
  steps: [
    {
      id: 'about-you',
      title: 'About you',
      description: 'Tell us who you are.',
      fields: [
        {
          id: 'field-full-name',
          name: 'fullName',
          type: 'text',
          label: 'Full name',
          placeholder: 'Ada Lovelace',
          validation: [{ type: 'required' }],
        },
        {
          id: 'field-email',
          name: 'email',
          type: 'email',
          label: 'Email address',
          placeholder: 'ada@example.com',
          validation: [{ type: 'required' }],
        },
        {
          id: 'field-birth-date',
          name: 'birthDate',
          type: 'date',
          label: 'Date of birth',
          helpText:
            'Used only to confirm you meet the minimum age for this event.',
        },
      ],
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'A few details to tailor your experience.',
      fields: [
        {
          id: 'field-years-experience',
          name: 'yearsExperience',
          type: 'number',
          label: 'Years of professional experience',
          placeholder: '0',
        },
        {
          id: 'field-role',
          name: 'role',
          type: 'select',
          label: 'Role',
          placeholder: 'Select a role',
          options: [
            { value: 'engineer', label: 'Engineer' },
            { value: 'designer', label: 'Designer' },
            { value: 'pm', label: 'Product Manager' },
            { value: 'other', label: 'Other' },
          ],
          validation: [{ type: 'required' }],
        },
        {
          id: 'field-contact-method',
          name: 'contactMethod',
          type: 'radio',
          label: 'Preferred contact method',
          options: [
            { value: 'email', label: 'Email' },
            { value: 'sms', label: 'SMS' },
            { value: 'none', label: "Don't contact me" },
          ],
        },
        {
          id: 'field-bio',
          name: 'bio',
          type: 'textarea',
          label: 'Short bio',
          placeholder: 'A sentence or two about you…',
          helpText: 'Shown on your public attendee profile.',
        },
        {
          id: 'field-promo-code',
          name: 'promoCode',
          type: 'text',
          label: 'Promo code',
          placeholder: 'Optional',
          helpText: 'Have a code? Enter it to unlock priority support below.',
          // The validation engine's headline example: an async check
          // against a (mocked) backend, debounced and race-safe. See
          // features/validation/asyncValidator.ts.
          validation: [
            {
              type: 'async',
              endpoint: '/api/check-promo-code',
              message: 'This code has already been used.',
            },
          ],
        },
        {
          id: 'field-priority-support',
          name: 'prioritySupport',
          type: 'checkbox',
          label: 'Enable priority support for this registration',
          // Hidden until promoCode's async check resolves valid — Field
          // B appearing based on an async result on Field A, not just a
          // plain value comparison.
          visibleWhen: {
            fieldName: 'promoCode',
            operator: 'asyncStatus',
            value: 'valid',
          },
        },
        {
          id: 'field-agree-to-terms',
          name: 'agreeToTerms',
          type: 'checkbox',
          label: 'I agree to the event code of conduct',
          validation: [{ type: 'required' }],
        },
      ],
    },
  ],
}
