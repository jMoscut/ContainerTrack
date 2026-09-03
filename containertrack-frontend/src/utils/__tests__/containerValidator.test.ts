import { describe, expect, it } from 'vitest'
import {
  CONTAINER_NUMBER_EXAMPLE,
  CONTAINER_NUMBER_REGEX,
  isValidContainerNumberFormat,
} from '../containerValidator'

describe('isValidContainerNumberFormat', () => {
  it('accepts a well-formed ISO 6346 container number', () => {
    expect(isValidContainerNumberFormat('MSCU1234565')).toBe(true)
  })

  it('accepts the documented example value', () => {
    // Sanity check that the example constant itself satisfies the format.
    expect(isValidContainerNumberFormat(CONTAINER_NUMBER_EXAMPLE)).toBe(true)
  })

  it('accepts J and Z as the category letter, not just U', () => {
    expect(isValidContainerNumberFormat('MSCJ1234565')).toBe(true)
    expect(isValidContainerNumberFormat('MSCZ1234565')).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(isValidContainerNumberFormat('')).toBe(false)
  })

  it('rejects strings that are too short', () => {
    expect(isValidContainerNumberFormat('MSCU123456')).toBe(false)
  })

  it('rejects strings that are too long', () => {
    expect(isValidContainerNumberFormat('MSCU12345678')).toBe(false)
  })

  it('rejects lowercase owner letters', () => {
    expect(isValidContainerNumberFormat('mscu1234565')).toBe(false)
  })

  it('rejects a missing/invalid category letter (must be U, J, or Z)', () => {
    expect(isValidContainerNumberFormat('MSCA1234565')).toBe(false)
  })

  it('rejects non-digit characters in the numeric portion', () => {
    expect(isValidContainerNumberFormat('MSCU12A4565')).toBe(false)
  })

  it('rejects a format with fewer than 3 owner letters', () => {
    expect(isValidContainerNumberFormat('MSU1234565')).toBe(false)
  })

  it('does NOT reject a wrong ISO 6346 check digit (format-only validation)', () => {
    // The function intentionally does not compute/verify the check digit;
    // any trailing digit satisfies the regex as long as the format holds.
    expect(isValidContainerNumberFormat('MSCU1234569')).toBe(true)
  })
})

describe('CONTAINER_NUMBER_REGEX', () => {
  it('matches the same values as isValidContainerNumberFormat', () => {
    expect(CONTAINER_NUMBER_REGEX.test('MSCU1234565')).toBe(true)
    expect(CONTAINER_NUMBER_REGEX.test('invalid')).toBe(false)
  })
})
