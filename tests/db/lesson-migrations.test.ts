// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { contentLength, codePointLength } from "@/modules/content/segmentation";
import { admitEmail, asRole, createMigratedDatabase, errorOf } from "../support/pglite-database";

let db: PGlite;
let ownerA: string;
let ownerB: string;
let counter = 0;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await admitEmail(db, "a@example.test", ["LEARNER"]);
  await admitEmail(db, "b@example.test", ["LEARNER"]);
  const admit = async (subject: string, email: string) =>
    (await asRole(db, "kiko_app", () =>
      db.query<{ id: string }>("SELECT kiko.admit_identity('supabase', $1, $2) AS id", [subject, email]),
    )).rows[0].id;
  ownerA = await admit("s-a", "a@example.test");
  ownerB = await admit("s-b", "b@example.test");
}, 60_000);

/** Inserts a lesson with a draft version (as kiko_app) and returns ids. */
async function lessonWithDraft(owner = ownerA, language = "ja", lines: string[] = ["一行目", "二行目"]) {
  counter += 1;
  return asRole(db, "kiko_app", async () => {
    const lesson = await db.query<{ id: string }>(
      "INSERT INTO kiko.lesson (owner_id, language_code, title, client_request_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [owner, language, `Bài ${counter}`, `req-${counter}`],
    );
    const lessonId = lesson.rows[0].id;
    const version = await db.query<{ id: string }>(
      `INSERT INTO kiko.transcript_version (lesson_id, owner_id, language_code, version_no, source_text, segmentation_rule)
       VALUES ($1, $2, $3, 1, $4, 'line-v1') RETURNING id`,
      [lessonId, owner, language, lines.join("\n")],
    );
    const versionId = version.rows[0].id;
    for (const [position, text] of lines.entries()) {
      await db.query(
        "INSERT INTO kiko.segment (transcript_version_id, owner_id, language_code, position, text) VALUES ($1, $2, $3, $4, $5)",
        [versionId, owner, language, position, text],
      );
    }
    return { lessonId, versionId };
  });
}

async function publish(lessonId: string, versionId: string) {
  await asRole(db, "kiko_app", async () => {
    await db.query("UPDATE kiko.transcript_version SET state = 'published', published_at = now() WHERE id = $1", [versionId]);
    await db.query(
      "UPDATE kiko.lesson SET status = 'ready', active_transcript_id = $2, version = version + 1 WHERE id = $1",
      [lessonId, versionId],
    );
  });
}

describe("counting (DEC-022)", () => {
  it.each([
    ["😀", 1],
    ["👨‍👩‍👧", 5],
    ["🇻🇳", 2],
    ["é", 1],
    ["é", 2],
    ["漢字かな", 4],
    ["a\r\nb", 3],
    ["a\nb", 3],
    ["a\rb", 3],
    ["", 0],
  ])("PostgreSQL and JS agree for %j", async (text, expected) => {
    const { rows } = await db.query<{ n: number }>("SELECT kiko.content_length($1) AS n", [text]);
    expect(rows[0].n).toBe(expected);
    expect(contentLength(text)).toBe(expected);
  });

  it("counts a single emoji as one code point in a segment limit", async () => {
    const { rows } = await db.query<{ n: number }>("SELECT char_length($1) AS n", ["😀".repeat(2000)]);
    expect(rows[0].n).toBe(2000);
    expect(codePointLength("😀".repeat(2000))).toBe(2000);
  });
});

