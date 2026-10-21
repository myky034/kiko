import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { segmentSource } from "@/modules/content/segmentation";
import type { ActorGuard, LessonMetadata, LessonRepository } from "@/modules/content/types";
import { createPrismaLessonRepository } from "@/server/db/lesson-repository";

let prisma: PrismaClient;
let lessons: LessonRepository;
let admin: pg.Client;

beforeAll(async () => {
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject("appUrl") }) });
  lessons = createPrismaLessonRepository(() => prisma);
  admin = new pg.Client({ connectionString: inject("adminUrl") });
  await admin.connect();
});

afterAll(async () => {
  await prisma?.$disconnect();
  await admin?.end();
});

/** Synthetic active learner created like admission does. */
async function learner(): Promise<ActorGuard> {
  const tag = randomUUID().slice(0, 8);
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO kiko.user_profile (auth_provider, auth_subject, state) VALUES ('supabase', $1, 'active') RETURNING id",
    [`lesson-${tag}`],
  );
  await admin.query("INSERT INTO kiko.user_role (user_id, role_code) VALUES ($1, 'LEARNER')", [rows[0].id]);
  return { userId: rows[0].id, authorizationRevision: 1 };
}

function metadata(overrides: Partial<LessonMetadata> = {}): LessonMetadata {
  return { title: "Bài thử", languageCode: "ja", tags: [], levelLabel: null, sourceNote: null, ...overrides };
}

function content(text: string) {
  const result = segmentSource(text);
  if (result.issues.length > 0) throw new Error("test content over limits");
  return { sourceText: text, segments: result.segments };
}

async function create(guard: ActorGuard, text = "一行目\n二行目", meta: Partial<LessonMetadata> = {}) {
  const result = await lessons.create(guard, { clientRequestId: randomUUID(), metadata: metadata(meta), content: content(text) });
  if (!result.ok) throw new Error(result.reason);
  return result.value.lessonId;
}

async function versionOf(guard: ActorGuard, lessonId: string) {
  const lesson = await lessons.get(guard.userId, lessonId);
  if (!lesson) throw new Error("missing lesson");
  return lesson.version;
}

describe("create and read", () => {
  it("stores the text verbatim and its non-blank lines as segments", async () => {
    const a = await learner();
    const text = "  前に空白\r\n\r\n　\r\n😀 emoji 👨‍👩‍👧\r\nlast line  ";
    const id = await create(a, text);
    const lesson = await lessons.get(a.userId, id);
    expect(lesson?.status).toBe("draft");
    expect(lesson?.draft?.sourceText).toBe(text);
    expect(lesson?.draft?.segments).toEqual([
      { position: 0, text: "  前に空白" },
      { position: 1, text: "😀 emoji 👨‍👩‍👧" },
      { position: 2, text: "last line  " },
    ]);
    expect(lesson?.active).toBeNull();
  });

  it("returns the same lesson when a create request is retried, also concurrently", async () => {
    const a = await learner();
    const clientRequestId = randomUUID();
    const input = { clientRequestId, metadata: metadata(), content: content("x") };
    const results = await Promise.all(Array.from({ length: 4 }, () => lessons.create(a, input)));
    const ids = new Set(results.map((r) => (r.ok ? r.value.lessonId : r.reason)));
    expect(ids.size).toBe(1);
    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.lesson WHERE owner_id = $1 AND client_request_id = $2",
      [a.userId, clientRequestId],
    );
    expect(rows[0].n).toBe(1);
  });

  it("keeps lessons private between learners (read, list, count, mutate)", async () => {
    const a = await learner();
    const b = await learner();
    const id = await create(a);
    expect(await lessons.get(b.userId, id)).toBeNull();
    const listB = await lessons.list(b.userId, { language: null, statuses: ["draft", "ready", "archived"], tag: null, cursor: null, limit: 50 });
    expect(listB.items.find((item) => item.id === id)).toBeUndefined();
    const version = await versionOf(a, id);
    for (const result of [
      await lessons.update(b, { lessonId: id, expectedVersion: version, metadata: metadata({ title: "hijack" }), content: content("x") }),
      await lessons.publish(b, { lessonId: id, expectedVersion: version }),
      await lessons.archive(b, { lessonId: id, expectedVersion: version }),
      await lessons.remove(b, { lessonId: id, expectedVersion: version }),
    ]) {
      expect(result).toEqual({ ok: false, reason: "not_found" });
    }
    expect((await lessons.get(a.userId, id))?.title).toBe("Bài thử");
  });

  it("pages and filters by language, status and topic on the server", async () => {
    const a = await learner();
    for (let i = 0; i < 5; i += 1) await create(a, "x", { title: `zh ${i}`, languageCode: "zh", tags: i % 2 === 0 ? ["日常"] : [] });
    await create(a, "y", { title: "en", languageCode: "en" });
    const filter = { language: "zh" as const, statuses: ["draft" as const], tag: null, cursor: null, limit: 2 };
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await lessons.list(a.userId, { ...filter, cursor });
      seen.push(...page.items.map((item) => item.title));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
    const tagged = await lessons.list(a.userId, { ...filter, limit: 50, tag: "日常" });
    expect(tagged.items).toHaveLength(3);
  });
});

