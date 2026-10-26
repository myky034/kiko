import { describe, expect, it } from "vitest";
import { locatePhrase, normaliseSelection, utf16ToCodePoint } from "@/modules/vocabulary/selection";
import { surfaceKey } from "@/modules/vocabulary/surface-key";

describe("selection offsets (code points)", () => {
  it("converts browser UTF-16 offsets to code points", () => {
    const text = "😀今日";
    expect(utf16ToCodePoint(text, 2)).toBe(1); // after the emoji (two UTF-16 units)
    expect(utf16ToCodePoint(text, 3)).toBe(2);
  });

  it("trims surrounding whitespace and moves the offsets", () => {
    expect(normaliseSelection("good morning all", 4, 13)).toEqual({ ok: true, value: { start: 5, end: 12, text: "morning" } });
    expect(normaliseSelection("今日　は", 2, 4)).toEqual({ ok: true, value: { start: 3, end: 4, text: "は" } });
  });

  it("rejects empty, whitespace-only and out-of-range selections", () => {
    expect(normaliseSelection("abc", 1, 1)).toEqual({ ok: false, error: "empty" });
    expect(normaliseSelection("a  b", 1, 3)).toEqual({ ok: false, error: "empty" });
    expect(normaliseSelection("abc", 2, 9)).toEqual({ ok: false, error: "out_of_range" });
    expect(normaliseSelection("abc", -1, 2)).toEqual({ ok: false, error: "out_of_range" });
  });

  it("rejects selections that split a grapheme cluster", () => {
    const family = "我👨‍👩‍👧家"; // the family emoji is 5 code points, one grapheme
    expect(normaliseSelection(family, 1, 3)).toEqual({ ok: false, error: "splits_grapheme" });
    expect(normaliseSelection(family, 1, 6)).toMatchObject({ ok: true, value: { text: "👨‍👩‍👧" } });
    expect(normaliseSelection("café au lait", 0, 4)).toEqual({ ok: false, error: "splits_grapheme" });
  });

  it("locates a typed phrase, including a later occurrence", () => {
    expect(locatePhrase("😀天気と天気", "天気")).toEqual({ ok: true, value: { start: 1, end: 3, text: "天気" } });
    expect(locatePhrase("😀天気と天気", "天気", 1)).toEqual({ ok: true, value: { start: 4, end: 6, text: "天気" } });
    expect(locatePhrase("天気", "雨")).toEqual({ ok: false, error: "not_found" });
    expect(locatePhrase("天気", "   ")).toEqual({ ok: false, error: "empty" });
  });
});

describe("surfaceKey (duplicate warning only)", () => {
  it("normalises to NFC, trims and collapses spaces", () => {
    expect(surfaceKey(" café ", "zh")).toBe("café");
    expect(surfaceKey("good   morning", "ja")).toBe("good morning");
  });

  it("lower-cases English only", () => {
    expect(surfaceKey("Good Morning", "en")).toBe("good morning");
    expect(surfaceKey("ＡＢＣ", "ja")).toBe("ＡＢＣ");
  });
});