describe("lesson constraints", () => {
  const insertLesson = (fields: Record<string, unknown>) => {
    const columns = ["owner_id", "language_code", "title", ...Object.keys(fields)];
    const values = [ownerA, "en", "Title", ...Object.values(fields)];
    return db.query(
      `INSERT INTO kiko.lesson (${columns.join(", ")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})`,
      values,
    );
  };

  it.each([
    ["empty title", { title: "" }],
    ["title over 200 code points", { title: "😀".repeat(201) }],
    ["untrimmed title", { title: " x" }],
    ["title with line break", { title: "a\nb" }],
    ["six tags", { tags: ["a", "b", "c", "d", "e", "f"] }],
    ["duplicate tags", { tags: ["x", "x"] }],
    ["tag over 32", { tags: ["a".repeat(33)] }],
    ["blank tag", { tags: [""] }],
    ["null tags", { tags: null }],
    ["null tag element", { tags: ["a", null] }],
    ["level over 32", { level_label: "a".repeat(33) }],
    ["empty source note", { source_note: "" }],
    ["unknown language", { language_code: "ko" }],
  ])("rejects %s", async (_label, fields) => {
    const columns = Object.fromEntries(Object.entries(fields).filter(([k]) => k !== "title" && k !== "language_code"));
    const sql =
      "title" in fields || "language_code" in fields
        ? db.query("INSERT INTO kiko.lesson (owner_id, language_code, title) VALUES ($1, $2, $3)", [
            ownerA,
            (fields as { language_code?: string }).language_code ?? "en",
            (fields as { title?: string }).title ?? "Title",
          ])
        : insertLesson(columns);
    expect(await errorOf(sql)).not.toBeNull();
  });

  it("accepts five topics with emoji up to 32 code points", async () => {
    expect(await errorOf(insertLesson({ tags: ["😀".repeat(32), "b", "c", "d", "e"] }))).toBeNull();
  });

  it("keeps status, archive time and active version consistent (NULL cases)", async () => {
    expect(await errorOf(insertLesson({ status: "archived" }))).toMatch(/lesson_archived_check/);
    expect(await errorOf(insertLesson({ archived_at: new Date().toISOString() }))).toMatch(/lesson_archived_check/);
    expect(await errorOf(insertLesson({ status: "ready" }))).toMatch(/lesson_ready_check/);
  });

  it("deduplicates create requests per owner but not across owners", async () => {
    await db.query("INSERT INTO kiko.lesson (owner_id, language_code, title, client_request_id) VALUES ($1, 'en', 'T', 'same')", [ownerA]);
    expect(
      await errorOf(db.query("INSERT INTO kiko.lesson (owner_id, language_code, title, client_request_id) VALUES ($1, 'en', 'T', 'same')", [ownerA])),
    ).toMatch(/unique/);
    expect(
      await errorOf(db.query("INSERT INTO kiko.lesson (owner_id, language_code, title, client_request_id) VALUES ($1, 'en', 'T', 'same')", [ownerB])),
    ).toBeNull();
  });
});

