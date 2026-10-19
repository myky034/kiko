import { describe, expect, it } from "vitest";
import { __testing } from "@/server/config/env";

const { publicSchema, serverSchema } = __testing;

describe("server configuration", () => {
  it.each([
    "postgresql://postgres:pw@db.ref.supabase.co:5432/postgres",
    "postgresql://postgres.ref:pw@aws-0-x.pooler.supabase.com:6543/postgres",
    "postgresql://supabase_admin:pw@host:5432/postgres",
    "postgresql://service_role.ref:pw@host:6543/postgres",
  ])("refuses a privileged runtime database user (%#)", (url) => {
    expect(serverSchema.safeParse({ DATABASE_URL: url }).success).toBe(false);
  });

  it("accepts the kiko_app runtime role through the pooler with verified TLS", () => {
    const result = serverSchema.safeParse({
      DATABASE_URL:
        "postgresql://kiko_app.ref:pw@aws-0-x.pooler.supabase.com:6543/postgres?sslmode=verify-full&sslrootcert=/abs/ca.crt",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.KIKO_DEFAULT_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
  });

  it.each(["", "?sslmode=require", "?sslmode=verify-ca&sslrootcert=/abs/ca.crt", "?sslmode=verify-full"])(
    "refuses a remote runtime URL without verify-full TLS (%j)",
    (query) => {
      const result = serverSchema.safeParse({
        DATABASE_URL: `postgresql://kiko_app.ref:pw@aws-0-x.pooler.supabase.com:6543/postgres${query}`,
      });
      expect(result.success).toBe(false);
    },
  );

  it("allows a plain local runtime connection", () => {
    expect(
      serverSchema.safeParse({ DATABASE_URL: "postgresql://kiko_app@localhost:5432/kiko_flashcard" }).success,
    ).toBe(true);
  });

  it("rejects missing or non-PostgreSQL URLs and invalid default timezones", () => {
    expect(serverSchema.safeParse({}).success).toBe(false);
    expect(serverSchema.safeParse({ DATABASE_URL: "https://example.test" }).success).toBe(false);
    expect(
      serverSchema.safeParse({
        DATABASE_URL: "postgresql://kiko_app@localhost:5432/postgres",
        KIKO_DEFAULT_TIMEZONE: "GMT+7",
      }).success,
    ).toBe(false);
  });

  it("does not echo secret values in validation errors", () => {
    const secret = "postgresql://postgres:super-secret-password@host:5432/postgres";
    const result = serverSchema.safeParse({ DATABASE_URL: secret });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues.map((issue) => issue.message))).not.toContain(
      "super-secret-password",
    );
  });
});

describe("public configuration", () => {
  it("accepts an https project URL with a publishable key", () => {
    expect(
      publicSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: "https://ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_0123456789abcdef",
      }).success,
    ).toBe(true);
  });

  it("refuses a secret key or a plain-http URL in browser-visible variables", () => {
    expect(
      publicSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: "https://ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_0123456789abcdef",
      }).success,
    ).toBe(false);
    expect(
      publicSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: "http://ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_0123456789abcdef",
      }).success,
    ).toBe(false);
  });
});
