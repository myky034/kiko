import { en } from "@/modules/i18n/en";
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
  /** Per-line content problems, e.g. "Line 12: …". */
  contentLines?: string[];
};

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
      return en.lessonForm.errors.sourceTooLong(issue.length, issue.limit);
    case "too_many_segments":
      return en.lessonForm.errors.tooManySegments(issue.count, issue.limit);
    case "segment_too_long":
      return en.lessonForm.errors.segmentTooLong(issue.line, issue.length, issue.limit);
  }
}

/** Trimmed metadata text; line breaks are rejected rather than removed. */
const singleLine = (label: string, max: number, optional: boolean) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !LINE_BREAK.test(value), { error: en.lessonForm.errors.noLineBreaks(label) })
    .refine((value) => optional || value.length > 0, { error: en.lessonForm.errors.required(label) })
    .refine((value) => codePointLength(value) <= max, {
      error: en.lessonForm.errors.tooLong(label, max),
    });

function parseTags(raw: string): { ok: true; tags: string[] } | { ok: false; error: string } {
  const tags: string[] = [];
  for (const piece of raw.split(TAG_SEPARATOR)) {
    const tag = piece.trim();
    if (tag.length === 0) continue;
    if (LINE_BREAK.test(tag)) return { ok: false, error: en.lessonForm.errors.topicLineBreak };
    if (codePointLength(tag) > METADATA_LIMITS.tag) {
      return { ok: false, error: en.lessonForm.errors.topicTooLong(METADATA_LIMITS.tag) };
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > METADATA_LIMITS.tags) {
    return { ok: false, error: en.lessonForm.errors.tooManyTopics(METADATA_LIMITS.tags) };
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
      return { ok: false, errors: { form: en.form.invalidFields } };
    }
  }

  const errors: LessonFormErrors = {};

  const title = singleLine(en.lessonForm.title, METADATA_LIMITS.title, false).safeParse(single(formData, "title"));
  if (!title.success) errors.title = title.error.issues[0]?.message ?? en.lessonForm.errors.invalidTitle;

  const language = z.enum(LANGUAGE_CODES).safeParse(single(formData, "languageCode"));
  if (!language.success) errors.languageCode = en.lessonForm.errors.noLanguage;

  const tags = parseTags(single(formData, "tags") ?? "");
  if (!tags.ok) errors.tags = tags.error;

  const level = singleLine(en.lessonForm.level, METADATA_LIMITS.levelLabel, true).safeParse(single(formData, "levelLabel") ?? "");
  if (!level.success) errors.levelLabel = level.error.issues[0]?.message;

  const sourceNoteRaw = (single(formData, "sourceNote") ?? "").trim();
  if (contentLength(sourceNoteRaw) > METADATA_LIMITS.sourceNote) {
    errors.sourceNote = en.lessonForm.errors.sourceNoteTooLong(METADATA_LIMITS.sourceNote);
  }

  const sourceText = single(formData, "content");
  let content: LessonContent | null = null;
  if (sourceText === null) {
    errors.content = en.lessonForm.errors.missingContent;
  } else {
    const segmentation = segmentSource(sourceText);
    if (segmentation.issues.length > 0) {
      errors.content = en.lessonForm.errors.contentOverLimit(
        CONTENT_LIMITS.sourceText,
        CONTENT_LIMITS.segmentsPerVersion,
        CONTENT_LIMITS.segment,
      );
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
