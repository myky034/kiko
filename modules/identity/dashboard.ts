import { LANGUAGE_CODES, isLanguageCode, type LanguageCode } from "@/modules/language/registry";
import { hasPermission, requirePermission } from "@/server/policy/permissions";
import type { Actor, IdentityRepository } from "./types";

export type DashboardData = {
  /** Learner role present: learning sections are shown. */
  isLearner: boolean;
  /** Owner role present: administration entry is shown. */
  isOwner: boolean;
  timezone: string | null;
  languages: LanguageCode[];
};

/** Reads only the actor's own profile data; there are no counts or metrics yet. */
export async function loadDashboard(
  actor: Actor,
  repository: IdentityRepository,
): Promise<DashboardData> {
  requirePermission(actor, "profile.read_self");

  const isLearner = actor.roles.includes("LEARNER");
  const enabled = isLearner
    ? new Set(
        (await repository.listLanguagePreferences(actor.userId))
          .filter((preference) => preference.enabled)
          .map((preference) => preference.languageCode)
          .filter(isLanguageCode),
      )
    : new Set<LanguageCode>();

  return {
    isLearner,
    isOwner: hasPermission(actor, "access.read_accounts"),
    timezone: actor.timezone,
    languages: LANGUAGE_CODES.filter((code) => enabled.has(code)),
  };
}

/** Where an active actor belongs before the dashboard can render. */
export function needsOnboarding(actor: Actor): boolean {
  return actor.roles.includes("LEARNER") && actor.onboardedAt === null;
}
