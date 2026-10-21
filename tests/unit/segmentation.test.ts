import { describe, expect, it } from "vitest";
import {
  CONTENT_LIMITS,
  codePointLength,
  contentLength,
  isBlankLine,
  segmentSource,
} from "@/modules/content/segmentation";

describe("counting (DEC-022)", () => {
  it.each([
    ["😀", 1],
    ["👨‍👩‍👧", 5],
    ["🇻🇳", 2],
    ["é", 1],
    ["é", 2],
    ["你好", 2],
    ["かな", 2],
  ])("counts %j as %i code points", (text, expected) => {
    expect(codePointLength(text)).toBe(expected);
    // UTF-16 length differs for astral characters; it is not the unit.
    if (text === "😀") expect(text.length).toBe(2);
  });

  it("counts every line break sequence once", () => {
    expect(contentLength("a\r\nb")).toBe(3);
    expect(contentLength("a\nb")).toBe(3);
    expect(contentLength("a\rb")).toBe(3);
    expect(contentLength("a\r\n\r\nb")).toBe(4);
  });
});

describe("line-v1 segmentation (DEC-021)", () => {
  it("makes each non-blank line one segment, verbatim", () => {
    const result = segmentSource("  leading\ttab\r\ntrailing  \n\n中文没有空格，也不按标点拆分。第二句。\rlast");
    expect(result.issues).toEqual([]);
    expect(result.segments).toEqual([
      { position: 0, line: 1, text: "  leading\ttab" },
      { position: 1, line: 2, text: "trailing  " },
      { position: 2, line: 4, text: "中文没有空格，也不按标点拆分。第二句。" },
      { position: 3, line: 5, text: "last" },
    ]);
  });

  it.each([
    ["", true],
    ["   ", true],
    ["\t", true],
    ["　　", true],
    [" ", true],
    ["​", false],
    ["﻿", false],
    ["a", false],
  ])("treats %j as blank: %s", (line, blank) => {
    expect(isBlankLine(line)).toBe(blank);
  });

  it("does not normalize Unicode", () => {
    const decomposed = "Café";
    expect(segmentSource(decomposed).segments[0].text).toBe(decomposed);
  });

  it("returns no segments for empty or blank-only text", () => {
    expect(segmentSource("").segments).toEqual([]);
    expect(segmentSource("\n 　\r\n").segments).toEqual([]);
  });

  it("reports an over-long segment with its line number instead of truncating", () => {
    const long = "😀".repeat(CONTENT_LIMITS.segment + 1);
    const result = segmentSource(`ok\n${long}`);
    expect(result.issues).toEqual([{ kind: "segment_too_long", line: 2, length: 2001, limit: 2000 }]);
    expect(result.segments[1].text).toBe(long);
  });

  it("accepts exactly 2,000 segments and 2,000 code points each, rejects one more", () => {
    expect(segmentSource("😀".repeat(2000)).issues).toEqual([]);
    const lines = Array.from({ length: 2000 }, (_, i) => `${i}`);
    expect(segmentSource(lines.join("\n")).issues).toEqual([]);
    expect(segmentSource([...lines, "x"].join("\n")).issues).toContainEqual({
      kind: "too_many_segments",
      count: 2001,
      limit: 2000,
    });
  });

  it("applies the 100,000 total to source_text including blank lines and line breaks", () => {
    const atLimit = "a".repeat(99_999) + "\n";
    expect(contentLength(atLimit)).toBe(100_000);
    expect(segmentSource(atLimit).issues.filter((i) => i.kind === "source_too_long")).toEqual([]);
    const crlf = "a".repeat(99_999) + "\r\n";
    expect(segmentSource(crlf).issues.filter((i) => i.kind === "source_too_long")).toEqual([]);
    const over = "a".repeat(99_999) + "\n\n";
    expect(segmentSource(over).issues).toContainEqual({ kind: "source_too_long", length: 100_001, limit: 100_000 });
  });
});
