import "server-only";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isLanguageCode, type LanguageCode } from "@/modules/language/registry";
import { SEGMENTATION_RULE } from "@/modules/content/segmentation";
import { lockActiveActor } from "./actor-guard";
import type {
  ActorGuard,
  LessonContent,
  LessonDetail,
  LessonFailure,
  LessonListFilter,
  LessonRepository,
  LessonResult,
  LessonSummary,
  VersionView,
} from "@/modules/content/types";

type Tx = Prisma.TransactionClient;

/** Aborts the surrounding transaction with a domain failure. */
class Abort extends Error {
  constructor(readonly reason: LessonFailure) {
    super(reason);
  }
}

function isForeignKeyViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  return /foreign key|23503/i.test(String((error as { message?: unknown })?.message ?? ""));
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return true;
  return /unique constraint|23505/i.test(String((error as { message?: unknown })?.message ?? ""));
}

const cursorSchema = z.object({ u: z.iso.datetime(), i: z.uuid() });

function encodeCursor(updatedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ u: updatedAt.toISOString(), i: id })).toString("base64url");
}

function decodeCursor(cursor: string | null): { updatedAt: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    return parsed.success ? { updatedAt: new Date(parsed.data.u), id: parsed.data.i } : null;
  } catch {
    return null;
  }
}

const versionSelect = {
  versionNo: true,
  sourceText: true,
  segments: { orderBy: { position: "asc" }, select: { position: true, text: true } },
} satisfies Prisma.TranscriptVersionSelect;

function asLanguage(code: string): LanguageCode {
  if (!isLanguageCode(code)) throw new Error("unexpected language code in storage");
  return code;
}

/**
 * Prisma implementation of the lesson port, running as kiko_app. Every query
 * filters on owner_id before anything else (DEC-006); grants restrict which
 * columns can change (lesson_library_security migration).
 */
