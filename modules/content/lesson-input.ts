import { z } from "zod";
import { LANGUAGE_CODES, type LanguageCode } from "@/modules/language/registry";
import { codePointLength, contentLength, segmentSource, CONTENT_LIMITS, type SegmentationIssue } from "./segmentation";
import type { LessonContent, LessonMetadata } from "./types";

/** Metadata limits (DEC-022, DEC-023), in code points. */
export const METADATA_LIMITS = {
  title: 200,
  tags: 5,
  tag: 32,
  levelLabel: 32,
  sourceNote: 1_000,
} as const;

export type LessonField =
  | "title"
  | "languageCode"
  | "tags"
  | "levelLabel"
  | "sourceNote"
  | "content"
  | "form";

export type LessonFormErrors = Partial<Record<LessonField, string>> & {
  /** Per-line content problems, e.g. "Dòng 12: …". */
  contentLines?: string[];
};

const numberVi = new Intl.NumberFormat("vi-VN");
const n = (value: number) => numberVi.format(value);

const LINE_BREAK = /[\r\n]/;
/** Tag separators: ASCII comma, fullwidth comma, ideographic comma. */
const TAG_SEPARATOR = /[,，、]/;

function isFrameworkField(name: string): boolean {
  return name.startsWith("$ACTION");
}

function single(formData: FormData, name: string): string | null {
  const values = formData.getAll(name);
  if (values.length !== 1 || typeof values[0] !== "string") return null;
  return values[0];
}

export function describeSegmentationIssue(issue: SegmentationIssue): string {
  switch (issue.kind) {
    case "source_too_long":
      return `Nội dung dài ${n(issue.length)} ký tự, vượt giới hạn ${n(issue.limit)} (mỗi lần xuống dòng tính 1).`;
    case "too_many_segments":
      return `Có ${n(issue.count)} đoạn, vượt giới hạn ${n(issue.limit)} đoạn.`;
    case "segment_too_long":
      return `Dòng ${n(issue.line)}: đoạn dài ${n(issue.length)} ký tự, vượt giới hạn ${n(issue.limit)}.`;
  }
}

/** Trimmed metadata text; line breaks are rejected rather than removed. */
const singleLine = (label: string, max: number, optional: boolean) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !LINE_BREAK.test(value), { error: `${label} không được xuống dòng.` })
    .refine((value) => optional || value.length > 0, { error: `Nhập ${label.toLowerCase()}.` })
    .refine((value) => codePointLength(value) <= max, {
      error: `${label} tối đa ${n(max)} ký tự.`,
    });

function parseTags(raw: string): { ok: true; tags: string[] } | { ok: false; error: string } {
  const tags: string[] = [];
  for (const piece of raw.split(TAG_SEPARATOR)) {
    const tag = piece.trim();
    if (tag.length === 0) continue;
    if (LINE_BREAK.test(tag)) return { ok: false, error: "Chủ đề không được xuống dòng." };
    if (codePointLength(tag) > METADATA_LIMITS.tag) {
      return { ok: false, error: `Mỗi chủ đề tối đa ${n(METADATA_LIMITS.tag)} ký tự.` };
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > METADATA_LIMITS.tags) {
    return { ok: false, error: `Tối đa ${n(METADATA_LIMITS.tags)} chủ đề.` };
  }
  return { ok: true, tags };
}

export type ParsedLessonForm = {
  metadata: LessonMetadata;
  content: LessonContent;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: LessonFormErrors };

const METADATA_FIELDS = ["title", "languageCode", "tags", "levelLabel", "sourceNote", "content"] as const;

/**
 * Parses lesson metadata + content with an explicit allowlist (`extraFields`
 * adds e.g. clientRequestId / expectedVersion). Content is never modified:
 * segmentation reports problems instead of trimming or truncating.
 */
export function parseLessonForm(
  formData: FormData,
  extraFields: readonly string[],
): ParseResult<ParsedLessonForm> {
  const allowed = new Set<string>([...METADATA_FIELDS, ...extraFields]);
  for (const name of new Set(formData.keys())) {
    if (!allowed.has(name) && !isFrameworkField(name)) {
      return { ok: false, errors: { form: "Biểu mẫu chứa trường không hợp lệ." } };
    }
  }

  const errors: LessonFormErrors = {};

  const title = singleLine("Tiêu đề", METADATA_LIMITS.title, false).safeParse(single(formData, "title"));
  if (!title.success) errors.title = title.error.issues[0]?.message ?? "Tiêu đề không hợp lệ.";

  const language = z.enum(LANGUAGE_CODES).safeParse(single(formData, "languageCode"));
  if (!language.success) errors.languageCode = "Chọn ngôn ngữ của bài.";

  const tags = parseTags(single(formData, "tags") ?? "");
  if (!tags.ok) errors.tags = tags.error;

  const level = singleLine("Mức độ", METADATA_LIMITS.levelLabel, true).safeParse(single(formData, "levelLabel") ?? "");
  if (!level.success) errors.levelLabel = level.error.issues[0]?.message;

  const sourceNoteRaw = (single(formData, "sourceNote") ?? "").trim();
  if (contentLength(sourceNoteRaw) > METADATA_LIMITS.sourceNote) {
    errors.sourceNote = `Ghi chú nguồn tối đa ${n(METADATA_LIMITS.sourceNote)} ký tự.`;
  }

  const sourceText = single(formData, "content");
  let content: LessonContent | null = null;
  if (sourceText === null) {
    errors.content = "Thiếu nội dung.";
  } else {
    const segmentation = segmentSource(sourceText);
    if (segmentation.issues.length > 0) {
      errors.content = `Nội dung vượt giới hạn (tối đa ${n(CONTENT_LIMITS.sourceText)} ký tự, ${n(
        CONTENT_LIMITS.segmentsPerVersion,
      )} đoạn, ${n(CONTENT_LIMITS.segment)} ký tự mỗi đoạn). Không có gì bị cắt bớt.`;
      errors.contentLines = segmentation.issues.map(describeSegmentationIssue);
    } else {
      content = { sourceText, segments: segmentation.segments };
    }
  }

  if (Object.keys(errors).length > 0 || !title.success || !language.success || !tags.ok || !level.success || !content) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      metadata: {
        title: title.data,
        languageCode: language.data as LanguageCode,
        tags: tags.tags,
        levelLabel: level.data.length > 0 ? level.data : null,
        sourceNote: sourceNoteRaw.length > 0 ? sourceNoteRaw : null,
      },
      content,
    },
  };
}

const uuidSchema = z.uuid();

export function parseClientRequestId(formData: FormData): string | null {
  const parsed = uuidSchema.safeParse(single(formData, "clientRequestId"));
  return parsed.success ? parsed.data : null;
}

export function parseExpectedVersion(formData: FormData): number | null {
  const raw = single(formData, "expectedVersion");
  if (raw === null || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  return Number(raw);
}

export function parseLessonId(value: unknown): string | null {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Exact allowlist for single-purpose forms (publish/archive/delete). */
export function hasOnlyFields(formData: FormData, fields: readonly string[]): boolean {
  const allowed = new Set(fields);
  return [...new Set(formData.keys())].every((name) => allowed.has(name) || isFrameworkField(name));
}
