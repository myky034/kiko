import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { segmentSource } from "@/modules/content/segmentation";
import type { ActorGuard, LessonRepository } from "@/modules/content/types";
import type { SegmentSelection, VocabularyInput, VocabularyRepository } from "@/modules/vocabulary/types";
import { createPrismaLessonRepository } from "@/server/db/lesson-repository";
import { createPrismaVocabularyRepository } from "@/server/db/vocabulary-repository";

let prisma: PrismaClient;
let lessons: LessonRepository;
let vocabulary: VocabularyRepository;
let admin: pg.Client;

beforeAll(async () => {
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject("appUrl") }) });
  lessons = createPrismaLessonRepository(() => prisma);
  vocabulary = createPrismaVocabularyRepository(() => prisma);
  admin = new pg.Client({ connectionString: inject("adminUrl") });
  await admin.connect();
});

afterAll(async () => {
  await prisma?.$disconnect();
  await admin?.end();
});

async function learner(): Promise<ActorGuard> {
  const tag = randomUUID().slice(0, 8);
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO kiko.user_profile (auth_provider, auth_subject, state) VALUES ('supabase', $1, 'active') RETURNING id",
    [`vocab-${tag}`],
  );
  await admin.query("INSERT INTO kiko.user_role (user_id, role_code) VALUES ($1, 'LEARNER')", [rows[0].id]);
  return { userId: rows[0].id, authorizationRevision: 1 };
}

function content(text: string) {
  const result = segmentSource(text);
  return { sourceText: text, segments: result.segments };
}

/** A ready (published) lesson; returns its id and active version number. */
async function readyLesson(guard: ActorGuard, text: string, languageCode: "ja" | "zh" | "en" = "ja") {
  const created = await lessons.create(guard, {
    clientRequestId: randomUUID(),
    metadata: { title: "Vocabulary lesson", languageCode, tags: [], levelLabel: null, sourceNote: null },
    content: content(text),
  });
  if (!created.ok) throw new Error(created.reason);
  const lessonId = created.value.lessonId;
  const published = await lessons.publish(guard, { lessonId, expectedVersion: 1 });
  if (!published.ok) throw new Error(published.reason);
  return lessonId;
}

function word(overrides: Partial<VocabularyInput> = {}): VocabularyInput {
  return { surface: "天気", meaning: "weather", notes: null, usage: null, tags: [], starred: false, readings: ["てんき"], examples: [], ...overrides };
}

function selection(lessonId: string, text: string, start: number, end: number, versionNo = 1, position = 0): SegmentSelection {
  return { lessonId, versionNo, position, start, end, sourceText: text, selectedText: [...text].slice(start, end).join("") };
}

