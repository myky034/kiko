import type {
  LanguageCode,
  LanguageDefinition,
  ReadingNotation,
} from "@/modules/language/registry";

const NOTATION_LABELS: Record<ReadingNotation, string> = {
  pinyin: "Pinyin",
  kana: "Kana / furigana",
  ipa: "IPA",
};

type ScriptSample = { text: string; lang: string };

/**
 * Static glyph-rendering samples for checking fonts, not lesson content.
 * Romanization/phonetic lines use BCP 47 tags so they get the IPA-capable stack.
 */
const SCRIPT_SAMPLES: Record<LanguageCode, readonly ScriptSample[]> = {
  zh: [
    { text: "汉字 漢字 你好", lang: "zh" },
    { text: "nǐ hǎo · lǜ · nǚ", lang: "zh-Latn-pinyin" },
  ],
  ja: [
    { text: "ひらがな カタカナ 漢字", lang: "ja" },
    { text: "日本語（にほんご）", lang: "ja" },
  ],
  en: [
    { text: "pronunciation", lang: "en" },
    { text: "/prəˌnʌnsiˈeɪʃən/ · /θɪŋk/ · /ʒ ŋ ɚ/", lang: "en-fonipa" },
  ],
};

export function LanguageCard({ language }: { language: LanguageDefinition }) {
  const titleId = `language-${language.code}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-1 flex-col gap-4 rounded-panel border border-border bg-surface p-6"
    >
      <header className="flex flex-col gap-1">
        <h3 id={titleId} className="text-lg font-semibold">
          {language.labelVi}
        </h3>
        <p lang={language.htmlLang} className="text-2xl">
          {language.nativeName}
        </p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-text">Mã</dt>
        <dd>
          <code>{language.code}</code>
        </dd>
        <dt className="text-muted-text">Cách đọc</dt>
        <dd>
          {language.readingNotations
            .map((notation) => NOTATION_LABELS[notation])
            .join(", ")}
        </dd>
        <dt className="text-muted-text">Luyện nét</dt>
        <dd>
          {language.supportsStrokePractice
            ? "Khi có dữ liệu nét hợp lệ"
            : "Không áp dụng"}
        </dd>
      </dl>

      <figure className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        <figcaption className="text-xs text-muted-text">
          Mẫu kiểm tra hiển thị chữ
        </figcaption>
        {SCRIPT_SAMPLES[language.code].map((sample) => (
          <p key={sample.text} lang={sample.lang} className="text-transcript">
            {sample.text}
          </p>
        ))}
      </figure>
    </article>
  );
}
