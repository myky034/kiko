/**
 * Calendar helpers for the UI. Every value is computed in the learner's own
 * time zone (AGENTS.md §13); an invalid or missing zone falls back to UTC.
 */

function safeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPart(now: Date, timeZone: string | null | undefined): DayPart {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: safeZone(timeZone) }).format(now),
  );
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** "Tue, Oct 21, 2026" */
export function longDate(now: Date, timeZone: string | null | undefined): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: safeZone(timeZone),
  }).format(now);
}

/** "Oct 21, 2026" */
export function mediumDate(value: Date, timeZone: string | null | undefined): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: safeZone(timeZone) }).format(value);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first index (0–6) of today in the learner's zone. */
export function weekdayIndex(now: Date, timeZone: string | null | undefined): number {
  const short = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: safeZone(timeZone) }).format(now);
  return Math.max(0, WEEKDAYS.indexOf(short));
}