describe("saving words from a lesson", () => {
  it("creates the word, its reading and the occurrence; retries are no-ops", async () => {
    const a = await learner();
    const text = "😀今日は良い天気";
    const lessonId = await readyLesson(a, text);
    const target = { kind: "new" as const, clientRequestId: randomUUID(), input: word() };
    const first = await vocabulary.saveFromSegment(a, { selection: selection(lessonId, text, 6, 8), target, surfaceKey: "天気" });
    const again = await vocabulary.saveFromSegment(a, { selection: selection(lessonId, text, 6, 8), target, surfaceKey: "天気" });
    expect(first.ok && again.ok && first.value.vocabularyId === again.value.vocabularyId).toBe(true);
    const detail = await vocabulary.get(a.userId, first.ok ? first.value.vocabularyId : "");
    expect(detail?.readings).toEqual(["てんき"]);
    expect(detail?.occurrences).toHaveLength(1);
    expect(detail?.occurrences[0]).toMatchObject({ lessonId, selectedText: "天気", start: 6, end: 8, sourceText: text });
    expect(await vocabulary.listLessonOccurrences(a.userId, lessonId)).toEqual([
      { vocabularyId: detail!.id, position: 0, start: 6, end: 8 },
    ]);
  });

  it("adds another sentence to an existing word in the same language only", async () => {
    const a = await learner();
    const lessonId = await readyLesson(a, "天気がいい\n天気が悪い");
    const created = await vocabulary.create(a, { clientRequestId: randomUUID(), language: "ja", surfaceKey: "天気", word: word(), deckIds: [] });
    const vocabularyId = created.ok ? created.value.vocabularyId : "";
    const attached = await vocabulary.saveFromSegment(a, {
      selection: selection(lessonId, "天気が悪い", 0, 2, 1, 1),
      target: { kind: "existing", vocabularyId },
      surfaceKey: null,
    });
    expect(attached.ok).toBe(true);
    expect((await vocabulary.get(a.userId, vocabularyId))?.occurrenceCount).toBe(1);

    const chinese = await vocabulary.create(a, { clientRequestId: randomUUID(), language: "zh", surfaceKey: "天气", word: word({ surface: "天气", readings: [] }), deckIds: [] });
    const wrongLanguage = await vocabulary.saveFromSegment(a, {
      selection: selection(lessonId, "天気がいい", 0, 2),
      target: { kind: "existing", vocabularyId: chinese.ok ? chinese.value.vocabularyId : "" },
      surfaceKey: null,
    });
    expect(wrongLanguage).toEqual({ ok: false, reason: "invalid_state" });
  });

  it("rejects a stale version and keeps old occurrences when a new version is published", async () => {
    const a = await learner();
    const lessonId = await readyLesson(a, "猫が好き");
    const saved = await vocabulary.saveFromSegment(a, {
      selection: selection(lessonId, "猫が好き", 0, 1),
      target: { kind: "new", clientRequestId: randomUUID(), input: word({ surface: "猫", readings: ["ねこ"] }) },
      surfaceKey: "猫",
    });
    expect(saved.ok).toBe(true);

    // Edit and publish version 2: drafts stay editable even though v1 has saved words.
    const lesson = await lessons.get(a.userId, lessonId);
    const update = await lessons.update(a, {
      lessonId,
      expectedVersion: lesson!.version,
      metadata: { title: "Vocabulary lesson", languageCode: "ja", tags: [], levelLabel: null, sourceNote: null },
      content: content("犬が好き"),
    });
    expect(update.ok).toBe(true);
    const again = await lessons.update(a, {
      lessonId,
      expectedVersion: lesson!.version + 1,
      metadata: { title: "Vocabulary lesson", languageCode: "ja", tags: [], levelLabel: null, sourceNote: null },
      content: content("犬がとても好き"),
    });
    expect(again.ok).toBe(true);
    const publish = await lessons.publish(a, { lessonId, expectedVersion: lesson!.version + 2 });
    expect(publish.ok).toBe(true);

    const stale = await vocabulary.saveFromSegment(a, {
      selection: selection(lessonId, "猫が好き", 0, 1, 1),
      target: { kind: "new", clientRequestId: randomUUID(), input: word({ surface: "猫" }) },
      surfaceKey: "猫",
    });
    expect(stale).toEqual({ ok: false, reason: "version_changed" });
    const old = await vocabulary.get(a.userId, saved.ok ? saved.value.vocabularyId : "");
    expect(old?.occurrences[0]).toMatchObject({ sourceText: "猫が好き", selectedText: "猫" });
    // The active version (v2) has no saved selections yet.
    expect(await vocabulary.listLessonOccurrences(a.userId, lessonId)).toEqual([]);
  });

  it("blocks permanently deleting a lesson that has saved words (archive still works)", async () => {
    const a = await learner();
    const lessonId = await readyLesson(a, "本を読む");
    await vocabulary.saveFromSegment(a, {
      selection: selection(lessonId, "本を読む", 0, 1),
      target: { kind: "new", clientRequestId: randomUUID(), input: word({ surface: "本" }) },
      surfaceKey: "本",
    });
    const lesson = await lessons.get(a.userId, lessonId);
    expect(await lessons.remove(a, { lessonId, expectedVersion: lesson!.version })).toEqual({ ok: false, reason: "has_dependents" });
    expect((await lessons.archive(a, { lessonId, expectedVersion: lesson!.version })).ok).toBe(true);
  });
});