describe("versions and segments", () => {
  it("rejects segments over the limits or with line breaks", async () => {
    const { versionId } = await lessonWithDraft();
    const insert = (position: number, text: string) =>
      asRole(db, "kiko_app", () =>
        errorOf(
          db.query(
            "INSERT INTO kiko.segment (transcript_version_id, owner_id, language_code, position, text) VALUES ($1, $2, 'ja', $3, $4)",
            [versionId, ownerA, position, text],
          ),
        ),
      );
    expect(await insert(10, "😀".repeat(2000))).toBeNull();
    expect(await insert(11, "😀".repeat(2001))).toMatch(/segment_text_check/);
    expect(await insert(12, "a\nb")).toMatch(/segment_text_check/);
    expect(await insert(13, "")).toMatch(/segment_text_check/);
    expect(await insert(2000, "x")).toMatch(/segment_position_check/);
    expect(await insert(0, "dup")).toMatch(/unique/);
  });

  it("rejects source_text over 100,000 counted code points, counting CRLF once", async () => {
    const { lessonId } = await lessonWithDraft();
    const insert = (versionNo: number, text: string) =>
      errorOf(
        db.query(
          `INSERT INTO kiko.transcript_version (lesson_id, owner_id, language_code, version_no, state, published_at, source_text, segmentation_rule)
           VALUES ($1, $2, 'ja', $3, 'published', now(), $4, 'line-v1')`,
          [lessonId, ownerA, versionNo, text],
        ),
      );
    // 50,000 "a" + 49,999 CRLF + "a" pattern: exactly 100,000 counted.
    const atLimit = Array.from({ length: 50_000 }, () => "a").join("\r\n");
    expect(contentLength(atLimit)).toBe(99_999);
    expect(await insert(2, `${atLimit}a`)).toBeNull();
    expect(await insert(3, `${atLimit}ab`)).toMatch(/transcript_version_source_length_check/);
  });

  it("allows only one draft per lesson and only line-v1", async () => {
    const { lessonId } = await lessonWithDraft();
    const insert = (versionNo: number, rule = "line-v1") =>
      errorOf(
        db.query(
          `INSERT INTO kiko.transcript_version (lesson_id, owner_id, language_code, version_no, source_text, segmentation_rule)
           VALUES ($1, $2, 'ja', $3, 'x', $4)`,
          [lessonId, ownerA, versionNo, rule],
        ),
      );
    expect(await insert(2)).toMatch(/transcript_version_one_draft_per_lesson/);
    expect(await insert(3, "sentence-v1")).toMatch(/transcript_version_rule_check/);
  });

  it("requires published_at exactly when published (NULL cases)", async () => {
    const { versionId } = await lessonWithDraft();
    expect(await errorOf(db.query("UPDATE kiko.transcript_version SET state = 'published' WHERE id = $1", [versionId]))).toMatch(
      /transcript_version_published_check/,
    );
    expect(await errorOf(db.query("UPDATE kiko.transcript_version SET published_at = now() WHERE id = $1", [versionId]))).toMatch(
      /transcript_version_published_check/,
    );
  });

  it("makes published versions and their segments immutable", async () => {
    const { lessonId, versionId } = await lessonWithDraft();
    await publish(lessonId, versionId);
    await asRole(db, "kiko_app", async () => {
      expect(await errorOf(db.query("UPDATE kiko.transcript_version SET source_text = 'x' WHERE id = $1", [versionId]))).toMatch(/immutable/);
      expect(await errorOf(db.query("DELETE FROM kiko.segment WHERE transcript_version_id = $1", [versionId]))).toMatch(/immutable/);
      expect(
        await errorOf(
          db.query(
            "INSERT INTO kiko.segment (transcript_version_id, owner_id, language_code, position, text) VALUES ($1, $2, 'ja', 9, 'x')",
            [versionId, ownerA],
          ),
        ),
      ).toMatch(/immutable/);
    });
    // Even the migration identity cannot rewrite or remove a published version on its own.
    expect(await errorOf(db.query("UPDATE kiko.transcript_version SET source_text = 'x' WHERE id = $1", [versionId]))).toMatch(/immutable/);
    expect(await errorOf(db.query("DELETE FROM kiko.transcript_version WHERE id = $1", [versionId]))).toMatch(/only with their lesson/);
  });

  it("points the active transcript only at a published version of the same lesson", async () => {
    const a = await lessonWithDraft();
    const b = await lessonWithDraft();
    expect(
      await errorOf(db.query("UPDATE kiko.lesson SET active_transcript_id = $2 WHERE id = $1", [a.lessonId, a.versionId])),
    ).toMatch(/must be a published version/);
    await publish(b.lessonId, b.versionId);
    expect(
      await errorOf(db.query("UPDATE kiko.lesson SET active_transcript_id = $2 WHERE id = $1", [a.lessonId, b.versionId])),
    ).toMatch(/foreign key/);
  });

  it("does not link a version or segment across owners or languages", async () => {
    const { lessonId, versionId } = await lessonWithDraft(ownerA, "ja");
    expect(
      await errorOf(
        db.query(
          `INSERT INTO kiko.transcript_version (lesson_id, owner_id, language_code, version_no, state, published_at, source_text, segmentation_rule)
           VALUES ($1, $2, 'ja', 5, 'published', now(), 'x', 'line-v1')`,
          [lessonId, ownerB],
        ),
      ),
    ).toMatch(/foreign key/);
    expect(
      await errorOf(
        db.query(
          "INSERT INTO kiko.segment (transcript_version_id, owner_id, language_code, position, text) VALUES ($1, $2, 'zh', 7, 'x')",
          [versionId, ownerA],
        ),
      ),
    ).toMatch(/foreign key/);
  });
});

