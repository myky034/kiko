// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { admitEmail, asRole, createMigratedDatabase, errorOf } from "../support/pglite-database";

let db: PGlite;
let userId: string;
let otherUserId: string;

async function admit(subject: string, email: string): Promise<string> {
  await admitEmail(db, email, ["LEARNER"]);
  const result = await asRole(db, "kiko_app", () =>
    db.query<{ id: string }>("SELECT kiko.admit_identity('supabase', $1, $2) AS id", [subject, email]),
  );
  return result.rows[0].id;
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  userId = await admit("subject-prefs-a", "prefs-a@example.test");
  otherUserId = await admit("subject-prefs-b", "prefs-b@example.test");
  for (const [user, code] of [
    [userId, "zh"],
    [userId, "ja"],
    [otherUserId, "en"],
  ]) {
    await db.query("INSERT INTO kiko.user_language_preference (user_id, language_code) VALUES ($1, $2)", [user, code]);
  }
}, 60_000);

describe("interface_language", () => {
  it("defaults to English and accepts en/vi only", async () => {
    const row = await db.query<{ interface_language: string }>(
      "SELECT interface_language FROM kiko.user_profile WHERE id = $1",
      [userId],
    );
    expect(row.rows[0].interface_language).toBe("en");
    expect(await errorOf(db.query("UPDATE kiko.user_profile SET interface_language = 'vi' WHERE id = $1", [userId]))).toBeNull();
    expect(
      await errorOf(db.query("UPDATE kiko.user_profile SET interface_language = 'fr' WHERE id = $1", [userId])),
    ).toMatch(/user_profile_interface_language_check/);
    expect(
      await errorOf(db.query("UPDATE kiko.user_profile SET interface_language = NULL WHERE id = $1", [userId])),
    ).toMatch(/null value|not-null/);
  });
});

describe("display_name", () => {
  it.each([["Vũ Mỹ Kỳ"], [null], ["x".repeat(80)]])("accepts %s", async (value) => {
    expect(await errorOf(db.query("UPDATE kiko.user_profile SET display_name = $2 WHERE id = $1", [userId, value]))).toBeNull();
  });

  it.each([[""], [" padded"], ["line\nbreak"], ["bell\u0007"], ["x".repeat(81)]])("rejects %j", async (value) => {
    expect(
      await errorOf(db.query("UPDATE kiko.user_profile SET display_name = $2 WHERE id = $1", [userId, value])),
    ).toMatch(/user_profile_display_name_check/);
  });
});

describe("current_learning_language", () => {
  it("accepts one of the user's own preference languages and NULL", async () => {
    for (const value of ["zh", "ja", null]) {
      expect(
        await errorOf(db.query("UPDATE kiko.user_profile SET current_learning_language = $2 WHERE id = $1", [userId, value])),
      ).toBeNull();
    }
  });

  it("rejects a language the user has no preference for, even if another user has it", async () => {
    expect(
      await errorOf(db.query("UPDATE kiko.user_profile SET current_learning_language = 'en' WHERE id = $1", [userId])),
    ).toMatch(/user_profile_current_learning_language_fkey/);
    expect(
      await errorOf(db.query("UPDATE kiko.user_profile SET current_learning_language = 'xx' WHERE id = $1", [userId])),
    ).toMatch(/user_profile_current_learning_language_fkey/);
  });

  it("clears only the language when that preference row is deleted", async () => {
    await db.query("UPDATE kiko.user_profile SET current_learning_language = 'ja' WHERE id = $1", [userId]);
    await db.query("DELETE FROM kiko.user_language_preference WHERE user_id = $1 AND language_code = 'ja'", [userId]);
    const row = await db.query<{ id: string; current_learning_language: string | null }>(
      "SELECT id, current_learning_language FROM kiko.user_profile WHERE id = $1",
      [userId],
    );
    expect(row.rows[0]).toEqual({ id: userId, current_learning_language: null });
  });
});

describe("runtime role kiko_app", () => {
  it("can update display_name and current_learning_language", async () => {
    const error = await asRole(db, "kiko_app", () =>
      errorOf(
        db.query(
          "UPDATE kiko.user_profile SET display_name = 'Kiko Learner', current_learning_language = 'zh', updated_at = now() WHERE id = $1",
          [userId],
        ),
      ),
    );
    expect(error).toBeNull();
  });

  it("still cannot change interface_language or privileged columns", async () => {
    for (const sql of [
      "UPDATE kiko.user_profile SET interface_language = 'vi' WHERE id = $1",
      "UPDATE kiko.user_profile SET state = 'active' WHERE id = $1",
      "UPDATE kiko.user_profile SET authorization_revision = 99 WHERE id = $1",
    ]) {
      expect(await asRole(db, "kiko_app", () => errorOf(db.query(sql, [userId])))).toMatch(/permission denied/);
    }
  });
});

describe("lesson tags index", () => {
  it("indexes lesson.tags with GIN", async () => {
    const index = await db.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE schemaname = 'kiko' AND indexname = 'lesson_tags_idx'",
    );
    expect(index.rows[0]?.indexdef).toMatch(/USING gin \(tags\)/);
  });
});