describe("lifecycle", () => {
  it("publishes, revises through a draft and keeps the published version immutable", async () => {
    const a = await learner();
    const id = await create(a, "v1 line");
    expect(await lessons.publish(a, { lessonId: id, expectedVersion: await versionOf(a, id) })).toEqual({ ok: true, value: undefined });

    let lesson = await lessons.get(a.userId, id);
    expect(lesson?.status).toBe("ready");
    expect(lesson?.active?.segments.map((s) => s.text)).toEqual(["v1 line"]);
    expect(lesson?.draft).toBeNull();

    expect(
      (await lessons.update(a, { lessonId: id, expectedVersion: lesson!.version, metadata: metadata(), content: content("v2 line") })).ok,
    ).toBe(true);
    lesson = await lessons.get(a.userId, id);
    expect(lesson?.active?.segments.map((s) => s.text)).toEqual(["v1 line"]);
    expect(lesson?.draft?.versionNo).toBe(2);

    await lessons.publish(a, { lessonId: id, expectedVersion: lesson!.version });
    lesson = await lessons.get(a.userId, id);
    expect(lesson?.active?.versionNo).toBe(2);
    const versions = await admin.query<{ version_no: number; state: string }>(
      "SELECT version_no, state FROM kiko.transcript_version WHERE lesson_id = $1 ORDER BY version_no",
      [id],
    );
    expect(versions.rows).toEqual([
      { version_no: 1, state: "published" },
      { version_no: 2, state: "published" },
    ]);
  });

  it("refuses to publish without any segment", async () => {
    const a = await learner();
    const id = await create(a, "\n   \n");
    expect(await lessons.publish(a, { lessonId: id, expectedVersion: await versionOf(a, id) })).toEqual({
      ok: false,
      reason: "empty_content",
    });
  });

  it("rejects a stale edit without changing anything", async () => {
    const a = await learner();
    const id = await create(a, "original");
    const version = await versionOf(a, id);
    await lessons.update(a, { lessonId: id, expectedVersion: version, metadata: metadata({ title: "first" }), content: content("first") });
    const stale = await lessons.update(a, { lessonId: id, expectedVersion: version, metadata: metadata({ title: "second" }), content: content("second") });
    expect(stale).toEqual({ ok: false, reason: "conflict" });
    const lesson = await lessons.get(a.userId, id);
    expect(lesson?.title).toBe("first");
    expect(lesson?.draft?.sourceText).toBe("first");
  });

  it("allows a language change before the first publish and locks it afterwards", async () => {
    const a = await learner();
    const id = await create(a, "漢字", { languageCode: "ja" });
    expect((await lessons.update(a, { lessonId: id, expectedVersion: await versionOf(a, id), metadata: metadata({ languageCode: "zh" }), content: content("漢字") })).ok).toBe(true);
    const { rows } = await admin.query<{ l: string }>(
      "SELECT DISTINCT s.language_code AS l FROM kiko.segment s JOIN kiko.transcript_version v ON v.id = s.transcript_version_id WHERE v.lesson_id = $1",
      [id],
    );
    expect(rows).toEqual([{ l: "zh" }]);

    await lessons.publish(a, { lessonId: id, expectedVersion: await versionOf(a, id) });
    expect(
      await lessons.update(a, { lessonId: id, expectedVersion: await versionOf(a, id), metadata: metadata({ languageCode: "en" }), content: content("漢字") }),
    ).toEqual({ ok: false, reason: "language_locked" });
  });

  it("archives and restores to the right state; archived lessons are read-only", async () => {
    const a = await learner();
    const draftId = await create(a, "draft");
    const readyId = await create(a, "ready");
    await lessons.publish(a, { lessonId: readyId, expectedVersion: await versionOf(a, readyId) });
    for (const id of [draftId, readyId]) {
      expect((await lessons.archive(a, { lessonId: id, expectedVersion: await versionOf(a, id) })).ok).toBe(true);
    }
    expect(await lessons.update(a, { lessonId: draftId, expectedVersion: await versionOf(a, draftId), metadata: metadata(), content: content("x") })).toEqual({
      ok: false,
      reason: "invalid_state",
    });
    for (const id of [draftId, readyId]) await lessons.unarchive(a, { lessonId: id, expectedVersion: await versionOf(a, id) });
    expect((await lessons.get(a.userId, draftId))?.status).toBe("draft");
    expect((await lessons.get(a.userId, readyId))?.status).toBe("ready");
  });
});

