// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { admitEmail, asRole, createMigratedDatabase, errorOf } from "../support/pglite-database";

let db: PGlite;
let ownerA: string;
let ownerB: string;
let counter = 0;

beforeAll(async () => {
  db = await createMigratedDatabase();
  await admitEmail(db, "va@example.test", ["LEARNER"]);
  await admitEmail(db, "vb@example.test", ["LEARNER"]);
  const admit = async (subject: string, email: string) =>
    (
      await asRole(db, "kiko_app", () =>
        db.query<{ id: string }>("SELECT kiko.admit_identity('supabase', $1, $2) AS id", [subject, email]),
      )
    ).rows[0].id;
  ownerA = await admit("s-va", "va@example.test");
  ownerB = await admit("s-vb", "vb@example.test");
}, 60_000);

const app = <T>(work: () => Promise<T>) => asRole(db, "kiko_app", work);

/** Lesson with one version (as kiko_app); returns ids, segment ids by position. */
async function lesson(owner: string, language: string, lines: string[], published = true) {
  counter += 1;
  return app(async () => {
    const lessonRow = await db.query<{ id: string }>(
      "INSERT INTO kiko.lesson (owner_id, language_code, title, client_request_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [owner, language, `Lesson ${counter}`, `vreq-${counter}`],
    );
    const lessonId = lessonRow.rows[0].id;
    const version = await db.query<{ id: string }>(
      `INSERT INTO kiko.transcript_version (lesson_id, owner_id, language_code, version_no, source_text, segmentation_rule)
       VALUES ($1, $2, $3, 1, $4, 'line-v1') RETURNING id`,
      [lessonId, owner, language, lines.join("\n")],
    );
    const versionId = version.rows[0].id;
    const segments: string[] = [];
    for (const [position, text] of lines.entries()) {
      const segment = await db.query<{ id: string }>(
        "INSERT INTO kiko.segment (transcript_version_id, owner_id, language_code, position, text) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [versionId, owner, language, position, text],
      );
      segments.push(segment.rows[0].id);
    }
    if (published) {
      await db.query("UPDATE kiko.transcript_version SET state = 'published', published_at = now() WHERE id = $1", [versionId]);
      await db.query("UPDATE kiko.lesson SET status = 'ready', active_transcript_id = $2, version = version + 1 WHERE id = $1", [
        lessonId,
        versionId,
      ]);
    }
    return { lessonId, versionId, segments };
  });
}

async function word(owner: string, language: string, surface = "言葉", extra: Record<string, unknown> = {}) {
  const columns = ["owner_id", "language_code", "surface", "surface_key", "meaning", ...Object.keys(extra)];
  const values = [owner, language, surface, surface, "word", ...Object.values(extra)];
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  return app(async () => {
    const row = await db.query<{ id: string }>(
      `INSERT INTO kiko.vocabulary_item (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`,
      values,
    );
    return row.rows[0].id;
  });
}

type OccurrenceInput = {
  owner: string;
  vocabularyId: string;
  language: string;
  lessonId: string;
  versionId: string;
  segmentId: string;
  sourceText: string;
  selected: string;
  start: number;
  end: number;
};

