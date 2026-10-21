import { MessageCircle, type LucideIcon } from "lucide-react";
import type { LessonStatus, SegmentView } from "@/modules/content/types";
import { en } from "@/modules/i18n/en";
import { getLanguage, type LanguageCode, type LanguageDefinition } from "@/modules/language/registry";

/** Language colours (DESIGN.md §3.1); every pair ≥ 4.55:1. */
const LANGUAGE_CLASSES: Record<LanguageCode, string> = {
  ja: "bg-tag-bg text-tag-text",
  zh: "bg-danger-bg text-danger-text",
  en: "bg-info-bg text-info-dark",
};

const STATUS_CLASSES: Record<LessonStatus, { box: string; dot: string }> = {
  draft: { box: "bg-warning-bg text-warning-dark", dot: "bg-warning" },
  ready: { box: "bg-success-bg text-success-dark", dot: "bg-success" },
  archived: { box: "bg-soft text-copy", dot: "bg-muted" },
};

const chip = "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 text-caption font-bold";

/** Status shown as text, not only colour. */
export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  const tone = STATUS_CLASSES[status];
  return (
    <span className={`${chip} ${tone.box}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${tone.dot}`} />
      {en.lessonStatus[status]}
    </span>
  );
}

/** Language chip, with the lesson's own level label when it has one ("Japanese • N5"). */
export function LanguageBadge({ code, level }: { code: LanguageCode; level?: string | null }) {
  return (
    <span className={`${chip} ${LANGUAGE_CLASSES[code]}`}>
      {getLanguage(code).label}
      {level ? ` • ${level}` : null}
    </span>
  );
}

/**
 * UI label plus endonym (tagged with its lang). When they are the same word
 * (English), it is shown once, tagged with the language.
 */
export function LanguageName({ language, nativeClassName = "" }: { language: LanguageDefinition; nativeClassName?: string }) {
  if (language.label === language.nativeName) {
    return <span lang={language.htmlLang}>{language.label}</span>;
  }
  return (
    <>
      <span>{language.label}</span>{" "}
      <span lang={language.htmlLang} className={nativeClassName}>
        {language.nativeName}
      </span>
    </>
  );
}

const THUMB_TONES: Record<LanguageCode, string> = {
  ja: "bg-[linear-gradient(135deg,#7dd3fc,#a78bfa)]",
  zh: "bg-[linear-gradient(135deg,#fca5a5,#fcd34d)]",
  en: "bg-[linear-gradient(135deg,#fcd34d,#7dd3fc)]",
};

/**
 * Placeholder lesson art (DESIGN.md §4.5 Thumb): two-colour gradient, two soft
 * circles, the logo's two petals and a centred translucent circle with an icon.
 */
export function LessonThumb({
  code,
  icon: Icon = MessageCircle,
  className = "",
  iconSize = "md",
}: {
  code: LanguageCode;
  icon?: LucideIcon;
  className?: string;
  iconSize?: "sm" | "md";
}) {
  const circle = iconSize === "sm" ? "size-[39px]" : "size-[61px]";
  const glyph = iconSize === "sm" ? 23 : 36;
  return (
    <div aria-hidden="true" className={`relative overflow-hidden ${THUMB_TONES[code]} ${className}`}>
      <div className="absolute -top-[45%] right-[-14%] aspect-square w-[64%] rounded-full bg-white/28" />
      <div className="absolute -bottom-[45%] -left-[20%] aspect-square w-[58%] rounded-full bg-white/20" />
      <svg viewBox="100 0 170 310" className="absolute right-[6%] bottom-[-8%] h-[78%] opacity-85">
        <path
          d="M105 144 C112 94 168 24 221 12 C248 5 264 12 266 27 C270 58 225 104 192 120 C159 137 120 153 105 144Z"
          fill="#f5b0dc"
          stroke="#ffd5e9"
          strokeWidth="3"
          transform="rotate(-18 185 80)"
        />
        <path
          d="M105 166 C128 162 178 183 214 209 C246 233 259 263 253 282 C246 307 209 298 180 282 C142 262 111 223 105 166Z"
          fill="#a99ef8"
          stroke="#d1c2ff"
          strokeWidth="3"
          opacity=".85"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`flex ${circle} items-center justify-center rounded-full bg-white/55 text-ink ring-1 ring-white/80`}>
          <Icon size={glyph} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

/** Segments rendered as plain text, verbatim (whitespace preserved), language-tagged. */
export function SegmentList({ segments, languageCode }: { segments: SegmentView[]; languageCode: LanguageCode }) {
  const lang = getLanguage(languageCode).htmlLang;
  if (segments.length === 0) {
    return <p className="text-muted">{en.lesson.noSegments}</p>;
  }
  return (
    <ol className="flex flex-col divide-y divide-divider">
      {segments.map((segment) => (
        <li key={segment.position} className="flex gap-4 py-3 first:pt-0 last:pb-0">
          <span aria-hidden="true" className="num w-6 shrink-0 pt-2 text-right text-caption font-semibold text-muted">
            {segment.position + 1}
          </span>
          <p lang={lang} className="min-w-0 whitespace-pre-wrap text-transcript">
            {segment.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
