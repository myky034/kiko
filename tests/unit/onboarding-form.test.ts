import { describe, expect, it } from "vitest";
import { parseOnboardingForm } from "@/modules/identity/onboarding";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

describe("parseOnboardingForm", () => {
  it("accepts languages from the registry and an IANA timezone", () => {
    const result = parseOnboardingForm(
      form([
        ["languages", "en"],
        ["languages", "zh"],
        ["timezone", "Asia/Ho_Chi_Minh"],
      ]),
    );
    expect(result).toEqual({
      ok: true,
      value: { languages: ["zh", "en"], timezone: "Asia/Ho_Chi_Minh" },
    });
  });

  it("deduplicates repeated languages", () => {
    const result = parseOnboardingForm(
      form([
        ["languages", "ja"],
        ["languages", "ja"],
        ["timezone", "UTC"],
      ]),
    );
    expect(result.ok && result.value.languages).toEqual(["ja"]);
  });

  it("ignores framework fields added to Server Action forms", () => {
    const result = parseOnboardingForm(
      form([
        ["$ACTION_ID_abc123", ""],
        ["languages", "ja"],
        ["timezone", "Asia/Tokyo"],
      ]),
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    "role",
    "roles",
    "state",
    "userId",
    "user_id",
    "ownerId",
    "authorizationRevision",
    "onboardedAt",
    "authSubject",
  ])("rejects the whole submission when it contains %s", (field) => {
    const result = parseOnboardingForm(
      form([
        ["languages", "ja"],
        ["timezone", "Asia/Tokyo"],
        [field, "OWNER"],
      ]),
    );
    expect(result).toEqual({ ok: false, errors: { form: "The form contains fields that aren't allowed." } });
  });

  it.each([["ko"], ["ZH"], ["zh-Hans"], [""], ["fr"]])("rejects unsupported language %j", (code) => {
    const result = parseOnboardingForm(
      form([
        ["languages", code],
        ["timezone", "UTC"],
      ]),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.languages).toBeTruthy();
  });

  it("requires at least one language", () => {
    const result = parseOnboardingForm(form([["timezone", "UTC"]]));
    expect(!result.ok && result.errors.languages).toBe("Choose at least one language to learn.");
  });

  it.each([["Mars/Olympus"], ["+07:00"], ["asia/ho_chi_minh"], [""]])(
    "rejects invalid timezone %j",
    (zone) => {
      const result = parseOnboardingForm(
        form([
          ["languages", "en"],
          ["timezone", zone],
        ]),
      );
      expect(!result.ok && result.errors.timezone).toBeTruthy();
    },
  );

  it("rejects a missing or repeated timezone", () => {
    expect(parseOnboardingForm(form([["languages", "en"]])).ok).toBe(false);
    expect(
      parseOnboardingForm(
        form([
          ["languages", "en"],
          ["timezone", "UTC"],
          ["timezone", "Asia/Tokyo"],
        ]),
      ).ok,
    ).toBe(false);
  });
});
