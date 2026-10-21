import { en } from "@/modules/i18n/en";
import type { Actor } from "./types";

export type AccountSummary = {
  /** First letter of the display name (or verified email), for the avatar. */
  initial: string;
  /** The user's name from their Google profile; falls back to the role label. */
  name: string;
  /** The actor's real role label (Learner preferred when both roles are held). */
  roleLabel: string;
};

function firstLetter(value: string | null | undefined): string | null {
  const first = value ? [...value.trim()][0] : undefined;
  return first && /\p{L}|\p{N}/u.test(first) ? first.toLocaleUpperCase() : null;
}

export function accountSummary(actor: Actor): AccountSummary {
  const role = actor.roles.includes("LEARNER") ? "LEARNER" : "OWNER";
  const roleLabel = en.shell.roles[role];
  const name = actor.displayName?.trim() || roleLabel;
  return { initial: firstLetter(actor.displayName) ?? firstLetter(actor.email) ?? "K", name, roleLabel };
}

/**
 * Google profile name from the verified JWT's user_metadata. The user can edit
 * user_metadata, so it is display-only: normalised, control characters
 * removed, length-limited, and rendered as text.
 */
export function displayNameOf(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const raw = [record.full_name, record.name].find((value): value is string => typeof value === "string");
  if (!raw) return null;
  const clean = raw.normalize("NFC").replace(/\p{Cc}|\p{Cf}/gu, "").replace(/\s+/g, " ").trim();
  if (clean.length === 0) return null;
  const points = [...clean];
  return points.length > 60 ? `${points.slice(0, 60).join("")}…` : clean;
}
