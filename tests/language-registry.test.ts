import { describe, expect, it } from "vitest";
import {
  LANGUAGE_CODES,
  getLanguage,
  isLanguageCode,
  listLanguages,
} from "@/modules/language/registry";

describe("language registry", () => {
  it("supports exactly zh, ja and en in a stable order", () => {
    expect(LANGUAGE_CODES).toEqual(["zh", "ja", "en"]);
    expect(listLanguages().map((language) => language.code)).toEqual([
      "zh",
      "ja",
      "en",
    ]);
  });

  it.each(["zh", "ja", "en"])("accepts %s", (code) => {
    expect(isLanguageCode(code)).toBe(true);
  });

  it.each([
    "ko",
    "vi",
    "ZH",
    " zh",
    "zh-Hans",
    "zh-TW",
    "en-US",
    "",
    null,
    undefined,
    0,
    ["zh"],
    { code: "zh" },
  ])("rejects %j without normalizing it", (value) => {
    expect(isLanguageCode(value)).toBe(false);
  });

  it("does not treat inherited object keys as languages", () => {
    expect(isLanguageCode("toString")).toBe(false);
    expect(isLanguageCode("constructor")).toBe(false);
  });

  it("keeps a distinct reading notation per language", () => {
    expect(getLanguage("zh").readingNotations).toEqual(["pinyin"]);
    expect(getLanguage("ja").readingNotations).toEqual(["kana"]);
    expect(getLanguage("en").readingNotations).toEqual(["ipa"]);
  });

  it("offers stroke practice only for zh and ja", () => {
    expect(getLanguage("zh").supportsStrokePractice).toBe(true);
    expect(getLanguage("ja").supportsStrokePractice).toBe(true);
    expect(getLanguage("en").supportsStrokePractice).toBe(false);
  });

  it("does not assume a Chinese script variant or English accent", () => {
    expect(getLanguage("zh").htmlLang).toBe("zh");
    expect(getLanguage("en").htmlLang).toBe("en");
  });
});
