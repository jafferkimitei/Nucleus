import { describe, expect, it } from 'vitest'

import { maskUntouchedErrors } from '../maskUntouchedErrors'

describe('maskUntouchedErrors', () => {
  it('hides an error for a field that has not been touched', () => {
    const result = maskUntouchedErrors({ name: 'Required.' }, {})
    expect(result['name']).toBeUndefined()
  })

  it('shows an error for a field that has been touched', () => {
    const result = maskUntouchedErrors({ name: 'Required.' }, { name: true })
    expect(result['name']).toBe('Required.')
  })

  it('leaves a passing (undefined) entry as undefined either way', () => {
    expect(
      maskUntouchedErrors({ name: undefined }, { name: true })['name'],
    ).toBeUndefined()
    expect(maskUntouchedErrors({ name: undefined }, {})['name']).toBeUndefined()
  })

  it('only produces entries for fields present in errors', () => {
    const result = maskUntouchedErrors(
      { name: 'Required.' },
      { name: true, other: true },
    )
    expect(Object.keys(result)).toEqual(['name'])
  })
})
