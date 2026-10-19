import { describe, expect, it } from "vitest";
import { UnsafeTestDatabaseError, resolveTestDatabaseUrl } from "../integration/target";

describe("integration test database guard", () => {
  it("accepts an explicit loopback PostgreSQL URL", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      const url = resolveTestDatabaseUrl({
        KIKO_TEST_DATABASE_URL: `postgresql://me@${host}:5432/kiko_flashcard`,
      });
      expect(url.pathname).toBe("/kiko_flashcard");
    }
  });

  it.each([
    [{}, "not set"],
    [{ KIKO_TEST_DATABASE_URL: "not a url" }, "not a valid URL"],
    [{ KIKO_TEST_DATABASE_URL: "mysql://me@localhost/kiko" }, "not a PostgreSQL URL"],
    [{ KIKO_TEST_DATABASE_URL: "postgresql://postgres.ref:pw@aws-0-x.pooler.supabase.com:5432/postgres" }, "localhost"],
    [{ KIKO_TEST_DATABASE_URL: "postgresql://me@db.ref.supabase.co:5432/postgres" }, "localhost"],
    [{ KIKO_TEST_DATABASE_URL: "postgresql://me@localhost:5432" }, "name a database"],
  ])("refuses %j", (env, reason) => {
    expect(() => resolveTestDatabaseUrl(env)).toThrow(UnsafeTestDatabaseError);
    expect(() => resolveTestDatabaseUrl(env)).toThrow(reason);
  });

  it("refuses a URL equal to the app's runtime or migration database", () => {
    const local = "postgresql://me@localhost:5432/kiko_flashcard";
    expect(() => resolveTestDatabaseUrl({ KIKO_TEST_DATABASE_URL: local, DIRECT_URL: local })).toThrow(
      "differ from DIRECT_URL",
    );
    expect(() => resolveTestDatabaseUrl({ KIKO_TEST_DATABASE_URL: local, DATABASE_URL: local })).toThrow(
      "differ from DATABASE_URL",
    );
  });
});