export function createPrismaLessonRepository(client: () => PrismaClient): LessonRepository {
  /** Re-checks the actor inside the transaction and locks the profile row. */
  async function lockActor(tx: Tx, guard: ActorGuard) {
    if (!(await lockActiveActor(tx, guard))) throw new Abort("stale_authorization");
  }

  async function failureFor(tx: Tx, ownerId: string, lessonId: string, expectedVersion: number): Promise<LessonFailure> {
    const lesson = await tx.lesson.findFirst({ where: { id: lessonId, ownerId }, select: { version: true } });
    if (!lesson) return "not_found";
    return lesson.version !== expectedVersion ? "conflict" : "invalid_state";
  }

  async function run<T>(work: (tx: Tx) => Promise<T>): Promise<LessonResult<T>> {
    try {
      return { ok: true, value: await client().$transaction(work) };
    } catch (error) {
      if (error instanceof Abort) return { ok: false, reason: error.reason };
      throw error;
    }
  }

  async function insertSegments(tx: Tx, versionId: string, ownerId: string, languageCode: string, content: LessonContent) {
    if (content.segments.length === 0) return;
    // createMany issues no RETURNING; the runtime may insert but the guard
    // trigger refuses segments of published versions.
    await tx.segment.createMany({
      data: content.segments.map((segment) => ({
        transcriptVersionId: versionId,
        ownerId,
        languageCode,
        position: segment.position,
        text: segment.text,
      })),
    });
  }

  return {
    async list(ownerId, filter: LessonListFilter) {
      const cursor = decodeCursor(filter.cursor);
      const rows = await client().lesson.findMany({
        where: {
          ownerId,
          status: { in: filter.statuses },
          ...(filter.language ? { languageCode: filter.language } : {}),
          ...(filter.tag ? { tags: { has: filter.tag } } : {}),
          ...(cursor
            ? {
                OR: [
                  { updatedAt: { lt: cursor.updatedAt } },
                  { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: filter.limit + 1,
        select: { id: true, title: true, languageCode: true, status: true, tags: true, updatedAt: true, levelLabel: true },
      });
      const page = rows.slice(0, filter.limit);
      const items: LessonSummary[] = page.map((row) => ({ ...row, languageCode: asLanguage(row.languageCode) }));
      const last = page.at(-1);
      return { items, nextCursor: rows.length > filter.limit && last ? encodeCursor(last.updatedAt, last.id) : null };
    },

    async get(ownerId, lessonId): Promise<LessonDetail | null> {
      const row = await client().lesson.findFirst({
        where: { id: lessonId, ownerId },
        select: {
          id: true,
          title: true,
          languageCode: true,
          status: true,
          tags: true,
          sourceNote: true,
          levelLabel: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          archivedAt: true,
          activeTranscript: { select: versionSelect },
          transcriptVersions: { where: { state: "draft" }, select: versionSelect },
        },
      });
      if (!row) return null;
      const { activeTranscript, transcriptVersions, ...lesson } = row;
      const draft: VersionView | null = transcriptVersions[0] ?? null;
      return { ...lesson, languageCode: asLanguage(lesson.languageCode), active: activeTranscript, draft };
    },

    async create(guard, { clientRequestId, metadata, content }) {
      const ownerId = guard.userId;
      const existing = () =>
        client().lesson.findUnique({
          where: { ownerId_clientRequestId: { ownerId, clientRequestId } },
          select: { id: true },
        });
      try {
        return await run(async (tx) => {
          await lockActor(tx, guard);
          const previous = await tx.lesson.findUnique({
            where: { ownerId_clientRequestId: { ownerId, clientRequestId } },
            select: { id: true },
          });
          if (previous) return { lessonId: previous.id, created: false };

          const lesson = await tx.lesson.create({
            data: { ownerId, clientRequestId, ...metadata },
            select: { id: true },
          });
          const version = await tx.transcriptVersion.create({
            data: {
              lessonId: lesson.id,
              ownerId,
              languageCode: metadata.languageCode,
              versionNo: 1,
              sourceText: content.sourceText,
              segmentationRule: SEGMENTATION_RULE,
            },
            select: { id: true },
          });
          await insertSegments(tx, version.id, ownerId, metadata.languageCode, content);
          return { lessonId: lesson.id, created: true };
        });
      } catch (error) {
        // A concurrent retry with the same request id won the race.
        if (isUniqueViolation(error)) {
          const winner = await existing();
          if (winner) return { ok: true, value: { lessonId: winner.id, created: false } };
        }
        throw error;
      }
    },

    async update(guard, { lessonId, expectedVersion, metadata, content }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const current = await tx.lesson.findFirst({
          where: { id: lessonId, ownerId },
          select: {
            version: true,
            status: true,
            languageCode: true,
            activeTranscript: { select: { sourceText: true } },
            transcriptVersions: { where: { state: "draft" }, select: { id: true, sourceText: true } },
          },
        });
        if (!current) throw new Abort("not_found");
        if (current.version !== expectedVersion) throw new Abort("conflict");
        if (current.status === "archived") throw new Abort("invalid_state");

        if (metadata.languageCode !== current.languageCode) {
          const published = await tx.transcriptVersion.count({ where: { lessonId, state: "published" } });
          if (published > 0) throw new Abort("language_locked");
        }

        const updated = await tx.lesson.updateMany({
          where: { id: lessonId, ownerId, version: expectedVersion },
          data: { ...metadata, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Abort("conflict");

        const draft = current.transcriptVersions[0];
        if (draft) {
          if (draft.sourceText !== content.sourceText) {
            await tx.transcriptVersion.updateMany({ where: { id: draft.id, state: "draft" }, data: { sourceText: content.sourceText } });
            await tx.segment.deleteMany({ where: { transcriptVersionId: draft.id } });
            await insertSegments(tx, draft.id, ownerId, metadata.languageCode, content);
          }
        } else if (content.sourceText !== current.activeTranscript?.sourceText) {
          // Ready lesson: changes go to a new draft revision; the active version stays.
          const latest = await tx.transcriptVersion.aggregate({ where: { lessonId }, _max: { versionNo: true } });
          const version = await tx.transcriptVersion.create({
            data: {
              lessonId,
              ownerId,
              languageCode: metadata.languageCode,
              versionNo: (latest._max.versionNo ?? 0) + 1,
              sourceText: content.sourceText,
              segmentationRule: SEGMENTATION_RULE,
            },
            select: { id: true },
          });
          await insertSegments(tx, version.id, ownerId, metadata.languageCode, content);
        }
      });
    },

    async publish(guard, { lessonId, expectedVersion }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const current = await tx.lesson.findFirst({
          where: { id: lessonId, ownerId },
          select: {
            version: true,
            status: true,
            transcriptVersions: { where: { state: "draft" }, select: { id: true, _count: { select: { segments: true } } } },
          },
        });
        if (!current) throw new Abort("not_found");
        if (current.version !== expectedVersion) throw new Abort("conflict");
        const draft = current.transcriptVersions[0];
        if (current.status === "archived" || !draft) throw new Abort("invalid_state");
        if (draft._count.segments === 0) throw new Abort("empty_content");

        await tx.transcriptVersion.updateMany({
          where: { id: draft.id, state: "draft" },
          data: { state: "published", publishedAt: new Date() },
        });
        const updated = await tx.lesson.updateMany({
          where: { id: lessonId, ownerId, version: expectedVersion },
          data: { status: "ready", activeTranscriptId: draft.id, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Abort("conflict");
      });
    },

    async archive(guard, { lessonId, expectedVersion }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const updated = await tx.lesson.updateMany({
          where: { id: lessonId, ownerId, version: expectedVersion, status: { not: "archived" } },
          data: { status: "archived", archivedAt: new Date(), version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Abort(await failureFor(tx, ownerId, lessonId, expectedVersion));
      });
    },

    async unarchive(guard, { lessonId, expectedVersion }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const current = await tx.lesson.findFirst({
          where: { id: lessonId, ownerId },
          select: { version: true, status: true, activeTranscriptId: true },
        });
        if (!current) throw new Abort("not_found");
        if (current.version !== expectedVersion) throw new Abort("conflict");
        if (current.status !== "archived") throw new Abort("invalid_state");
        const updated = await tx.lesson.updateMany({
          where: { id: lessonId, ownerId, version: expectedVersion, status: "archived" },
          data: {
            status: current.activeTranscriptId ? "ready" : "draft",
            archivedAt: null,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Abort("conflict");
      });
    },

    async remove(guard, { lessonId, expectedVersion }) {
      const ownerId = guard.userId;
      try {
        return await run(async (tx) => {
          await lockActor(tx, guard);
          // Deletes versions and segments by cascade; RESTRICT foreign keys from
          // learning data (later slices) make this fail instead.
          const deleted = await tx.lesson.deleteMany({ where: { id: lessonId, ownerId, version: expectedVersion } });
          if (deleted.count !== 1) throw new Abort(await failureFor(tx, ownerId, lessonId, expectedVersion));
          await tx.auditEvent.createMany({
            data: [{ actorUserId: ownerId, action: "lesson.delete", targetType: "lesson", targetId: lessonId, result: "success" }],
          });
        });
      } catch (error) {
        if (isForeignKeyViolation(error)) return { ok: false, reason: "has_dependents" };
        throw error;
      }
    },
  };
}
