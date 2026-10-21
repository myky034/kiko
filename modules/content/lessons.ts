import { en } from "@/modules/i18n/en";
import { isLanguageCode } from "@/modules/language/registry";
import type { Actor } from "@/modules/identity/types";
import { hasPermission, type Permission } from "@/server/policy/permissions";
import {
  hasOnlyFields,
  parseClientRequestId,
  parseExpectedVersion,
  parseLessonForm,
  parseLessonId,
  type LessonFormErrors,
} from "./lesson-input";
import type {
  ActorGuard,
  LessonDetail,
  LessonFailure,
  LessonListFilter,
  LessonRepository,
  LessonStatus,
  LessonSummary,
} from "./types";

/**
 * Lesson use cases (KIKO-008). Each checks the permission first and scopes
 * every query to the actor; ids from the client only select among the
 * actor's own lessons, so a foreign id is indistinguishable from a missing one.
 */

export const PAGE_SIZE = 20;

export type Outcome<T = void> =
  | { status: "ok"; value: T }
  | { status: "forbidden" }
  | { status: "invalid"; errors: LessonFormErrors }
  | { status: "failed"; reason: LessonFailure };

function guardOf(actor: Actor): ActorGuard {
  return { userId: actor.userId, authorizationRevision: actor.authorizationRevision };
}

function allowed(actor: Actor, permission: Permission): boolean {
  return hasPermission(actor, permission);
}

const STATUS_FILTERS: Record<string, LessonStatus[]> = {
  active: ["draft", "ready"],
  draft: ["draft"],
  ready: ["ready"],
  archived: ["archived"],
};

export type LibraryQuery = { language?: string; status?: string; tag?: string; cursor?: string };

/** Unknown filter values fall back to defaults instead of erroring. */
export function toListFilter(query: LibraryQuery): LessonListFilter {
  const tag = typeof query.tag === "string" ? query.tag.trim() : "";
  return {
    language: isLanguageCode(query.language) ? query.language : null,
    statuses: STATUS_FILTERS[query.status ?? "active"] ?? STATUS_FILTERS.active,
    tag: tag.length > 0 && tag.length <= 64 ? tag : null,
    cursor: typeof query.cursor === "string" && query.cursor.length <= 200 ? query.cursor : null,
    limit: PAGE_SIZE,
  };
}

export async function listLessons(
  actor: Actor,
  repository: LessonRepository,
  query: LibraryQuery,
): Promise<Outcome<{ items: LessonSummary[]; nextCursor: string | null }>> {
  if (!allowed(actor, "lesson.read_private")) return { status: "forbidden" };
  return { status: "ok", value: await repository.list(actor.userId, toListFilter(query)) };
}

export async function getLesson(
  actor: Actor,
  repository: LessonRepository,
  lessonId: unknown,
): Promise<Outcome<LessonDetail>> {
  if (!allowed(actor, "lesson.read_private")) return { status: "forbidden" };
  const id = parseLessonId(lessonId);
  const lesson = id ? await repository.get(actor.userId, id) : null;
  return lesson ? { status: "ok", value: lesson } : { status: "failed", reason: "not_found" };
}

export async function createLesson(
  actor: Actor,
  repository: LessonRepository,
  formData: FormData,
): Promise<Outcome<{ lessonId: string }>> {
  if (!allowed(actor, "lesson.write_private")) return { status: "forbidden" };
  const parsed = parseLessonForm(formData, ["clientRequestId"]);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const clientRequestId = parseClientRequestId(formData);
  if (!clientRequestId) return { status: "invalid", errors: { form: en.form.expired } };

  const result = await repository.create(guardOf(actor), { clientRequestId, ...parsed.value });
  return result.ok ? { status: "ok", value: { lessonId: result.value.lessonId } } : { status: "failed", reason: result.reason };
}

export async function updateLesson(
  actor: Actor,
  repository: LessonRepository,
  lessonId: unknown,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "lesson.write_private")) return { status: "forbidden" };
  const id = parseLessonId(lessonId);
  if (!id) return { status: "failed", reason: "not_found" };
  const parsed = parseLessonForm(formData, ["expectedVersion"]);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const expectedVersion = parseExpectedVersion(formData);
  if (!expectedVersion) return { status: "invalid", errors: { form: en.form.invalid } };

  const result = await repository.update(guardOf(actor), { lessonId: id, expectedVersion, ...parsed.value });
  return result.ok ? { status: "ok", value: undefined } : { status: "failed", reason: result.reason };
}

type Transition = "publish" | "archive" | "unarchive";

export async function transitionLesson(
  actor: Actor,
  repository: LessonRepository,
  lessonId: unknown,
  transition: Transition,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "lesson.write_private")) return { status: "forbidden" };
  const id = parseLessonId(lessonId);
  if (!id) return { status: "failed", reason: "not_found" };
  const expectedVersion = parseExpectedVersion(formData);
  if (!hasOnlyFields(formData, ["expectedVersion"]) || !expectedVersion) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }
  const result = await repository[transition](guardOf(actor), { lessonId: id, expectedVersion });
  return result.ok ? { status: "ok", value: undefined } : { status: "failed", reason: result.reason };
}

/**
 * Permanent delete (DEC-024): the user must type the exact lesson title. The
 * database blocks the delete once learning data references the lesson.
 */
export async function deleteLesson(
  actor: Actor,
  repository: LessonRepository,
  lessonId: unknown,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "lesson.delete_private")) return { status: "forbidden" };
  const id = parseLessonId(lessonId);
  if (!id) return { status: "failed", reason: "not_found" };
  const expectedVersion = parseExpectedVersion(formData);
  if (!hasOnlyFields(formData, ["expectedVersion", "confirmTitle"]) || !expectedVersion) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }
  const lesson = await repository.get(actor.userId, id);
  if (!lesson) return { status: "failed", reason: "not_found" };
  if (formData.get("confirmTitle") !== lesson.title) {
    return { status: "invalid", errors: { form: en.deleteLesson.titleMismatch } };
  }
  const result = await repository.remove(guardOf(actor), { lessonId: id, expectedVersion });
  return result.ok ? { status: "ok", value: undefined } : { status: "failed", reason: result.reason };
}

export const FAILURE_MESSAGES: Record<LessonFailure, string> = en.lesson.failures;
