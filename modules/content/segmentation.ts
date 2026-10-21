/**
 * Content entry rule `line-v1` (DEC-021) and length counting (DEC-022).
 *
 * Shared verbatim by the browser counter, the server and the seed script, and
 * mirrored by PostgreSQL CHECK constraints. Dependency-free and limited to
 * erasable TypeScript so Node can import it from .mjs scripts.
 *
 * Counting unit: Unicode code points (`[...text].length`, PostgreSQL
 * `char_length` on a UTF-8 database). Each line-break sequence (CRLF, CR, LF)
 * counts as 1, because browsers submit textarea line breaks as CRLF.
 */

export const SEGMENTATION_RULE = "line-v1";

export const CONTENT_LIMITS = {
  /** Code points in source_text, line breaks counted as 1. */
  sourceText: 100_000,
  segmentsPerVersion: 2_000,
  /** Code points per segment (one line, no line break). */
  segment: 2_000,
} as const;

const LINE_BREAK = /\r\n|\r|\n/;
const BLANK_LINE = /^\p{White_Space}*$/u;

/** Code points of a string; e.g. "😀" = 1, "👨‍👩‍👧" = 5. */
export function codePointLength(text: string): number {
  return [...text].length;
}

/** Content length per DEC-022: code points with every line break counted once. */
export function contentLength(text: string): number {
  return codePointLength(text.replace(/\r\n/g, "\n"));
}

export type SegmentDraft = {
  /** 0-based order among non-blank lines. */
  position: number;
  /** 1-based line number in source_text, for error messages. */
  line: number;
  /** The line exactly as entered. */
  text: string;
};

export type SegmentationIssue =
  | { kind: "source_too_long"; length: number; limit: number }
  | { kind: "too_many_segments"; count: number; limit: number }
  | { kind: "segment_too_long"; line: number; length: number; limit: number };

export type SegmentationResult = {
  segments: SegmentDraft[];
  sourceLength: number;
  issues: SegmentationIssue[];
};

export function isBlankLine(line: string): boolean {
  return BLANK_LINE.test(line);
}

/**
 * Splits source text into segments without changing any line. Issues are
 * reported, never "fixed": nothing is trimmed, normalized or truncated.
 */
export function segmentSource(sourceText: string): SegmentationResult {
  const issues: SegmentationIssue[] = [];
  const sourceLength = contentLength(sourceText);
  if (sourceLength > CONTENT_LIMITS.sourceText) {
    issues.push({ kind: "source_too_long", length: sourceLength, limit: CONTENT_LIMITS.sourceText });
  }

  const segments: SegmentDraft[] = [];
  const lines = sourceText.length === 0 ? [] : sourceText.split(LINE_BREAK);
  lines.forEach((text, index) => {
    if (isBlankLine(text)) return;
    const length = codePointLength(text);
    if (length > CONTENT_LIMITS.segment) {
      issues.push({ kind: "segment_too_long", line: index + 1, length, limit: CONTENT_LIMITS.segment });
    }
    segments.push({ position: segments.length, line: index + 1, text });
  });

  if (segments.length > CONTENT_LIMITS.segmentsPerVersion) {
    issues.push({ kind: "too_many_segments", count: segments.length, limit: CONTENT_LIMITS.segmentsPerVersion });
  }
  return { segments, sourceLength, issues };
}
