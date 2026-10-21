import { describe, expect, it } from "vitest";
import { createLesson, deleteLesson, getLesson, listLessons, toListFilter, transitionLesson, updateLesson } from "@/modules/content/lessons";
import type { LessonDetail, LessonRepository } from "@/modules/content/types";
import type { Actor } from "@/modules/identity/types";
import { permissionsForRoles } from "@/server/policy/permissions";

function actor(roles: ("OWNER" | "LEARNER")[], userId = "user-a"): Actor {
  return { userId, email: null, roles, permissions: permissionsForRoles(roles), authorizationRevision: 1, timezone: "UTC", onboardedAt: new Date() };
}

const lesson: LessonDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Bài A",
  languageCode: "en",
  status: "draft",
  tags: [],
  updatedAt: new Date(),
  sourceNote: null,
  levelLabel: null,
  version: 3,
  createdAt: new Date(),
  archivedAt: null,
  active: null,
  draft: { versionNo: 1, sourceText: "x", segments: [{ position: 0, text: "x" }] },
};

/** TEST DOUBLE recording calls; returns the lesson only for its owner. */
function fakeRepository() {
  const calls: { method: string; args: unknown[] }[] = [];
  const record = (method: string) => async (...args: unknown[]) => {
    calls.push({ method, args });
    return { ok: true as const, value: method === "create" ? { lessonId: lesson.id, created: true } : undefined };
  };
  const repository: LessonRepository = {
    list: async (...args) => {
      calls.push({ method: "list", args });
      return { items: [], nextCursor: null };
    },
    get: async (ownerId, id) => {
      calls.push({ method: "get", args: [ownerId, id] });
      return ownerId === "user-a" && id === lesson.id ? lesson : null;
    },
    create: record("create") as LessonRepository["create"],
    update: record("update") as LessonRepository["update"],
    publish: record("publish") as LessonRepository["publish"],
    archive: record("archive") as LessonRepository["archive"],
    unarchive: record("unarchive") as LessonRepository["unarchive"],
    remove: record("remove") as LessonRepository["remove"],
  };
  return { repository, calls };
}

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.append(k, v);
  return data;
}

const validLesson = { title: "T", languageCode: "en", tags: "", levelLabel: "", sourceNote: "", content: "x" };

describe("lesson use cases", () => {
  it("forbids an Owner-only account from every lesson operation without touching storage", async () => {
    const owner = actor(["OWNER"]);
    const { repository, calls } = fakeRepository();
    const results = [
      await listLessons(owner, repository, {}),
      await getLesson(owner, repository, lesson.id),
      await createLesson(owner, repository, form({ ...validLesson, clientRequestId: crypto.randomUUID() })),
      await updateLesson(owner, repository, lesson.id, form({ ...validLesson, expectedVersion: "3" })),
      await transitionLesson(owner, repository, lesson.id, "publish", form({ expectedVersion: "3" })),
      await deleteLesson(owner, repository, lesson.id, form({ expectedVersion: "3", confirmTitle: "Bài A" })),
    ];
    for (const result of results) expect(result).toEqual({ status: "forbidden" });
    expect(calls).toEqual([]);
  });

  it("always scopes reads and writes to the actor, never to client input", async () => {
    const { repository, calls } = fakeRepository();
    const learner = actor(["LEARNER"], "user-b");
    expect(await getLesson(learner, repository, lesson.id)).toEqual({ status: "failed", reason: "not_found" });
    await createLesson(learner, repository, form({ ...validLesson, clientRequestId: crypto.randomUUID() }));
    expect(calls.map((c) => c.method)).toEqual(["get", "create"]);
    expect(calls[0].args[0]).toBe("user-b");
    expect((calls[1].args[0] as { userId: string }).userId).toBe("user-b");
  });

  it("rejects malformed ids without querying", async () => {
    const { repository, calls } = fakeRepository();
    expect(await getLesson(actor(["LEARNER"]), repository, "../etc")).toEqual({ status: "failed", reason: "not_found" });
    expect(calls).toEqual([]);
  });

  it("requires the exact title to confirm a permanent delete", async () => {
    const { repository, calls } = fakeRepository();
    const learner = actor(["LEARNER"]);
    const wrong = await deleteLesson(learner, repository, lesson.id, form({ expectedVersion: "3", confirmTitle: "bài a" }));
    expect(wrong.status).toBe("invalid");
    expect(calls.some((c) => c.method === "remove")).toBe(false);
    expect(await deleteLesson(learner, repository, lesson.id, form({ expectedVersion: "3", confirmTitle: "Bài A" }))).toEqual({
      status: "ok",
      value: undefined,
    });
  });

  it("rejects extra fields on transition forms", async () => {
    const { repository } = fakeRepository();
    const result = await transitionLesson(actor(["LEARNER"]), repository, lesson.id, "archive", form({ expectedVersion: "3", status: "ready" }));
    expect(result.status).toBe("invalid");
  });

  it("requires a client request id to create (retry safety)", async () => {
    const { repository } = fakeRepository();
    expect((await createLesson(actor(["LEARNER"]), repository, form(validLesson))).status).toBe("invalid");
  });
});

describe("toListFilter", () => {
  it("defaults to non-archived lessons and ignores unknown values", () => {
    expect(toListFilter({ language: "ko", status: "deleted", tag: "  " })).toMatchObject({
      language: null,
      statuses: ["draft", "ready"],
      tag: null,
    });
    expect(toListFilter({ language: "ja", status: "archived", tag: " 日常 " })).toMatchObject({
      language: "ja",
      statuses: ["archived"],
      tag: "日常",
    });
  });
});