describe("deletion (DEC-024)", () => {
  it("removes the lesson with every version and segment and audits without content", async () => {
    const a = await learner();
    const id = await create(a, "secret title text", { title: "Tiêu đề riêng tư" });
    await lessons.publish(a, { lessonId: id, expectedVersion: await versionOf(a, id) });
    await lessons.update(a, { lessonId: id, expectedVersion: await versionOf(a, id), metadata: metadata({ title: "Tiêu đề riêng tư" }), content: content("draft v2") });
    expect(await lessons.remove(a, { lessonId: id, expectedVersion: await versionOf(a, id) })).toEqual({ ok: true, value: undefined });
    const left = await admin.query<{ v: number; s: number }>(
      `SELECT (SELECT count(*)::int FROM kiko.transcript_version WHERE lesson_id = $1) v,
              (SELECT count(*)::int FROM kiko.segment s WHERE NOT EXISTS (SELECT 1 FROM kiko.transcript_version v WHERE v.id = s.transcript_version_id)) s`,
      [id],
    );
    expect(left.rows[0]).toEqual({ v: 0, s: 0 });
    const audit = await admin.query<{ target_id: string; action: string }>(
      "SELECT target_id, action FROM kiko.audit_event WHERE action = 'lesson.delete' AND target_id = $1",
      [id],
    );
    expect(audit.rows).toHaveLength(1);
    expect(JSON.stringify(audit.rows)).not.toContain("riêng tư");
  });

  it("refuses a stale delete", async () => {
    const a = await learner();
    const id = await create(a);
    const version = await versionOf(a, id);
    await lessons.archive(a, { lessonId: id, expectedVersion: version });
    expect(await lessons.remove(a, { lessonId: id, expectedVersion: version })).toEqual({ ok: false, reason: "conflict" });
  });

  it("is blocked by RESTRICT references from learning data", async () => {
    const a = await learner();
    const id = await create(a, "referenced");
    await lessons.publish(a, { lessonId: id, expectedVersion: await versionOf(a, id) });
    // Stand-in for a KIKO-009 table referencing segments with RESTRICT.
    await admin.query("CREATE TABLE IF NOT EXISTS kiko.test_learning_ref (segment_id uuid REFERENCES kiko.segment(id) ON DELETE RESTRICT)");
    await admin.query(
      "INSERT INTO kiko.test_learning_ref SELECT s.id FROM kiko.segment s JOIN kiko.transcript_version v ON v.id = s.transcript_version_id WHERE v.lesson_id = $1",
      [id],
    );
    try {
      expect(await lessons.remove(a, { lessonId: id, expectedVersion: await versionOf(a, id) })).toEqual({
        ok: false,
        reason: "has_dependents",
      });
      expect(await lessons.get(a.userId, id)).not.toBeNull();
    } finally {
      await admin.query("DROP TABLE kiko.test_learning_ref");
    }
  });
});

