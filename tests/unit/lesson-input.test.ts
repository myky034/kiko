import { describe, expect, it } from "vitest";
import { parseExpectedVersion, parseLessonForm } from "@/modules/content/lesson-input";

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(name, v);
  }
  return data;
}

const base = { title: " Bài đọc 1 ", languageCode: "zh", tags: "", levelLabel: "", sourceNote: "", content: "一\n二" };

describe("parseLessonForm", () => {
  it("trims metadata but keeps content exactly", () => {
    const result = parseLessonForm(form({ ...base, content: "  一  \r\n\r\n二" }), []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadata).toEqual({ title: "Bài đọc 1", languageCode: "zh", tags: [], levelLabel: null, sourceNote: null });
    expect(result.value.content.sourceText).toBe("  一  \r\n\r\n二");
    expect(result.value.content.segments.map((s) => s.text)).toEqual(["  一  ", "二"]);
  });

  it("maps topics to tags split on ASCII, fullwidth and ideographic commas, deduplicated", () => {
    const result = parseLessonForm(form({ ...base, tags: "du lịch, 日常，日常、 food ,," }), []);
    expect(result.ok && result.value.metadata.tags).toEqual(["du lịch", "日常", "food"]);
  });

  it.each([
    [{ title: "" }, "title"],
    [{ title: "   " }, "title"],
    [{ title: "😀".repeat(201) }, "title"],
    [{ languageCode: "ko" }, "languageCode"],
    [{ tags: "a,b,c,d,e,f" }, "tags"],
    [{ tags: "a".repeat(33) }, "tags"],
    [{ levelLabel: "x".repeat(33) }, "levelLabel"],
    [{ sourceNote: "x".repeat(1001) }, "sourceNote"],
  ])("rejects %j", (override, field) => {
    const result = parseLessonForm(form({ ...base, ...override }), []);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[field as keyof typeof result.errors]).toBeTruthy();
  });

  it("accepts a 200-emoji title (code points, not UTF-16 units)", () => {
    expect(parseLessonForm(form({ ...base, title: "😀".repeat(200) }), []).ok).toBe(true);
  });

  it("rejects line breaks in single-line fields instead of removing them", () => {
    const result = parseLessonForm(form({ ...base, title: "a\nb" }), []);
    expect(!result.ok && result.errors.title).toMatch(/xuống dòng/);
  });

  it("reports content over the limits with line numbers and without truncation", () => {
    const result = parseLessonForm(form({ ...base, content: `ok\n${"x".repeat(2001)}` }), []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.content).toMatch(/Không có gì bị cắt bớt/);
    expect(result.errors.contentLines).toEqual(["Dòng 2: đoạn dài 2.001 ký tự, vượt giới hạn 2.000."]);
  });

  it.each(["ownerId", "owner_id", "status", "version", "activeTranscriptId", "userId"])(
    "rejects the unexpected field %s",
    (field) => {
      const result = parseLessonForm(form({ ...base, [field]: "x" }), ["clientRequestId"]);
      expect(result).toEqual({ ok: false, errors: { form: "Biểu mẫu chứa trường không hợp lệ." } });
    },
  );

  it("rejects repeated single-value fields", () => {
    expect(parseLessonForm(form({ ...base, title: ["a", "b"] }), []).ok).toBe(false);
  });
});

describe("parseExpectedVersion", () => {
  it.each([["1", 1], ["42", 42], ["0", null], ["-1", null], ["1.5", null], ["abc", null], ["01", null]])(
    "%j → %j",
    (raw, expected) => {
      expect(parseExpectedVersion(form({ expectedVersion: raw }))).toBe(expected);
    },
  );
});
