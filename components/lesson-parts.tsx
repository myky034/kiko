import type { LessonStatus, SegmentView } from "@/modules/content/types";
import { getLanguage, type LanguageCode } from "@/modules/language/registry";

const STATUS_LABELS: Record<LessonStatus, string> = {
  draft: "Nháp",
  ready: "Sẵn sàng",
  archived: "Đã lưu trữ",
};

const STATUS_CLASSES: Record<LessonStatus, string> = {
  draft: "bg-accent-yellow text-warning-strong",
  ready: "bg-accent-mint text-foreground",
  archived: "bg-muted text-muted-foreground",
};

/** Status shown as text, not only color. */
export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function LanguageBadge({ code }: { code: LanguageCode }) {
  const language = getLanguage(code);
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-strong">
      {language.labelVi}
    </span>
  );
}

/** Segments rendered as plain text, verbatim (whitespace preserved), language-tagged. */
export function SegmentList({ segments, languageCode }: { segments: SegmentView[]; languageCode: LanguageCode }) {
  const lang = getLanguage(languageCode).htmlLang;
  if (segments.length === 0) {
    return <p className="text-muted-foreground">Bài chưa có đoạn nào.</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {segments.map((segment) => (
        <li key={segment.position} className="rounded-lg bg-surface">
          <p lang={lang} className="whitespace-pre-wrap text-transcript">
            {segment.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
