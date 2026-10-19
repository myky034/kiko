import { describe, expect, it } from "vitest";
import { handleOAuthCallback } from "@/modules/identity/oauth-callback";
import { hasVerifiedGoogleEmail, type ProviderUser } from "@/modules/identity/provider-identity";
import { safeAfterSignInPath, signInErrorMessage } from "@/modules/identity/redirect";
import { __testing } from "@/server/config/env";

const ORIGIN = "http://localhost:8080";

describe("safeAfterSignInPath", () => {
  it.each(["/", "/onboarding"])("keeps allowed internal path %s", (path) => {
    expect(safeAfterSignInPath(path)).toBe(path);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/%2F%2Fevil.example",
    "javascript:alert(1)",
    "/sign-in",
    "/onboarding/../admin",
    "/onboarding?x=1",
    " /",
    "",
    null,
    undefined,
    ["/"],
  ])("falls back to the dashboard for %j", (candidate) => {
    expect(safeAfterSignInPath(candidate)).toBe("/");
  });
});

describe("handleOAuthCallback", () => {
  const params = (query: string) => new URLSearchParams(query);
  const ok = async () => true;

  it("exchanges the code and redirects to an allowed path on the configured origin", async () => {
    let received = "";
    const target = await handleOAuthCallback({
      origin: ORIGIN,
      searchParams: params("code=abc&next=/onboarding"),
      exchangeCode: async (code) => {
        received = code;
        return true;
      },
    });
    expect(received).toBe("abc");
    expect(target.href).toBe("http://localhost:8080/onboarding");
  });

  it.each(["https://evil.example/", "//evil.example", "/\\evil.example"])(
    "never redirects off-origin (next=%s)",
    async (next) => {
      const target = await handleOAuthCallback({
        origin: ORIGIN,
        searchParams: params(`code=abc&next=${encodeURIComponent(next)}`),
        exchangeCode: ok,
      });
      expect(target.origin).toBe(ORIGIN);
      expect(target.pathname).toBe("/");
    },
  );

  it("reports a cancelled consent without exchanging", async () => {
    let called = false;
    const target = await handleOAuthCallback({
      origin: ORIGIN,
      searchParams: params("error=access_denied&error_description=<script>"),
      exchangeCode: async () => {
        called = true;
        return true;
      },
    });
    expect(called).toBe(false);
    expect(target.href).toBe("http://localhost:8080/sign-in?error=oauth_cancelled");
  });

  it.each([
    ["error=server_error", "oauth_failed"],
    ["", "oauth_failed"],
    [`code=${"x".repeat(600)}`, "oauth_failed"],
  ])("fails closed for %j", async (query, code) => {
    const target = await handleOAuthCallback({ origin: ORIGIN, searchParams: params(query), exchangeCode: ok });
    expect(target.href).toBe(`http://localhost:8080/sign-in?error=${code}`);
  });

  it("fails closed when the code exchange fails or throws", async () => {
    for (const exchangeCode of [async () => false, async () => Promise.reject(new Error("boom"))]) {
      const target = await handleOAuthCallback({ origin: ORIGIN, searchParams: params("code=abc"), exchangeCode });
      expect(target.href).toBe("http://localhost:8080/sign-in?error=oauth_failed");
    }
  });
});

describe("signInErrorMessage", () => {
  it("shows only known codes and never reflects query text", () => {
    expect(signInErrorMessage("oauth_failed")).toMatch(/Google/);
    expect(signInErrorMessage("<script>alert(1)</script>")).toBeNull();
    expect(signInErrorMessage("toString")).toBeNull();
    expect(signInErrorMessage(undefined)).toBeNull();
  });
});

describe("hasVerifiedGoogleEmail", () => {
  const verified: ProviderUser = {
    id: "sub-1",
    email: "Owner@Example.test",
    email_confirmed_at: "2026-10-17T00:00:00Z",
    identities: [{ provider: "google", identity_data: { email: "owner@example.test", email_verified: true } }],
  };

  it("accepts the session user with a Google-verified matching email", () => {
    expect(hasVerifiedGoogleEmail(verified, "sub-1", "owner@example.test")).toBe(true);
  });

  it.each<[string, ProviderUser | null]>([
    ["no user", null],
    ["another subject", { ...verified, id: "sub-2" }],
    ["unconfirmed user email", { ...verified, email_confirmed_at: null }],
    ["different user email", { ...verified, email: "other@example.test" }],
    ["no identities", { ...verified, identities: [] }],
    [
      "Google says unverified",
      { ...verified, identities: [{ provider: "google", identity_data: { email: "owner@example.test", email_verified: false } }] },
    ],
    [
      "email_verified as string",
      { ...verified, identities: [{ provider: "google", identity_data: { email: "owner@example.test", email_verified: "true" } }] },
    ],
    [
      "only an email/password identity",
      { ...verified, identities: [{ provider: "email", identity_data: { email: "owner@example.test", email_verified: true } }] },
    ],
    [
      "Google identity for another email",
      { ...verified, identities: [{ provider: "google", identity_data: { email: "x@example.test", email_verified: true } }] },
    ],
  ])("rejects %s", (_label, user) => {
    expect(hasVerifiedGoogleEmail(user, "sub-1", "owner@example.test")).toBe(false);
  });
});

describe("KIKO_APP_ORIGIN", () => {
  const { appOriginSchema } = __testing;

  it.each([
    ["http://localhost:8080", "http://localhost:8080"],
    ["http://localhost:8080/", "http://localhost:8080"],
    ["https://kiko.example", "https://kiko.example"],
  ])("accepts %s", (value, origin) => {
    const result = appOriginSchema.safeParse({ KIKO_APP_ORIGIN: value });
    expect(result.success && result.data.KIKO_APP_ORIGIN).toBe(origin);
  });

  it.each([
    undefined,
    "http://kiko.example",
    "http://localhost:8080/app",
    "http://localhost:8080/?x=1",
    "ftp://localhost:8080",
    "localhost:8080",
  ])("rejects %j", (value) => {
    expect(appOriginSchema.safeParse({ KIKO_APP_ORIGIN: value }).success).toBe(false);
  });
});
