import "server-only";
import { cache } from "react";
import type { Actor } from "@/modules/identity/types";
import { resolveLearningLanguage } from "@/modules/language/learning-language";
import { LANGUAGE_CODES, isLanguageCode, type LanguageCode } from "@/modules/language/registry";
import { getAccessDependencies } from "@/server/identity";

export type LearningContext = {
  /** Language whose content is shown; null when the actor has none (e.g. Owner-only). */
  current: LanguageCode | null;
  /** The actor's own enabled learning languages, in registry order. */
  options: LanguageCode[];
};

/** The actor's enabled languages, read from their own preferences only. */
export async function enabledLanguages(actor: Actor): Promise<LanguageCode[]> {
  if (!actor.roles.includes("LEARNER")) return [];
  const { repository } = await getAccessDependencies();
  const enabled = new Set(
    (await repository.listLanguagePreferences(actor.userId))
      .filter((preference) => preference.enabled)
      .map((preference) => preference.languageCode)
      .filter(isLanguageCode),
  );
  return LANGUAGE_CODES.filter((code) => enabled.has(code));
}

/** Per-request learning language: the stored choice (DEC-037) validated against enabled languages. */
export const getLearningContext = cache(async (actor: Actor): Promise<LearningContext> => {
  const options = await enabledLanguages(actor);
  return { current: resolveLearningLanguage(actor.learningLanguage, options), options };
});
