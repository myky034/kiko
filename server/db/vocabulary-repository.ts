import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isLanguageCode, type LanguageCode } from "@/modules/language/registry";
import type {
  ActorGuard,
  DeckView,
  Notation,
  RelationKind,
  VocabularyDetail,
  VocabularyFailure,
  VocabularyInput,
  VocabularyListFilter,
  VocabularyRepository,
  VocabularyResult,
  VocabularySummary,
} from "@/modules/vocabulary/types";
import { VOCABULARY_LIMITS } from "@/modules/vocabulary/input";
import { lockActiveActor } from "./actor-guard";

type Tx = Prisma.TransactionClient;

/** Aborts the surrounding transaction with a domain failure. */
class Abort extends Error {
  constructor(readonly reason: VocabularyFailure) {
    super(reason);
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return true;
  return /unique constraint|23505/i.test(String((error as { message?: unknown })?.message ?? ""));
}

function isForeignKeyViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  return /foreign key|23503/i.test(String((error as { message?: unknown })?.message ?? ""));
}

const NOTATION: Record<LanguageCode, Notation> = { zh: "pinyin", ja: "kana", en: "ipa" };

function asLanguage(code: string): LanguageCode {
  if (!isLanguageCode(code)) throw new Error("unexpected language code in storage");
  return code;
}

const summarySelect = {
  id: true,
  languageCode: true,
  surface: true,
  meaning: true,
  tags: true,
  starred: true,
  archivedAt: true,
  createdAt: true,
  readings: { orderBy: { position: "asc" }, select: { value: true } },
  _count: { select: { occurrences: true } },
} satisfies Prisma.VocabularyItemSelect;

type SummaryRow = Prisma.VocabularyItemGetPayload<{ select: typeof summarySelect }>;

function toSummary(row: SummaryRow): VocabularySummary {
  return {
    id: row.id,
    languageCode: asLanguage(row.languageCode),
    surface: row.surface,
    meaning: row.meaning,
    readings: row.readings.map((reading) => reading.value),
    tags: row.tags,
    starred: row.starred,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt,
    occurrenceCount: row._count.occurrences,
  };
}

/**
 * Prisma implementation of the vocabulary port, running as kiko_app. Every
 * query filters on owner_id first (DEC-006); composite FKs reject links across
 * owners or languages, grants keep owner/language immutable (vocabulary_security).
 */
