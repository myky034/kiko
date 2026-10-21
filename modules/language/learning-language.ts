import { isLanguageCode, type LanguageCode } from "./registry";

/**
 * The language whose content pages show: the stored choice when it is one of
 * the learner's enabled languages, otherwise the first enabled one (or null).
 */
export function resolveLearningLanguage(
  stored: string | null | undefined,
  enabled: readonly LanguageCode[],
): LanguageCode | null {
  if (isLanguageCode(stored) && enabled.includes(stored)) return stored;
  return enabled[0] ?? null;
}

/** Allowlisted form parse: exactly one `language` field naming an enabled language. */
export function parseLearningLanguageForm(formData: FormData, enabled: readonly LanguageCode[]): LanguageCode | null {
  for (const name of new Set(formData.keys())) {
    if (name !== "language" && !name.startsWith("$ACTION")) return null;
  }
  const values = formData.getAll("language");
  if (values.length !== 1) return null;
  const value = values[0];
  return typeof value === "string" && isLanguageCode(value) && enabled.includes(value) ? value : null;
}
