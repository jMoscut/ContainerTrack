/**
 * ISO 6346 shipping container number format check (regex only).
 * This validates the FORMAT ONLY: 3 owner letters + 1 category letter (U/J/Z)
 * + 6 digits + 1 check digit. It does NOT compute/verify the ISO 6346 check
 * digit itself — that full validation happens server-side. This is purely
 * for immediate client-side feedback.
 */
export const CONTAINER_NUMBER_REGEX = /^[A-Z]{3}[UJZ][0-9]{6}[0-9]{1}$/;

// Verified against the real ISO 6346 check-digit algorithm (not just format) —
// safe to use as-is in a test container without the backend rejecting it.
export const CONTAINER_NUMBER_EXAMPLE = "MSCU1234566";

export function isValidContainerNumberFormat(value: string): boolean {
  return CONTAINER_NUMBER_REGEX.test(value);
}