describe("language lock and deletion", () => {
  it("cascades a language change through drafts, and locks it after the first publish", async () => {
    const { lessonId, versionId } = await lessonWithDraft(ownerA, "ja");
    await asRole(db, "kiko_app", () => db.query("UPDATE kiko.lesson SET language_code = 'zh' WHERE id = $1", [lessonId]));
    const langs = await db.query<{ v: string; s: string }>(
      "SELECT (SELECT language_code FROM kiko.transcript_version WHERE id = $1) v, (SELECT max(language_code) FROM kiko.segment WHERE transcript_version_id = $1) s",
      [versionId],
    );
    expect(langs.rows[0]).toEqual({ v: "zh", s: "zh" });

    await publish(lessonId, versionId);
    const error = await asRole(db, "kiko_app", () =>
      errorOf(db.query("UPDATE kiko.lesson SET language_code = 'en' WHERE id = $1", [lessonId])),
    );
    expect(error).toMatch(/locked after the first publish/);
  });

  it("deletes a lesson with all its versions and segments, as kiko_app", async () => {
    const { lessonId, versionId } = await lessonWithDraft();
    await publish(lessonId, versionId);
    expect(await asRole(db, "kiko_app", () => errorOf(db.query("DELETE FROM kiko.lesson WHERE id = $1", [lessonId])))).toBeNull();
    const left = await db.query<{ v: number; s: number }>(
      "SELECT (SELECT count(*)::int FROM kiko.transcript_version WHERE lesson_id = $1) v, (SELECT count(*)::int FROM kiko.segment WHERE transcript_version_id = $2) s",
      [lessonId, versionId],
    );
    expect(left.rows[0]).toEqual({ v: 0, s: 0 });
  });

  it("blocks deletion once learning data references a segment with RESTRICT (future tables)", async () => {
    const { lessonId, versionId } = await lessonWithDraft();
    await publish(lessonId, versionId);
    // Stand-in for KIKO-009 vocabulary_occurrence: RESTRICT to segment.
    await db.exec(`CREATE TABLE IF NOT EXISTS kiko.test_occurrence (segment_id uuid REFERENCES kiko.segment(id) ON DELETE RESTRICT)`);
    await db.query("INSERT INTO kiko.test_occurrence SELECT id FROM kiko.segment WHERE transcript_version_id = $1 LIMIT 1", [versionId]);
    expect(await errorOf(db.query("DELETE FROM kiko.lesson WHERE id = $1", [lessonId]))).toMatch(/foreign key|violates/);
    await db.exec("DROP TABLE kiko.test_occurrence");
  });
});

describe("kiko_app privileges", () => {
  it.each([
    ["change a lesson owner", "UPDATE kiko.lesson SET owner_id = gen_random_uuid()"],
    ["delete a version directly", "DELETE FROM kiko.transcript_version"],
    ["update a segment in place", "UPDATE kiko.segment SET text = 'x'"],
    ["change a version number", "UPDATE kiko.transcript_version SET version_no = 9"],
    ["change a creation time", "UPDATE kiko.lesson SET created_at = now()"],
  ])("cannot %s", async (_label, sql) => {
    expect(await asRole(db, "kiko_app", () => errorOf(db.query(sql)))).toMatch(/permission denied/);
  });

  it.each(["anon", "authenticated", "service_role"])("%s cannot read lessons or segments", async (role) => {
    for (const table of ["lesson", "transcript_version", "segment"]) {
      expect(await asRole(db, role, () => errorOf(db.query(`SELECT * FROM kiko.${table}`)))).toMatch(/permission denied/);
    }
  });
});