describe("privacy between learners", () => {
  it("never reads, lists, edits or links another learner's words, decks or lessons", async () => {
    const a = await learner();
    const b = await learner();
    const lessonId = await readyLesson(a, "私の文");
    const created = await vocabulary.create(a, { clientRequestId: randomUUID(), language: "ja", surfaceKey: "文", word: word({ surface: "文" }), deckIds: [] });
    const vocabularyId = created.ok ? created.value.vocabularyId : "";
    const deck = await vocabulary.createDeck(a, { language: "ja", title: "Mine" });
    const deckId = deck.ok ? deck.value.deckId : "";

    expect(await vocabulary.get(b.userId, vocabularyId)).toBeNull();
    const listB = await vocabulary.list(b.userId, { language: "ja", archived: false, tag: null, deckId: null, starred: false, source: "all", sort: "recent", page: 1, pageSize: 48 });
    expect(listB.items.find((item) => item.id === vocabularyId)).toBeUndefined();
    expect(await vocabulary.listDecks(b.userId, "ja")).toEqual([]);

    expect(await vocabulary.update(b, { vocabularyId, expectedVersion: 1, surfaceKey: "x", word: word({ surface: "x" }), deckIds: [] })).toEqual({ ok: false, reason: "not_found" });
    expect(await vocabulary.remove(b, { vocabularyId, expectedVersion: 1 })).toEqual({ ok: false, reason: "not_found" });
    expect(await vocabulary.setStarred(b, { vocabularyId, starred: true })).toEqual({ ok: false, reason: "not_found" });

    // B cannot save from A's lesson, attach to A's word, or put words in A's deck.
    expect(
      await vocabulary.saveFromSegment(b, {
        selection: selection(lessonId, "私の文", 2, 3),
        target: { kind: "new", clientRequestId: randomUUID(), input: word({ surface: "文" }) },
        surfaceKey: "文",
      }),
    ).toEqual({ ok: false, reason: "not_found" });
    const bLesson = await readyLesson(b, "彼の文");
    expect(
      await vocabulary.saveFromSegment(b, { selection: selection(bLesson, "彼の文", 2, 3), target: { kind: "existing", vocabularyId }, surfaceKey: null }),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(
      await vocabulary.create(b, { clientRequestId: randomUUID(), language: "ja", surfaceKey: "b", word: word({ surface: "b" }), deckIds: [deckId] }),
    ).toEqual({ ok: false, reason: "invalid_state" });

    const bWord = await vocabulary.create(b, { clientRequestId: randomUUID(), language: "ja", surfaceKey: "c", word: word({ surface: "c" }), deckIds: [] });
    expect(await vocabulary.addRelation(b, { fromId: bWord.ok ? bWord.value.vocabularyId : "", toId: vocabularyId, kind: "related" })).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

describe("editing, decks and relations", () => {
  it("replaces readings, examples and decks, bumps the version and refuses stale edits", async () => {
    const a = await learner();
    const deck = await vocabulary.createDeck(a, { language: "zh", title: "HSK 1" });
    const deckId = deck.ok ? deck.value.deckId : "";
    const created = await vocabulary.create(a, {
      clientRequestId: randomUUID(),
      language: "zh",
      surfaceKey: "早上",
      word: word({ surface: "早上", readings: ["zǎo shang"], examples: [{ text: "早上好！", reading: null, translation: "Good morning!" }] }),
      deckIds: [deckId],
    });
    const vocabularyId = created.ok ? created.value.vocabularyId : "";
    const updated = await vocabulary.update(a, {
      vocabularyId,
      expectedVersion: 1,
      surfaceKey: "早上",
      word: word({ surface: "早上", readings: ["zao3 shang5"], examples: [], starred: true }),
      deckIds: [],
    });
    expect(updated.ok).toBe(true);
    const detail = await vocabulary.get(a.userId, vocabularyId);
    expect(detail).toMatchObject({ version: 2, readings: ["zao3 shang5"], examples: [], decks: [], starred: true });
    expect(await vocabulary.update(a, { vocabularyId, expectedVersion: 1, surfaceKey: "早上", word: word({ surface: "早上" }), deckIds: [] })).toEqual({
      ok: false,
      reason: "conflict",
    });
    // Deleting the deck never deletes words.
    expect((await vocabulary.removeDeck(a, { deckId, expectedVersion: 1 })).ok).toBe(true);
    expect(await vocabulary.get(a.userId, vocabularyId)).not.toBeNull();
  });

  it("stores relations undirected and once", async () => {
    const a = await learner();
    const make = async (surface: string) => {
      const result = await vocabulary.create(a, { clientRequestId: randomUUID(), language: "ja", surfaceKey: surface, word: word({ surface }), deckIds: [] });
      return result.ok ? result.value.vocabularyId : "";
    };
    const morning = await make("朝");
    const breakfast = await make("朝ご飯");
    expect((await vocabulary.addRelation(a, { fromId: morning, toId: breakfast, kind: "related" })).ok).toBe(true);
    expect((await vocabulary.addRelation(a, { fromId: breakfast, toId: morning, kind: "synonym" })).ok).toBe(true);
    expect((await vocabulary.get(a.userId, morning))?.related).toEqual([{ id: breakfast, surface: "朝ご飯", readings: ["てんき"], kind: "related" }]);
    expect((await vocabulary.get(a.userId, breakfast))?.related.map((r) => r.id)).toEqual([morning]);
    expect((await vocabulary.removeRelation(a, { fromId: breakfast, toId: morning })).ok).toBe(true);
    expect((await vocabulary.get(a.userId, morning))?.related).toEqual([]);
  });

  it("filters by source, starred, tag and deck, and warns about similar surfaces", async () => {
    const a = await learner();
    const lessonId = await readyLesson(a, "Good morning, Kiko", "en");
    await vocabulary.saveFromSegment(a, {
      selection: selection(lessonId, "Good morning, Kiko", 5, 12),
      target: { kind: "new", clientRequestId: randomUUID(), input: word({ surface: "morning", readings: [], tags: ["daily"] }) },
      surfaceKey: "morning",
    });
    await vocabulary.create(a, { clientRequestId: randomUUID(), language: "en", surfaceKey: "evening", word: word({ surface: "evening", readings: [], starred: true }), deckIds: [] });
    const base = { language: "en" as const, archived: false, tag: null, deckId: null, starred: false, source: "all" as const, sort: "alphabetical" as const, page: 1, pageSize: 12 };
    expect((await vocabulary.list(a.userId, base)).items.map((i) => i.surface)).toEqual(["evening", "morning"]);
    expect((await vocabulary.list(a.userId, { ...base, source: "lesson" })).items.map((i) => i.surface)).toEqual(["morning"]);
    expect((await vocabulary.list(a.userId, { ...base, source: "manual" })).items.map((i) => i.surface)).toEqual(["evening"]);
    expect((await vocabulary.list(a.userId, { ...base, starred: true })).items.map((i) => i.surface)).toEqual(["evening"]);
    expect((await vocabulary.list(a.userId, { ...base, tag: "daily" })).items.map((i) => i.surface)).toEqual(["morning"]);
    expect((await vocabulary.findSimilar(a.userId, "en", "morning")).map((i) => i.surface)).toEqual(["morning"]);
    expect(await vocabulary.countActive(a.userId, "en")).toBe(2);
  });

  it("refuses writes guarded on a stale authorization revision", async () => {
    const a = await learner();
    await admin.query("UPDATE kiko.user_profile SET authorization_revision = authorization_revision + 1 WHERE id = $1", [a.userId]);
    expect(await vocabulary.create(a, { clientRequestId: randomUUID(), language: "ja", surfaceKey: "x", word: word({ surface: "x" }), deckIds: [] })).toEqual({
      ok: false,
      reason: "stale_authorization",
    });
  });
});
