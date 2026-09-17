import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  toGuatemalaInputValue,
  fromGuatemalaInputValue,
  toGuatemalaDateInputValue,
  fromGuatemalaDateInputValue,
  fromGuatemalaDateInputValueEndOfDay,
} from '../dateFormat'

describe('toGuatemalaInputValue', () => {
  it('converts a UTC ISO instant to the Guatemala wall-clock datetime-local value', () => {
    // 14:30 UTC is 08:30 in Guatemala (fixed UTC-6, no DST).
    expect(toGuatemalaInputValue('2024-11-15T14:30:00Z')).toBe('2024-11-15T08:30')
  })

  it('rolls the calendar date back when the UTC instant is before Guatemala midnight offset', () => {
    // 02:00 UTC is 20:00 the previous day in Guatemala.
    expect(toGuatemalaInputValue('2024-11-15T02:00:00Z')).toBe('2024-11-14T20:00')
  })

  it('returns empty string for null/undefined input', () => {
    expect(toGuatemalaInputValue(null)).toBe('')
    expect(toGuatemalaInputValue(undefined)).toBe('')
  })
})

describe('fromGuatemalaInputValue', () => {
  it('converts a Guatemala wall-clock datetime-local value to a UTC ISO string', () => {
    expect(fromGuatemalaInputValue('2024-11-15T08:30')).toBe('2024-11-15T14:30:00.000Z')
  })
})

describe('round-trip', () => {
  it('toGuatemalaInputValue and fromGuatemalaInputValue are inverses for on-the-hour instants', () => {
    const original = '2024-11-15T14:30:00.000Z'
    const inputValue = toGuatemalaInputValue(original)
    const roundTripped = fromGuatemalaInputValue(inputValue)
    expect(roundTripped).toBe(original)
  })
})

describe('date-only helpers', () => {
  it('toGuatemalaDateInputValue extracts the Guatemala calendar date from a UTC instant', () => {
    // Midnight UTC is still the previous day (18:00) in Guatemala.
    expect(toGuatemalaDateInputValue('2024-11-15T00:00:00Z')).toBe('2024-11-14')
    expect(toGuatemalaDateInputValue('2024-11-15T06:00:00Z')).toBe('2024-11-15')
  })

  it('fromGuatemalaDateInputValue converts a Guatemala calendar date to that midnight in UTC (not a bare date passthrough — the backend field is a full OffsetDateTime)', () => {
    // Guatemala midnight (UTC-6) on 2024-11-15 is 06:00 UTC the same day.
    expect(fromGuatemalaDateInputValue('2024-11-15')).toBe('2024-11-15T06:00:00.000Z')
  })

  it('fromGuatemalaDateInputValueEndOfDay anchors to the end of the Guatemala calendar day, for inclusive range filters', () => {
    const result = fromGuatemalaDateInputValueEndOfDay('2024-11-15')
    // 2024-11-15T23:59 Guatemala (UTC-6) -> 2024-11-16T05:59 UTC.
    expect(result).toBe('2024-11-16T05:59:00.000Z')
  })
})

describe('formatDate/formatDateTime still behave as before (regression guard)', () => {
  it('formats a UTC timestamp in Guatemala time', () => {
    expect(formatDateTime('2024-11-15T14:30:00Z')).toBe('15/11/2024 08:30')
    expect(formatDate('2024-11-15T14:30:00Z')).toBe('15/11/2024')
  })
})