export function createPrismaVocabularyRepository(client: () => PrismaClient): VocabularyRepository {
  async function lockActor(tx: Tx, guard: ActorGuard) {
    if (!(await lockActiveActor(tx, guard))) throw new Abort("stale_authorization");
  }

  async function run<T>(work: (tx: Tx) => Promise<T>): Promise<VocabularyResult<T>> {
    try {
      return { ok: true, value: await client().$transaction(work) };
    } catch (error) {
      if (error instanceof Abort) return { ok: false, reason: error.reason };
      if (isForeignKeyViolation(error)) return { ok: false, reason: "invalid_state" };
      throw error;
    }
  }

  /** Decks must be the owner's, in the word's language, and not archived. */
  async function checkDecks(tx: Tx, ownerId: string, language: LanguageCode, deckIds: string[]) {
    if (deckIds.length === 0) return;
    const found = await tx.deck.count({ where: { id: { in: deckIds }, ownerId, languageCode: language, archivedAt: null } });
    if (found !== deckIds.length) throw new Abort("invalid_state");
  }

  async function writeChildren(
    tx: Tx,
    vocabularyId: string,
    ownerId: string,
    language: LanguageCode,
    word: VocabularyInput,
    deckIds: string[] | null,
  ) {
    // createMany issues no RETURNING; children are replaced as a set.
    if (word.readings.length > 0) {
      await tx.pronunciation.createMany({
        data: word.readings.map((value, position) => ({
          vocabularyId,
          ownerId,
          languageCode: language,
          notation: NOTATION[language],
          value,
          position,
        })),
      });
    }
    if (word.examples.length > 0) {
      await tx.vocabularyExample.createMany({
        data: word.examples.map((example, position) => ({ vocabularyId, ownerId, languageCode: language, position, ...example })),
      });
    }
    if (deckIds && deckIds.length > 0) {
      await tx.deckItem.createMany({ data: deckIds.map((deckId) => ({ deckId, vocabularyId, ownerId, languageCode: language })) });
    }
  }

  function itemData(word: VocabularyInput, surfaceKey: string) {
    return {
      surface: word.surface,
      surfaceKey,
      meaning: word.meaning,
      notes: word.notes,
      usage: word.usage,
      tags: word.tags,
      starred: word.starred,
    };
  }

  return {
    async list(ownerId, filter: VocabularyListFilter) {
      const where: Prisma.VocabularyItemWhereInput = {
        ownerId,
        languageCode: filter.language,
        archivedAt: filter.archived ? { not: null } : null,
        ...(filter.tag ? { tags: { has: filter.tag } } : {}),
        ...(filter.deckId ? { deckItems: { some: { deckId: filter.deckId, ownerId } } } : {}),
        ...(filter.starred ? { starred: true } : {}),
        ...(filter.source === "lesson" ? { occurrences: { some: {} } } : {}),
        ...(filter.source === "manual" ? { occurrences: { none: {} } } : {}),
      };
      const orderBy: Prisma.VocabularyItemOrderByWithRelationInput[] =
        filter.sort === "alphabetical" ? [{ surfaceKey: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }];
      const [total, rows] = await Promise.all([
        client().vocabularyItem.count({ where }),
        client().vocabularyItem.findMany({
          where,
          orderBy,
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
          select: summarySelect,
        }),
      ]);
      return {
        items: rows.map(toSummary),
        total,
        page: filter.page,
        pageCount: Math.max(1, Math.ceil(total / filter.pageSize)),
      };
    },

    async countActive(ownerId, language) {
      return client().vocabularyItem.count({ where: { ownerId, languageCode: language, archivedAt: null } });
    },

    async get(ownerId, vocabularyId): Promise<VocabularyDetail | null> {
      const row = await client().vocabularyItem.findFirst({
        where: { id: vocabularyId, ownerId },
        select: {
          ...summarySelect,
          notes: true,
          usage: true,
          version: true,
          updatedAt: true,
          examples: { orderBy: { position: "asc" }, select: { text: true, reading: true, translation: true } },
          occurrences: {
            orderBy: { createdAt: "asc" },
            select: {
              lessonId: true,
              sourceText: true,
              selectedText: true,
              offsetStart: true,
              offsetEnd: true,
              createdAt: true,
              lesson: { select: { title: true } },
            },
          },
          deckItems: { where: { ownerId }, select: { deck: { select: { id: true, title: true } } } },
          relationsFrom: {
            where: { ownerId },
            select: { kind: true, to: { select: { id: true, surface: true, readings: { orderBy: { position: "asc" }, select: { value: true } } } } },
          },
          relationsTo: {
            where: { ownerId },
            select: { kind: true, from: { select: { id: true, surface: true, readings: { orderBy: { position: "asc" }, select: { value: true } } } } },
          },
        },
      });
      if (!row) return null;
      const related = [
        ...row.relationsFrom.map((relation) => ({ ...relation.to, kind: relation.kind })),
        ...row.relationsTo.map((relation) => ({ ...relation.from, kind: relation.kind })),
      ].map((word) => ({
        id: word.id,
        surface: word.surface,
        readings: word.readings.map((reading) => reading.value),
        kind: word.kind as RelationKind,
      }));
      return {
        ...toSummary(row),
        notes: row.notes,
        usage: row.usage,
        version: row.version,
        updatedAt: row.updatedAt,
        examples: row.examples,
        occurrences: row.occurrences.map((occurrence) => ({
          lessonId: occurrence.lessonId,
          lessonTitle: occurrence.lesson.title,
          sourceText: occurrence.sourceText,
          selectedText: occurrence.selectedText,
          start: occurrence.offsetStart,
          end: occurrence.offsetEnd,
          createdAt: occurrence.createdAt,
        })),
        decks: row.deckItems.map((item) => item.deck),
        related,
      };
    },

    async findSimilar(ownerId, language, surfaceKey) {
      const rows = await client().vocabularyItem.findMany({
        where: { ownerId, languageCode: language, surfaceKey, archivedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: summarySelect,
      });
      return rows.map(toSummary);
    },

    async listLessonOccurrences(ownerId, lessonId) {
      const rows = await client().vocabularyOccurrence.findMany({
        where: { ownerId, lessonId, transcriptVersion: { activeInLesson: { some: { id: lessonId, ownerId } } } },
        select: { vocabularyId: true, offsetStart: true, offsetEnd: true, segment: { select: { position: true } } },
      });
      return rows.map((row) => ({ vocabularyId: row.vocabularyId, position: row.segment.position, start: row.offsetStart, end: row.offsetEnd }));
    },

    async create(guard, { clientRequestId, language, surfaceKey, word, deckIds }) {
      const ownerId = guard.userId;
      const existing = () =>
        client().vocabularyItem.findUnique({ where: { ownerId_clientRequestId: { ownerId, clientRequestId } }, select: { id: true } });
      try {
        return await run(async (tx) => {
          await lockActor(tx, guard);
          const previous = await tx.vocabularyItem.findUnique({
            where: { ownerId_clientRequestId: { ownerId, clientRequestId } },
            select: { id: true },
          });
          if (previous) return { vocabularyId: previous.id, created: false };
          await checkDecks(tx, ownerId, language, deckIds);
          const item = await tx.vocabularyItem.create({
            data: { ownerId, languageCode: language, clientRequestId, ...itemData(word, surfaceKey) },
            select: { id: true },
          });
          await writeChildren(tx, item.id, ownerId, language, word, deckIds);
          return { vocabularyId: item.id, created: true };
        });
      } catch (error) {
        // A concurrent retry with the same request id won the race.
        if (isUniqueViolation(error)) {
          const winner = await existing();
          if (winner) return { ok: true, value: { vocabularyId: winner.id, created: false } };
        }
        throw error;
      }
    },

    async update(guard, { vocabularyId, expectedVersion, surfaceKey, word, deckIds }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const current = await tx.vocabularyItem.findFirst({
          where: { id: vocabularyId, ownerId },
          select: { version: true, archivedAt: true, languageCode: true },
        });
        if (!current) throw new Abort("not_found");
        if (current.version !== expectedVersion) throw new Abort("conflict");
        if (current.archivedAt) throw new Abort("invalid_state");
        const language = asLanguage(current.languageCode);
        await checkDecks(tx, ownerId, language, deckIds);
        const updated = await tx.vocabularyItem.updateMany({
          where: { id: vocabularyId, ownerId, version: expectedVersion },
          data: { ...itemData(word, surfaceKey), version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Abort("conflict");
        await tx.pronunciation.deleteMany({ where: { vocabularyId, ownerId } });
        await tx.vocabularyExample.deleteMany({ where: { vocabularyId, ownerId } });
        await tx.deckItem.deleteMany({ where: { vocabularyId, ownerId } });
        await writeChildren(tx, vocabularyId, ownerId, language, word, deckIds);
      });
    },

    async setArchived(guard, { vocabularyId, expectedVersion, archived }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const updated = await tx.vocabularyItem.updateMany({
          where: { id: vocabularyId, ownerId, version: expectedVersion, archivedAt: archived ? null : { not: null } },
          data: { archivedAt: archived ? new Date() : null, version: { increment: 1 } },
        });
        if (updated.count === 1) return;
        const current = await tx.vocabularyItem.findFirst({ where: { id: vocabularyId, ownerId }, select: { version: true } });
        throw new Abort(!current ? "not_found" : current.version !== expectedVersion ? "conflict" : "invalid_state");
      });
    },

    async setStarred(guard, { vocabularyId, starred }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const updated = await tx.vocabularyItem.updateMany({
          where: { id: vocabularyId, ownerId },
          data: { starred, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Abort("not_found");
      });
    },

    async remove(guard, { vocabularyId, expectedVersion }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        // Cascades readings, examples, occurrences, deck memberships and relations.
        // Review cards (KIKO-016) must reference words with RESTRICT, so history is never removed silently.
        const removed = await tx.vocabularyItem.deleteMany({ where: { id: vocabularyId, ownerId, version: expectedVersion } });
        if (removed.count === 1) return;
        const current = await tx.vocabularyItem.findFirst({ where: { id: vocabularyId, ownerId }, select: { id: true } });
        throw new Abort(current ? "conflict" : "not_found");
      });
    },

    async saveFromSegment(guard, { selection, target, surfaceKey }) {
      const ownerId = guard.userId;
      const attempt = () =>
        run(async (tx) => {
          await lockActor(tx, guard);
          const lesson = await tx.lesson.findFirst({
            where: { id: selection.lessonId, ownerId },
            select: { languageCode: true, activeTranscript: { select: { id: true, versionNo: true } } },
          });
          if (!lesson) throw new Abort("not_found");
          if (!lesson.activeTranscript) throw new Abort("invalid_state");
          if (lesson.activeTranscript.versionNo !== selection.versionNo) throw new Abort("version_changed");
          const language = asLanguage(lesson.languageCode);
          const segment = await tx.segment.findFirst({
            where: { transcriptVersionId: lesson.activeTranscript.id, ownerId, position: selection.position },
            select: { id: true, text: true },
          });
          if (!segment || segment.text !== selection.sourceText) throw new Abort("version_changed");

          let vocabularyId: string;
          if (target.kind === "existing") {
            const word = await tx.vocabularyItem.findFirst({
              where: { id: target.vocabularyId, ownerId },
              select: { id: true, languageCode: true, archivedAt: true },
            });
            if (!word) throw new Abort("not_found");
            if (word.languageCode !== language || word.archivedAt) throw new Abort("invalid_state");
            vocabularyId = word.id;
          } else {
            const previous = await tx.vocabularyItem.findUnique({
              where: { ownerId_clientRequestId: { ownerId, clientRequestId: target.clientRequestId } },
              select: { id: true },
            });
            if (previous) {
              vocabularyId = previous.id;
            } else {
              const item = await tx.vocabularyItem.create({
                data: {
                  ownerId,
                  languageCode: language,
                  clientRequestId: target.clientRequestId,
                  ...itemData(target.input, surfaceKey ?? target.input.surface),
                },
                select: { id: true },
              });
              await writeChildren(tx, item.id, ownerId, language, target.input, null);
              vocabularyId = item.id;
            }
          }

          // ON CONFLICT DO NOTHING: saving the same selection twice is a no-op.
          await tx.vocabularyOccurrence.createMany({
            data: [
              {
                ownerId,
                vocabularyId,
                languageCode: language,
                lessonId: selection.lessonId,
                transcriptVersionId: lesson.activeTranscript.id,
                segmentId: segment.id,
                sourceText: segment.text,
                selectedText: selection.selectedText,
                offsetStart: selection.start,
                offsetEnd: selection.end,
              },
            ],
            skipDuplicates: true,
          });
          return { vocabularyId };
        });
      try {
        return await attempt();
      } catch (error) {
        // A concurrent retry with the same client request id created the word first.
        if (isUniqueViolation(error)) return attempt();
        throw error;
      }
    },

    async removeOccurrence(guard, { vocabularyId, lessonId, position, start, end }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const removed = await tx.vocabularyOccurrence.deleteMany({
          where: { ownerId, vocabularyId, lessonId, offsetStart: start, offsetEnd: end, segment: { position } },
        });
        if (removed.count === 0) throw new Abort("not_found");
      });
    },

    async listDecks(ownerId, language): Promise<DeckView[]> {
      const rows = await client().deck.findMany({
        where: { ownerId, languageCode: language },
        orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { title: "asc" }, { id: "asc" }],
        select: { id: true, title: true, archivedAt: true, version: true, _count: { select: { items: true } } },
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        archived: row.archivedAt !== null,
        itemCount: row._count.items,
        version: row.version,
      }));
    },

    async createDeck(guard, { language, title }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const deck = await tx.deck.create({ data: { ownerId, languageCode: language, title }, select: { id: true } });
        return { deckId: deck.id };
      });
    },

    async renameDeck(guard, { deckId, expectedVersion, title }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const updated = await tx.deck.updateMany({
          where: { id: deckId, ownerId, version: expectedVersion },
          data: { title, version: { increment: 1 } },
        });
        if (updated.count === 1) return;
        const current = await tx.deck.findFirst({ where: { id: deckId, ownerId }, select: { id: true } });
        throw new Abort(current ? "conflict" : "not_found");
      });
    },

    async setDeckArchived(guard, { deckId, expectedVersion, archived }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const updated = await tx.deck.updateMany({
          where: { id: deckId, ownerId, version: expectedVersion, archivedAt: archived ? null : { not: null } },
          data: { archivedAt: archived ? new Date() : null, version: { increment: 1 } },
        });
        if (updated.count === 1) return;
        const current = await tx.deck.findFirst({ where: { id: deckId, ownerId }, select: { version: true } });
        throw new Abort(!current ? "not_found" : current.version !== expectedVersion ? "conflict" : "invalid_state");
      });
    },

    async removeDeck(guard, { deckId, expectedVersion }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        // Cascades memberships only; words are never deleted with a deck.
        const removed = await tx.deck.deleteMany({ where: { id: deckId, ownerId, version: expectedVersion } });
        if (removed.count === 1) return;
        const current = await tx.deck.findFirst({ where: { id: deckId, ownerId }, select: { id: true } });
        throw new Abort(current ? "conflict" : "not_found");
      });
    },

    async addRelation(guard, { fromId, toId, kind }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        const words = await tx.vocabularyItem.findMany({
          where: { id: { in: [fromId, toId] }, ownerId },
          select: { id: true, languageCode: true },
        });
        if (words.length !== 2) throw new Abort("not_found");
        if (words[0].languageCode !== words[1].languageCode) throw new Abort("invalid_state");
        const count = await tx.vocabularyRelation.count({
          where: { ownerId, OR: [{ fromVocabularyId: fromId }, { toVocabularyId: fromId }] },
        });
        if (count >= VOCABULARY_LIMITS.relations) throw new Abort("invalid_state");
        // ON CONFLICT DO NOTHING also covers the reverse pair (unordered unique index).
        await tx.vocabularyRelation.createMany({
          data: [{ ownerId, fromVocabularyId: fromId, toVocabularyId: toId, languageCode: words[0].languageCode, kind }],
          skipDuplicates: true,
        });
      });
    },

    async removeRelation(guard, { fromId, toId }) {
      const ownerId = guard.userId;
      return run(async (tx) => {
        await lockActor(tx, guard);
        await tx.vocabularyRelation.deleteMany({
          where: {
            ownerId,
            OR: [
              { fromVocabularyId: fromId, toVocabularyId: toId },
              { fromVocabularyId: toId, toVocabularyId: fromId },
            ],
          },
        });
      });
    },
  };
}
