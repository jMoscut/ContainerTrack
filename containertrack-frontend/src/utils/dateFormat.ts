import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { format as formatDateFns } from "date-fns";

const GUATEMALA_TZ = "America/Guatemala"; // fixed UTC-6, no DST

/** Formats an ISO8601 UTC timestamp as DD/MM/YYYY HH:mm in Guatemala local time. */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    return formatInTimeZone(isoString, GUATEMALA_TZ, "dd/MM/yyyy HH:mm");
  } catch {
    return "-";
  }
}

/** Formats an ISO8601 UTC timestamp/date as DD/MM/YYYY in Guatemala local time. */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    return formatInTimeZone(isoString, GUATEMALA_TZ, "dd/MM/yyyy");
  } catch {
    return "-";
  }
}

/** Converts a date to an ISO date string (YYYY-MM-DD) suitable for date-only API fields. */
export function toIsoDate(date: Date): string {
  return formatInTimeZone(date, GUATEMALA_TZ, "yyyy-MM-dd");
}

/**
 * Converts a UTC ISO8601 timestamp to the "YYYY-MM-DDTHH:mm" wall-clock string
 * expected by <input type="datetime-local">, representing that instant in
 * Guatemala local time (fixed UTC-6).
 */
export function toGuatemalaInputValue(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const zoned = toZonedTime(isoString, GUATEMALA_TZ);
    if (Number.isNaN(zoned.getTime())) return "";
    return formatDateFns(zoned, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

/**
 * Converts a raw <input type="datetime-local"> value (assumed to represent
 * Guatemala wall-clock time) to a proper UTC ISO8601 string for the API.
 */
export function fromGuatemalaInputValue(inputValue: string): string {
  return fromZonedTime(inputValue, GUATEMALA_TZ).toISOString();
}

/**
 * Converts a UTC ISO8601 timestamp/date to the "YYYY-MM-DD" value expected by
 * <input type="date">, representing that instant's date in Guatemala local time.
 */
export function toGuatemalaDateInputValue(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    return formatInTimeZone(isoString, GUATEMALA_TZ, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

/**
 * Converts a raw <input type="date"> value (assumed to represent a Guatemala
 * calendar date) to a UTC ISO8601 string for the API.
 *
 * IMPORTANT: despite the field being date-only in the UI, every backend field this
 * feeds (estimatedDepartureDate, estimatedArrivalPort, estimatedArrivalWarehouse,
 * actualDepartureDate, actualArrivalPort, actualDeparturePort, actualArrivalWarehouse,
 * freeDaysExpiry) is a full `OffsetDateTime` on the Java side — sending a bare
 * "YYYY-MM-DD" string fails Jackson deserialization outright (500). This used to be an
 * identity pass-through and was a real, live bug affecting container creation, every
 * lifecycle transition, the calendar's inline date edit, and the container detail page's
 * inline edit — treat the picked date as Guatemala-local midnight and convert to the
 * correct UTC instant, matching fromGuatemalaInputValue's approach.
 */
export function fromGuatemalaDateInputValue(inputValue: string): string {
  if (!inputValue) return inputValue;
  return fromGuatemalaInputValue(`${inputValue}T00:00`);
}

/**
 * Same conversion as `fromGuatemalaDateInputValue`, but anchored to the LAST instant of
 * that Guatemala calendar day (23:59:59) instead of midnight. Use this for the *end* of a
 * date-range filter ("hasta") so the selected day is included in full — anchoring it to
 * midnight-start like the field-edit helper would effectively exclude the entire day.
 */
export function fromGuatemalaDateInputValueEndOfDay(inputValue: string): string {
  if (!inputValue) return inputValue;
  return fromGuatemalaInputValue(`${inputValue}T23:59`);
}
