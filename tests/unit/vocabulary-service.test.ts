import { describe, expect, it } from "vitest";
import type { LessonDetail, LessonRepository } from "@/modules/content/types";
import type { Actor } from "@/modules/identity/types";
import { parseWordForm } from "@/modules/vocabulary/input";
import type { VocabularyRepository } from "@/modules/vocabulary/types";
import {
  createVocabulary,
  deleteVocabulary,
  relateWords,
  saveWordFromLesson,
  toVocabularyFilter,
} from "@/modules/vocabulary/vocabulary";
import { permissionsForRoles } from "@/server/policy/permissions";

function actor(roles: ("OWNER" | "LEARNER")[], userId = "user-a"): Actor {
  return { userId, email: null, roles, permissions: permissionsForRoles(roles), authorizationRevision: 1, timezone: "UTC", onboardedAt: new Date() };
}

const LESSON_ID = "11111111-1111-4111-8111-111111111111";
const WORD_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

function lesson(active: boolean): LessonDetail {
  const version = { versionNo: 2, sourceText: "😀今日は良い天気", segments: [{ position: 0, text: "😀今日は良い天気" }] };
  return {
    id: LESSON_ID,
    title: "Weather",
    languageCode: "ja",
    status: active ? "ready" : "draft",
    tags: [],
    updatedAt: new Date(),
    sourceNote: null,
    levelLabel: null,
    version: 3,
    createdAt: new Date(),
    archivedAt: null,
    active: active ? version : null,
    draft: active ? null : version,
  };
}

function lessonRepository(detail: LessonDetail): LessonRepository {
  return { get: async (ownerId, id) => (ownerId === "user-a" && id === LESSON_ID ? detail : null) } as LessonRepository;
}

/** TEST DOUBLE recording the calls the service makes. */
function vocabularyRepository() {
  const calls: { method: string; args: unknown[] }[] = [];
  const handler: ProxyHandler<object> = {
    get: (_target, method: string) => async (...args: unknown[]) => {
      calls.push({ method, args });
      if (method === "saveFromSegment") return { ok: true, value: { vocabularyId: WORD_ID } };
      if (method === "create") return { ok: true, value: { vocabularyId: WORD_ID, created: true } };
      return { ok: true, value: undefined };
    },
  };
  return { repository: new Proxy({}, handler) as VocabularyRepository, calls };
}

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

const saveBase: [string, string][] = [
  ["lessonId", LESSON_ID],
  ["versionNo", "2"],
  ["position", "0"],
  ["mode", "new"],
  ["meaning", "weather"],
  ["clientRequestId", REQUEST_ID],
];

describe("saveWordFromLesson", () => {
  it("derives the selected text from the stored segment and uses it as the default surface", async () => {
    const { repository, calls } = vocabularyRepository();
    const result = await saveWordFromLesson(actor(["LEARNER"]), { vocabulary: repository, lessons: lessonRepository(lesson(true)) }, form([...saveBase, ["start", "5"], ["end", "8"], ["surface", ""]]));
    expect(result).toEqual({ status: "ok", value: { vocabularyId: WORD_ID } });
    const input = calls[0].args[1] as { selection: { selectedText: string; start: number; end: number }; target: { input: { surface: string } } };
    expect(input.selection).toMatchObject({ selectedText: "い天気", start: 5, end: 8 });
    expect(input.target.input.surface).toBe("い天気");
  });

  it("locates a typed phrase when no offsets are sent (keyboard path)", async () => {
    const { repository, calls } = vocabularyRepository();
    await saveWordFromLesson(actor(["LEARNER"]), { vocabulary: repository, lessons: lessonRepository(lesson(true)) }, form([...saveBase, ["phrase", "天気"], ["surface", "天気"]]));
    expect((calls[0].args[1] as { selection: { start: number; end: number } }).selection).toMatchObject({ start: 6, end: 8 });
  });

  it("refuses draft-only lessons, stale versions and bad selections", async () => {
    const { repository, calls } = vocabularyRepository();
    const draftOnly = await saveWordFromLesson(actor(["LEARNER"]), { vocabulary: repository, lessons: lessonRepository(lesson(false)) }, form([...saveBase, ["start", "6"], ["end", "8"]]));
    expect(draftOnly).toMatchObject({ status: "invalid", errors: { selection: expect.stringMatching(/ready/) } });

    const stale = await saveWordFromLesson(
      actor(["LEARNER"]),
      { vocabulary: repository, lessons: lessonRepository(lesson(true)) },
      form([...saveBase.map(([k, v]): [string, string] => (k === "versionNo" ? [k, "1"] : [k, v])), ["start", "6"], ["end", "8"]]),
    );
    expect(stale).toEqual({ status: "failed", reason: "version_changed" });

    const outOfRange = await saveWordFromLesson(actor(["LEARNER"]), { vocabulary: repository, lessons: lessonRepository(lesson(true)) }, form([...saveBase, ["start", "6"], ["end", "99"]]));
    expect(outOfRange.status).toBe("invalid");
    expect(calls).toHaveLength(0);
  });

  it("does not reveal another learner's lesson", async () => {
    const { repository } = vocabularyRepository();
    const result = await saveWordFromLesson(actor(["LEARNER"], "user-b"), { vocabulary: repository, lessons: lessonRepository(lesson(true)) }, form([...saveBase, ["start", "6"], ["end", "8"]]));
    expect(result).toEqual({ status: "failed", reason: "not_found" });
  });

  it("is forbidden for an Owner-only account and rejects client-supplied text fields", async () => {
    const { repository } = vocabularyRepository();
    const owner = await saveWordFromLesson(actor(["OWNER"]), { vocabulary: repository, lessons: lessonRepository(lesson(true)) }, form(saveBase));
    expect(owner).toEqual({ status: "forbidden" });
    const injected = await saveWordFromLesson(
      actor(["LEARNER"]),
      { vocabulary: repository, lessons: lessonRepository(lesson(true)) },
      form([...saveBase, ["start", "6"], ["end", "8"], ["selectedText", "something else"]]),
    );
    expect(injected).toMatchObject({ status: "invalid", errors: { form: expect.any(String) } });
  });

  it("attaches to an existing word without word fields", async () => {
    const { repository, calls } = vocabularyRepository();
    const result = await saveWordFromLesson(
      actor(["LEARNER"]),
      { vocabulary: repository, lessons: lessonRepository(lesson(true)) },
      form([["lessonId", LESSON_ID], ["versionNo", "2"], ["position", "0"], ["start", "6"], ["end", "8"], ["mode", "existing"], ["vocabularyId", WORD_ID]]),
    );
    expect(result.status).toBe("ok");
    expect((calls[0].args[1] as { target: unknown }).target).toEqual({ kind: "existing", vocabularyId: WORD_ID });
  });
});