describe("authorization at write time", () => {
  it("rejects writes after the account is suspended mid-session", async () => {
    const a = await learner();
    const id = await create(a);
    await admin.query(
      "UPDATE kiko.user_profile SET state = 'suspended', authorization_revision = authorization_revision + 1 WHERE id = $1",
      [a.userId],
    );
    const version = await versionOf(a, id);
    expect(await lessons.update(a, { lessonId: id, expectedVersion: version, metadata: metadata({ title: "late" }), content: content("x") })).toEqual({
      ok: false,
      reason: "stale_authorization",
    });
    expect(await lessons.create(a, { clientRequestId: randomUUID(), metadata: metadata(), content: content("x") })).toEqual({
      ok: false,
      reason: "stale_authorization",
    });
    expect((await lessons.get(a.userId, id))?.title).toBe("Bài thử");
  });
});

describe("scripts/seed-sample-lessons.mjs (DEC-025)", () => {
  const run = (args: string[]) =>
    promisify(execFile)(
      process.execPath,
      ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", path.join(process.cwd(), "scripts", "seed-sample-lessons.mjs"), ...args],
      { env: { ...process.env, DIRECT_URL: inject("adminUrl") } },
    );

  async function admittedUser(roles: string[]) {
    const tag = randomUUID().slice(0, 8);
    const email = `seed-${tag}@example.test`;
    const account = await admin.query<{ id: string }>("INSERT INTO kiko.allowed_account (email) VALUES ($1) RETURNING id", [email]);
    for (const role of roles) {
      await admin.query("INSERT INTO kiko.allowed_account_role (allowed_account_id, role_code) VALUES ($1, $2)", [account.rows[0].id, role]);
    }
    const user = await admin.query<{ id: string }>("SELECT kiko.admit_identity('supabase', $1, $2) AS id", [`seed-${tag}`, email]);
    return { email, userId: user.rows[0].id };
  }

  it("creates zh/ja/en ready lessons for the named learner once, and skips them on re-run", async () => {
    const { email, userId } = await admittedUser(["LEARNER"]);
    const first = await run(["--email", email, "--yes"]);
    expect(first.stdout).toContain("created 3, skipped 0");
    const again = await run(["--email", email, "--yes"]);
    expect(again.stdout).toContain("created 0, skipped 3");

    const { rows } = await admin.query<{ language_code: string; status: string; client_request_id: string; segments: number; source_text: string }>(
      `SELECT l.language_code, l.status, l.client_request_id,
              (SELECT count(*)::int FROM kiko.segment s WHERE s.transcript_version_id = l.active_transcript_id) AS segments,
              v.source_text
       FROM kiko.lesson l JOIN kiko.transcript_version v ON v.id = l.active_transcript_id
       WHERE l.owner_id = $1 ORDER BY l.language_code`,
      [userId],
    );
    expect(rows.map((r) => [r.language_code, r.status])).toEqual([["en", "ready"], ["ja", "ready"], ["zh", "ready"]]);
    for (const row of rows) expect(row.segments).toBe(segmentSource(row.source_text).segments.length);

    const repoView = await lessons.list(userId, { language: null, statuses: ["ready"], tag: "bài mẫu", cursor: null, limit: 10 });
    expect(repoView.items).toHaveLength(3);
  });

  it("refuses an account without the learner role and writes nothing", async () => {
    const { email, userId } = await admittedUser(["OWNER"]);
    await expect(run(["--email", email, "--yes"])).rejects.toMatchObject({ stderr: expect.stringContaining("no active, signed-in Learner") });
    const { rows } = await admin.query<{ n: number }>("SELECT count(*)::int AS n FROM kiko.lesson WHERE owner_id = $1", [userId]);
    expect(rows[0].n).toBe(0);
  });
});
