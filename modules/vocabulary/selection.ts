/**
 * Selections inside a segment, in Unicode code points (DEC-022, DEC-044).
 *
 * The browser reports UTF-16 offsets; storage and the database CHECK use code
 * points. Selections are trimmed of surrounding whitespace and must not split a
 * grapheme cluster (e.g. an emoji sequence or a base letter + combining mark).
 */

export type Selection = { start: number; end: number; text: string };

export type SelectionError = "empty" | "out_of_range" | "splits_grapheme" | "not_found";

/** Code-point index for a UTF-16 index into the same string. */
export function utf16ToCodePoint(text: string, utf16Index: number): number {
  return [...text.slice(0, utf16Index)].length;
}

function codePoints(text: string): string[] {
  return [...text];
}

/** Grapheme boundaries of `text`, as code-point indexes (always includes 0 and length). */
function graphemeBoundaries(text: string): Set<number> {
  const boundaries = new Set<number>([0]);
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let index = 0;
  for (const { segment } of segmenter.segment(text)) {
    index += codePoints(segment).length;
    boundaries.add(index);
  }
  return boundaries;
}

const WHITESPACE = /\s/u;

/**
 * Validates and normalises a selection given in code points: trims whitespace
 * at both ends (moving the offsets), then checks it is non-empty and on
 * grapheme boundaries.
 */
export function normaliseSelection(
  text: string,
  start: number,
  end: number,
): { ok: true; value: Selection } | { ok: false; error: SelectionError } {
  const points = codePoints(text);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > points.length || start >= end) {
    return { ok: false, error: start === end ? "empty" : "out_of_range" };
  }
  let from = start;
  let to = end;
  while (from < to && WHITESPACE.test(points[from])) from += 1;
  while (to > from && WHITESPACE.test(points[to - 1])) to -= 1;
  if (from >= to) return { ok: false, error: "empty" };
  const boundaries = graphemeBoundaries(text);
  if (!boundaries.has(from) || !boundaries.has(to)) return { ok: false, error: "splits_grapheme" };
  return { ok: true, value: { start: from, end: to, text: points.slice(from, to).join("") } };
}

/**
 * Keyboard/touch path: finds the `occurrence`-th (0-based) appearance of
 * `phrase` in `text` and returns it as a selection.
 */
export function locatePhrase(
  text: string,
  phrase: string,
  occurrence = 0,
): { ok: true; value: Selection } | { ok: false; error: SelectionError } {
  const needle = phrase.trim();
  if (needle.length === 0) return { ok: false, error: "empty" };
  let from = 0;
  for (let found = 0; ; found += 1) {
    const index = text.indexOf(needle, from);
    if (index === -1) return { ok: false, error: "not_found" };
    if (found === occurrence) {
      const start = utf16ToCodePoint(text, index);
      return normaliseSelection(text, start, start + codePoints(needle).length);
    }
    from = index + needle.length;
  }
}
