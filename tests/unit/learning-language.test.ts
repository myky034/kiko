import { describe, expect, it } from "vitest";
import { parseLearningLanguageForm, resolveLearningLanguage } from "@/modules/language/learning-language";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

describe("resolveLearningLanguage", () => {
  it("uses the cookie only when it names an enabled language", () => {
    expect(resolveLearningLanguage("ja", ["zh", "ja"])).toBe("ja");
    expect(resolveLearningLanguage("en", ["zh", "ja"])).toBe("zh");
    expect(resolveLearningLanguage("<script>", ["ja"])).toBe("ja");
    expect(resolveLearningLanguage(undefined, ["en"])).toBe("en");
  });

  it("returns null when the actor has no enabled language", () => {
    expect(resolveLearningLanguage("zh", [])).toBeNull();
  });
});

describe("parseLearningLanguageForm", () => {
  it("accepts exactly one enabled language", () => {
    expect(parseLearningLanguageForm(form([["language", "zh"]]), ["zh", "en"])).toBe("zh");
  });

  it("rejects languages the actor did not enable, duplicates and extra fields", () => {
    expect(parseLearningLanguageForm(form([["language", "ja"]]), ["zh"])).toBeNull();
    expect(parseLearningLanguageForm(form([["language", "zh"], ["language", "en"]]), ["zh", "en"])).toBeNull();
    expect(parseLearningLanguageForm(form([["language", "zh"], ["userId", "someone"]]), ["zh"])).toBeNull();
    expect(parseLearningLanguageForm(form([]), ["zh"])).toBeNull();
  });
});