describe("word form", () => {
  it("keeps Unicode as typed, drops empty rows and parses tags", () => {
    const parsed = parseWordForm(
      form([
        ["surface", " 早上 "],
        ["meaning", "morning"],
        ["reading", "zǎo shang"],
        ["reading", ""],
        ["tags", "daily life, time"],
        ["starred", "on"],
        ["exampleText", "我每天早上跑步。"],
        ["exampleReading", ""],
        ["exampleTranslation", "I run every morning."],
        ["exampleText", ""],
        ["exampleReading", ""],
        ["exampleTranslation", ""],
      ]),
      [],
    );
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        word: {
          surface: "早上",
          readings: ["zǎo shang"],
          tags: ["daily life", "time"],
          starred: true,
          examples: [{ text: "我每天早上跑步。", reading: null, translation: "I run every morning." }],
        },
      },
    });
  });

  it("rejects unknown fields, missing meaning and too many readings", () => {
    expect(parseWordForm(form([["surface", "a"], ["meaning", "b"], ["ownerId", "x"]]), [])).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
    expect(parseWordForm(form([["surface", "a"], ["meaning", ""]]), [])).toMatchObject({ ok: false, errors: { meaning: expect.any(String) } });
    const many = form([["surface", "a"], ["meaning", "b"], ...["1", "2", "3", "4", "5", "6"].map((r): [string, string] => ["reading", r])]);
    expect(parseWordForm(many, [])).toMatchObject({ ok: false, errors: { readings: expect.any(String) } });
  });
});

describe("permissions and filters", () => {
  it("forbids writes and deletes for an Owner-only account", async () => {
    const { repository } = vocabularyRepository();
    expect(await createVocabulary(actor(["OWNER"]), repository, "ja", form([]))).toEqual({ status: "forbidden" });
    expect(await deleteVocabulary(actor(["OWNER"]), repository, WORD_ID, form([]))).toEqual({ status: "forbidden" });
  });

  it("rejects relating a word to itself before touching storage", async () => {
    const { repository, calls } = vocabularyRepository();
    const result = await relateWords(actor(["LEARNER"]), repository, WORD_ID, form([["relatedId", WORD_ID], ["kind", "related"]]));
    expect(result.status).toBe("invalid");
    expect(calls).toHaveLength(0);
  });

  it("bounds page, page size and unknown values", () => {
    expect(toVocabularyFilter("zh", { page: "99999", size: "7", sort: "x", source: "y", deck: "nope" })).toMatchObject({
      page: 1,
      pageSize: 12,
      sort: "recent",
      source: "all",
      deckId: null,
    });
    expect(toVocabularyFilter("zh", { page: "3", size: "24", sort: "alphabetical", source: "manual", archived: "1" })).toMatchObject({
      page: 3,
      pageSize: 24,
      sort: "alphabetical",
      source: "manual",
      archived: true,
    });
  });
});
