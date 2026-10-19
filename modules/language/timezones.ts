/**
 * IANA timezone validation and listing.
 *
 * V8's ICU data reports legacy CLDR names (e.g. `Asia/Saigon`) and omits current
 * IANA names such as `Asia/Ho_Chi_Minh`, although it accepts both. Validation
 * therefore checks the IANA name shape (case-sensitive, no raw UTC offsets) and
 * that the runtime recognizes the zone, instead of requiring list membership.
 */

const IANA_NAME = /^(?:UTC|[A-Z][A-Za-z_]*(?:\/[A-Z][A-Za-z0-9_+-]*)+)$/;

export function isSupportedTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64 || !IANA_NAME.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Runtime zones plus UTC and any `include` values (e.g. the configured default). */
export function listSupportedTimeZones(include: readonly (string | null | undefined)[] = []): string[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add("UTC");
  for (const zone of include) if (isSupportedTimeZone(zone)) zones.add(zone);
  return [...zones].filter(isSupportedTimeZone).sort();
}