function occurrence(input: OccurrenceInput) {
  return app(() =>
    errorOf(
      db.query(
        `INSERT INTO kiko.vocabulary_occurrence
           (owner_id, vocabulary_id, language_code, lesson_id, transcript_version_id, segment_id, source_text, selected_text, offset_start, offset_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          input.owner,
          input.vocabularyId,
          input.language,
          input.lessonId,
          input.versionId,
          input.segmentId,
          input.sourceText,
          input.selected,
          input.start,
          input.end,
        ],
      ),
    ),
  );
}

describe("vocabulary_item constraints", () => {
  it.each([
    ["surface padded", { surface: " 言葉" }, /vocabulary_item_surface_check/],
    ["surface with a line break", { surface: "言\n葉" }, /vocabulary_item_surface_check/],
    ["surface too long", { surface: "字".repeat(101) }, /vocabulary_item_surface_check/],
    ["empty meaning", { meaning: "" }, /vocabulary_item_meaning_check/],
    ["empty notes", { notes: "" }, /vocabulary_item_notes_check/],
    ["too many tags", { tags: ["a", "b", "c", "d", "e", "f"] }, /vocabulary_item_tags_check/],
    ["duplicate tags", { tags: ["a", "a"] }, /vocabulary_item_tags_check/],
  ])("rejects %s", async (_label, override, pattern) => {
    const row = { surface: "言葉", surface_key: "言葉", meaning: "word", notes: null, tags: [], ...override };
    const error = await app(() =>
      errorOf(
        db.query(
          "INSERT INTO kiko.vocabulary_item (owner_id, language_code, surface, surface_key, meaning, notes, tags) VALUES ($1, 'ja', $2, $3, $4, $5, $6)",
          [ownerA, row.surface, row.surface_key, row.meaning, row.notes, row.tags],
        ),
      ),
    );
    expect(error).toMatch(pattern);
  });

  it("accepts NULL optional fields and preserves Unicode as typed", async () => {
    const id = await word(ownerA, "zh", "早上", { notes: null, usage: null });
    const row = await db.query<{ surface: string }>("SELECT surface FROM kiko.vocabulary_item WHERE id = $1", [id]);
    expect(row.rows[0].surface).toBe("早上");
  });

  it("does not let the runtime change owner or language", async () => {
    const id = await word(ownerA, "ja");
    for (const sql of [
      "UPDATE kiko.vocabulary_item SET owner_id = $2 WHERE id = $1",
      "UPDATE kiko.vocabulary_item SET language_code = 'zh' WHERE id = $1 AND $2::uuid IS NOT NULL",
    ]) {
      expect(await app(() => errorOf(db.query(sql, [id, ownerB])))).toMatch(/permission denied/);
    }
  });
});

describe("pronunciation", () => {
  it.each([
    ["zh", "pinyin", null],
    ["ja", "kana", null],
    ["en", "ipa", null],
    ["zh", "kana", /pronunciation_notation_check/],
    ["en", "pinyin", /pronunciation_notation_check/],
  ])("%s with %s", async (language, notation, pattern) => {
    const id = await word(ownerA, language, `w-${language}-${notation}`);
    const error = await app(() =>
      errorOf(
        db.query(
          "INSERT INTO kiko.pronunciation (owner_id, vocabulary_id, language_code, notation, value, position) VALUES ($1, $2, $3, $4, 'x', 0)",
          [ownerA, id, language, notation],
        ),
      ),
    );
    if (pattern) expect(error).toMatch(pattern);
    else expect(error).toBeNull();
  });

  it("rejects a reading attached across owners or languages", async () => {
    const id = await word(ownerA, "zh", "你好");
    const insert = (owner: string, language: string, notation: string) =>
      app(() =>
        errorOf(
          db.query(
            "INSERT INTO kiko.pronunciation (owner_id, vocabulary_id, language_code, notation, value, position) VALUES ($1, $2, $3, $4, 'x', 1)",
            [owner, id, language, notation],
          ),
        ),
      );
    expect(await insert(ownerB, "zh", "pinyin")).toMatch(/foreign key/);
    expect(await insert(ownerA, "ja", "kana")).toMatch(/foreign key/);
  });
});

describe("vocabulary_occurrence", () => {
  it("accepts an exact code-point selection of a published segment", async () => {
    const text = "😀今日は良い天気";
    const { lessonId, versionId, segments } = await lesson(ownerA, "ja", [text]);
    const vocabularyId = await word(ownerA, "ja", "天気");
    const base = { owner: ownerA, vocabularyId, language: "ja", lessonId, versionId, segmentId: segments[0], sourceText: text };
    // "天気" is code points 6–8: the emoji (two UTF-16 units) counts once.
    expect(await occurrence({ ...base, selected: "天気", start: 6, end: 8 })).toBeNull();
    // Retry of the same selection is a no-op conflict on the unique key.
    expect(await occurrence({ ...base, selected: "天気", start: 6, end: 8 })).toMatch(/unique|duplicate/);
  });

  it.each([
    ["end before start", "天", 8, 7, /vocabulary_occurrence_offsets_check/],
    ["negative start", "天", -1, 1, /vocabulary_occurrence_offsets_check/],
    ["end past the text", "気", 8, 99, /vocabulary_occurrence_offsets_check/],
    ["selection not matching the offsets", "今日", 6, 8, /vocabulary_occurrence_selection_check/],
  ])("rejects %s", async (_label, selected, start, end, pattern) => {
    const text = "😀今日は良い天気";
    const { lessonId, versionId, segments } = await lesson(ownerA, "ja", [text]);
    const vocabularyId = await word(ownerA, "ja", `x-${counter}`);
    expect(
      await occurrence({ owner: ownerA, vocabularyId, language: "ja", lessonId, versionId, segmentId: segments[0], sourceText: text, selected, start, end }),
    ).toMatch(pattern);
  });

  it("rejects selections with surrounding whitespace", async () => {
    const text = "good morning all";
    const { lessonId, versionId, segments } = await lesson(ownerA, "en", [text]);
    const vocabularyId = await word(ownerA, "en", "morning");
    expect(
      await occurrence({ owner: ownerA, vocabularyId, language: "en", lessonId, versionId, segmentId: segments[0], sourceText: text, selected: " morning", start: 4, end: 12 }),
    ).toMatch(/vocabulary_occurrence_selection_check/);
  });

  it("rejects a draft segment, a mismatched snapshot and a segment of another lesson", async () => {
    const draft = await lesson(ownerA, "ja", ["下書き"], false);
    const vocabularyId = await word(ownerA, "ja", "下書き");
    const base = { owner: ownerA, vocabularyId, language: "ja", selected: "下書き", start: 0, end: 3 };
    expect(
      await occurrence({ ...base, lessonId: draft.lessonId, versionId: draft.versionId, segmentId: draft.segments[0], sourceText: "下書き" }),
    ).toMatch(/published segment/);

    const real = await lesson(ownerA, "ja", ["下書き"]);
    expect(
      await occurrence({ ...base, lessonId: real.lessonId, versionId: real.versionId, segmentId: real.segments[0], sourceText: "下書き!" , selected: "下書き" }),
    ).toMatch(/published segment/);

    const other = await lesson(ownerA, "ja", ["別"]);
    expect(
      await occurrence({ ...base, lessonId: other.lessonId, versionId: real.versionId, segmentId: real.segments[0], sourceText: "下書き" }),
    ).toMatch(/published segment/);
  });

  it("rejects links across owners and languages", async () => {
    const mine = await lesson(ownerA, "ja", ["私の文"]);
    const theirWord = await word(ownerB, "ja", "文");
    expect(
      await occurrence({ owner: ownerB, vocabularyId: theirWord, language: "ja", lessonId: mine.lessonId, versionId: mine.versionId, segmentId: mine.segments[0], sourceText: "私の文", selected: "文", start: 2, end: 3 }),
    ).toMatch(/foreign key/);

    const zhWord = await word(ownerA, "zh", "文");
    expect(
      await occurrence({ owner: ownerA, vocabularyId: zhWord, language: "zh", lessonId: mine.lessonId, versionId: mine.versionId, segmentId: mine.segments[0], sourceText: "私の文", selected: "文", start: 2, end: 3 }),
    ).toMatch(/foreign key/);
  });

  it("is append-only for the runtime and immutable for everyone", async () => {
    const text = "本を読む";
    const { lessonId, versionId, segments } = await lesson(ownerA, "ja", [text]);
    const vocabularyId = await word(ownerA, "ja", "本");
    await occurrence({ owner: ownerA, vocabularyId, language: "ja", lessonId, versionId, segmentId: segments[0], sourceText: text, selected: "本", start: 0, end: 1 });
    expect(
      await app(() => errorOf(db.query("UPDATE kiko.vocabulary_occurrence SET offset_end = 2 WHERE vocabulary_id = $1", [vocabularyId]))),
    ).toMatch(/permission denied/);
    expect(
      await errorOf(db.query("UPDATE kiko.vocabulary_occurrence SET offset_end = 1 WHERE vocabulary_id = $1", [vocabularyId])),
    ).toMatch(/immutable/);
  });

  it("blocks deleting a lesson that has saved words, but not editing its draft", async () => {
    const text = "猫が好き";
    const { lessonId, versionId, segments } = await lesson(ownerA, "ja", [text]);
    const vocabularyId = await word(ownerA, "ja", "猫");
    await occurrence({ owner: ownerA, vocabularyId, language: "ja", lessonId, versionId, segmentId: segments[0], sourceText: text, selected: "猫", start: 0, end: 1 });

    expect(await app(() => errorOf(db.query("DELETE FROM kiko.lesson WHERE id = $1", [lessonId])))).toMatch(/foreign key/);

    // A new draft version can still be written and rewritten.
    const draftError = await app(async () => {
      const draft = await db.query<{ id: string }>(
        `INSERT INTO kiko.transcript_version (lesson_id, owner_id, language_code, version_no, source_text, segmentation_rule)
         VALUES ($1, $2, 'ja', 2, '犬が好き', 'line-v1') RETURNING id`,
        [lessonId, ownerA],
      );
      const draftId = draft.rows[0].id;
      await db.query("INSERT INTO kiko.segment (transcript_version_id, owner_id, language_code, position, text) VALUES ($1, $2, 'ja', 0, '犬が好き')", [
        draftId,
        ownerA,
      ]);
      return errorOf(db.query("DELETE FROM kiko.segment WHERE transcript_version_id = $1", [draftId]));
    });
    expect(draftError).toBeNull();

    // Deleting the word releases the lesson.
    await app(() => db.query("DELETE FROM kiko.vocabulary_item WHERE id = $1", [vocabularyId]));
    expect(await app(() => errorOf(db.query("DELETE FROM kiko.lesson WHERE id = $1", [lessonId])))).toBeNull();
  });
});

describe("decks and relations", () => {
  it("keeps deck membership within one owner and language, and never deletes words with it", async () => {
    const deck = await app(async () =>
      (await db.query<{ id: string }>("INSERT INTO kiko.deck (owner_id, language_code, title) VALUES ($1, 'ja', 'Daily') RETURNING id", [ownerA])).rows[0].id,
    );
    const mine = await word(ownerA, "ja", "毎日");
    const theirs = await word(ownerB, "ja", "毎日");
    const chinese = await word(ownerA, "zh", "每天");
    const add = (owner: string, vocabularyId: string, language: string) =>
      app(() =>
        errorOf(
          db.query("INSERT INTO kiko.deck_item (deck_id, vocabulary_id, owner_id, language_code) VALUES ($1, $2, $3, $4)", [
            deck,
            vocabularyId,
            owner,
            language,
          ]),
        ),
      );
    expect(await add(ownerA, mine, "ja")).toBeNull();
    expect(await add(ownerB, theirs, "ja")).toMatch(/foreign key/);
    expect(await add(ownerA, chinese, "zh")).toMatch(/foreign key/);

    await app(() => db.query("DELETE FROM kiko.deck WHERE id = $1", [deck]));
    const still = await db.query("SELECT 1 FROM kiko.vocabulary_item WHERE id = $1", [mine]);
    expect(still.rows).toHaveLength(1);
  });

  it("rejects self, reverse-duplicate, cross-owner and unknown-kind relations", async () => {
    const a = await word(ownerA, "ja", "朝");
    const b = await word(ownerA, "ja", "朝ご飯");
    const foreign = await word(ownerB, "ja", "夜");
    const relate = (owner: string, from: string, to: string, kind = "related") =>
      app(() =>
        errorOf(
          db.query(
            "INSERT INTO kiko.vocabulary_relation (owner_id, from_vocabulary_id, to_vocabulary_id, language_code, kind) VALUES ($1, $2, $3, 'ja', $4)",
            [owner, from, to, kind],
          ),
        ),
      );
    expect(await relate(ownerA, a, b)).toBeNull();
    expect(await relate(ownerA, b, a)).toMatch(/vocabulary_relation_pair_key|duplicate|unique/);
    expect(await relate(ownerA, a, a)).toMatch(/vocabulary_relation_distinct_check/);
    expect(await relate(ownerA, a, foreign)).toMatch(/foreign key/);
    const c = await word(ownerA, "ja", "昼");
    expect(await relate(ownerA, a, c, "opposite")).toMatch(/vocabulary_relation_kind_check/);
  });
});

describe("examples", () => {
  it.each([
    ["accepts a full example", { text: "毎朝走る。", reading: "まいあさはしる", translation: "I run every morning." }, null],
    ["accepts NULL reading and translation", { text: "走る", reading: null, translation: null }, null],
    ["rejects an empty translation", { text: "走る", reading: null, translation: "" }, /vocabulary_example_translation_check/],
    ["rejects a padded text", { text: " 走る", reading: null, translation: null }, /vocabulary_example_text_check/],
  ])("%s", async (_label, example, pattern) => {
    const id = await word(ownerA, "ja", `ex-${counter++}`);
    const error = await app(() =>
      errorOf(
        db.query(
          "INSERT INTO kiko.vocabulary_example (owner_id, vocabulary_id, language_code, position, text, reading, translation) VALUES ($1, $2, 'ja', 0, $3, $4, $5)",
          [ownerA, id, example.text, example.reading, example.translation],
        ),
      ),
    );
    if (pattern) expect(error).toMatch(pattern);
    else expect(error).toBeNull();
  });
});

describe("Supabase API roles", () => {
  it("cannot reach vocabulary tables", async () => {
    for (const role of ["anon", "authenticated"]) {
      expect(await asRole(db, role, () => errorOf(db.query("SELECT 1 FROM kiko.vocabulary_item LIMIT 1")))).toMatch(
        /permission denied/,
      );
    }
  });
});
