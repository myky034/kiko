/**
 * Supported target-language registry (zh, ja, en).
 *
 * Target language is a content attribute, separate from UI locale, script
 * variant and pronunciation locale. Script variants (simplified/traditional
 * Chinese) and English accent are unresolved decisions, so `htmlLang` stays at
 * the bare language subtag rather than guessing `zh-Hans` or `en-US`.
 */

export const LANGUAGE_CODES = ["zh", "ja", "en"] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export type ReadingNotation = "pinyin" | "kana" | "ipa";

export type LanguageDefinition = {
  code: LanguageCode;
  /** Vietnamese UI label (Vietnamese UI is a proposal, not yet approved). */
  labelVi: string;
  /** Endonym rendered in the language's own script. */
  nativeName: string;
  htmlLang: string;
  readingNotations: readonly ReadingNotation[];
  /** Guided stroke practice applies only where stroke data may exist. */
  supportsStrokePractice: boolean;
};

export const LANGUAGES: Readonly<Record<LanguageCode, LanguageDefinition>> = {
  zh: {
    code: "zh",
    labelVi: "Tiếng Trung",
    nativeName: "中文",
    htmlLang: "zh",
    readingNotations: ["pinyin"],
    supportsStrokePractice: true,
  },
  ja: {
    code: "ja",
    labelVi: "Tiếng Nhật",
    nativeName: "日本語",
    htmlLang: "ja",
    readingNotations: ["kana"],
    supportsStrokePractice: true,
  },
  en: {
    code: "en",
    labelVi: "Tiếng Anh",
    nativeName: "English",
    htmlLang: "en",
    readingNotations: ["ipa"],
    supportsStrokePractice: false,
  },
};

/** Exact, case-sensitive match against the registry; no normalization or fallback. */
export function isLanguageCode(value: unknown): value is LanguageCode {
  return (
    typeof value === "string" &&
    (LANGUAGE_CODES as readonly string[]).includes(value)
  );
}

export function getLanguage(code: LanguageCode): LanguageDefinition {
  return LANGUAGES[code];
}

export function listLanguages(): LanguageDefinition[] {
  return LANGUAGE_CODES.map((code) => LANGUAGES[code]);
}
