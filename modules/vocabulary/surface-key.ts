import type { LanguageCode } from "@/modules/language/registry";

/**
 * Key used only to warn about likely duplicates (never to merge): NFC,
 * trimmed, inner whitespace collapsed, and lower-cased for English only. The
 * surface itself is stored exactly as typed (AGENTS.md §13).
 */
export function surfaceKey(surface: string, language: LanguageCode): string {
  const normalised = surface.normalize("NFC").trim().replace(/\s+/gu, " ");
  return language === "en" ? normalised.toLocaleLowerCase("en") : normalised;
}
