import type { LessonRepository } from "@/modules/content/types";
import type { Actor } from "@/modules/identity/types";
import { en } from "@/modules/i18n/en";
import { isLanguageCode, type LanguageCode } from "@/modules/language/registry";
import { hasPermission, type Permission } from "@/server/policy/permissions";
import {
  field,
  hasOnlyAllowed,
  parseDeckTitle,
  parsePositiveInt,
  parseRelationKind,
  parseUuid,
  parseWordForm,
  type VocabularyFormErrors,
} from "./input";
import { locatePhrase, normaliseSelection, type SelectionError } from "./selection";
import { surfaceKey } from "./surface-key";
import type {
  ActorGuard,
  DeckView,
  SaveTarget,
  VocabularyDetail,
  VocabularyFailure,
  VocabularyListFilter,
  VocabularyPage,
  VocabularyRepository,
  VocabularySort,
  VocabularySource,
  VocabularySummary,
} from "./types";

export type Outcome<T = void> =
  | { status: "ok"; value: T }
  | { status: "forbidden" }
  | { status: "invalid"; errors: VocabularyFormErrors }
  | { status: "failed"; reason: VocabularyFailure };

const copy = en.vocabulary;

function guardOf(actor: Actor): ActorGuard {
  return { userId: actor.userId, authorizationRevision: actor.authorizationRevision };
}

function allowed(actor: Actor, permission: Permission): boolean {
  return hasPermission(actor, permission);
}

function fromResult<T>(result: { ok: true; value: T } | { ok: false; reason: VocabularyFailure }): Outcome<T> {
  return result.ok ? { status: "ok", value: result.value } : { status: "failed", reason: result.reason };
}

export const PAGE_SIZES = [8, 12, 24, 48] as const;
const MAX_PAGE = 1_000;

export type VocabularyQuery = {
  archived?: string;
  tag?: string;
  deck?: string;
  starred?: string;
  source?: string;
  sort?: string;
  page?: string;
  size?: string;
};

/** Unknown or out-of-range query values fall back to defaults instead of erroring. */
export function toVocabularyFilter(language: LanguageCode, query: VocabularyQuery): VocabularyListFilter {
  const tag = (query.tag ?? "").trim();
  const page = Number(query.page);
  const size = Number(query.size);
  return {
    language,
    archived: query.archived === "1",
    tag: tag.length > 0 && tag.length <= 64 ? tag : null,
    deckId: parseUuid(query.deck),
    starred: query.starred === "1",
    source: query.source === "lesson" || query.source === "manual" ? (query.source satisfies VocabularySource) : "all",
    sort: query.sort === "alphabetical" ? ("alphabetical" satisfies VocabularySort) : "recent",
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : 12,
  };
}

export async function listVocabulary(
  actor: Actor,
  repository: VocabularyRepository,
  language: LanguageCode,
  query: VocabularyQuery,
): Promise<Outcome<VocabularyPage & { activeTotal: number; filter: VocabularyListFilter }>> {
  if (!allowed(actor, "vocabulary.read_private")) return { status: "forbidden" };
  const filter = toVocabularyFilter(language, query);
  const [page, activeTotal] = await Promise.all([
    repository.list(actor.userId, filter),
    repository.countActive(actor.userId, language),
  ]);
  return { status: "ok", value: { ...page, activeTotal, filter } };
}

export async function getVocabulary(
  actor: Actor,
  repository: VocabularyRepository,
  vocabularyId: unknown,
): Promise<Outcome<VocabularyDetail>> {
  if (!allowed(actor, "vocabulary.read_private")) return { status: "forbidden" };
  const id = parseUuid(vocabularyId);
  const word = id ? await repository.get(actor.userId, id) : null;
  return word ? { status: "ok", value: word } : { status: "failed", reason: "not_found" };
}

/** Duplicate warning: active words in the same language with the same key. Never merges. */
export async function findSimilarWords(
  actor: Actor,
  repository: VocabularyRepository,
  language: LanguageCode,
  surface: string,
): Promise<VocabularySummary[]> {
  if (!allowed(actor, "vocabulary.read_private")) return [];
  const key = surfaceKey(surface, language);
  return key ? repository.findSimilar(actor.userId, language, key) : [];
}

export async function createVocabulary(
  actor: Actor,
  repository: VocabularyRepository,
  language: unknown,
  formData: FormData,
): Promise<Outcome<{ vocabularyId: string }>> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  if (!isLanguageCode(language)) return { status: "invalid", errors: { form: en.form.invalid } };
  const parsed = parseWordForm(formData, ["clientRequestId"]);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const clientRequestId = parseUuid(field(formData, "clientRequestId"));
  if (!clientRequestId) return { status: "invalid", errors: { form: en.form.expired } };
  const result = await repository.create(guardOf(actor), {
    clientRequestId,
    language,
    surfaceKey: surfaceKey(parsed.value.word.surface, language),
    ...parsed.value,
  });
  return result.ok ? { status: "ok", value: { vocabularyId: result.value.vocabularyId } } : fromResult(result);
}

export async function updateVocabulary(
  actor: Actor,
  repository: VocabularyRepository,
  vocabularyId: unknown,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  const id = parseUuid(vocabularyId);
  if (!id) return { status: "failed", reason: "not_found" };
  const current = await repository.get(actor.userId, id);
  if (!current) return { status: "failed", reason: "not_found" };
  const parsed = parseWordForm(formData, ["expectedVersion"]);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const expectedVersion = parsePositiveInt(field(formData, "expectedVersion"));
  if (!expectedVersion) return { status: "invalid", errors: { form: en.form.invalid } };
  return fromResult(
    await repository.update(guardOf(actor), {
      vocabularyId: id,
      expectedVersion,
      surfaceKey: surfaceKey(parsed.value.word.surface, current.languageCode),
      ...parsed.value,
    }),
  );
}

export async function setVocabularyArchived(
  actor: Actor,
  repository: VocabularyRepository,
  vocabularyId: unknown,
  archived: boolean,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  const id = parseUuid(vocabularyId);
  const expectedVersion = parsePositiveInt(field(formData, "expectedVersion"));
  if (!id) return { status: "failed", reason: "not_found" };
  if (!hasOnlyAllowed(formData, ["expectedVersion"]) || !expectedVersion) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }
  return fromResult(await repository.setArchived(guardOf(actor), { vocabularyId: id, expectedVersion, archived }));
}

export async function setVocabularyStarred(
  actor: Actor,
  repository: VocabularyRepository,
  vocabularyId: unknown,
  starred: boolean,
): Promise<Outcome> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  const id = parseUuid(vocabularyId);
  if (!id) return { status: "failed", reason: "not_found" };
  return fromResult(await repository.setStarred(guardOf(actor), { vocabularyId: id, starred }));
}

export async function deleteVocabulary(
  actor: Actor,
  repository: VocabularyRepository,
  vocabularyId: unknown,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "vocabulary.delete_private")) return { status: "forbidden" };
  const id = parseUuid(vocabularyId);
  const expectedVersion = parsePositiveInt(field(formData, "expectedVersion"));
  if (!id) return { status: "failed", reason: "not_found" };
  if (!hasOnlyAllowed(formData, ["expectedVersion"]) || !expectedVersion) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }
  return fromResult(await repository.remove(guardOf(actor), { vocabularyId: id, expectedVersion }));
}

const SELECTION_MESSAGES: Record<SelectionError, string> = {
  empty: copy.errors.selectionEmpty,
  out_of_range: copy.errors.selectionOutOfRange,
  splits_grapheme: copy.errors.selectionSplitsCharacter,
  not_found: copy.errors.phraseNotFound,
};

const SAVE_FIELDS = ["lessonId", "versionNo", "position", "start", "end", "phrase", "occurrence", "mode", "vocabularyId"];

/**
 * Saves a word (new, or another sentence for an existing word) from a segment
 * of a lesson's active, published version. The client sends only the lesson,
 * version number, segment position and code-point offsets (or a phrase to
 * locate); the selected text is derived here from the stored segment.
 */
export async function saveWordFromLesson(
  actor: Actor,
  repositories: { vocabulary: VocabularyRepository; lessons: LessonRepository },
  formData: FormData,
): Promise<Outcome<{ vocabularyId: string }>> {
  if (!allowed(actor, "vocabulary.write_private") || !allowed(actor, "lesson.read_private")) return { status: "forbidden" };
  const lessonId = parseUuid(field(formData, "lessonId"));
  const versionNo = parsePositiveInt(field(formData, "versionNo"));
  const position = parsePositiveInt(field(formData, "position"), 1_999);
  const mode = field(formData, "mode");
  if (!lessonId || !versionNo || position === null || (mode !== "new" && mode !== "existing")) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }

  const lesson = await repositories.lessons.get(actor.userId, lessonId);
  if (!lesson) return { status: "failed", reason: "not_found" };
  if (!lesson.active) return { status: "invalid", errors: { selection: copy.errors.lessonNotReady } };
  if (lesson.active.versionNo !== versionNo) return { status: "failed", reason: "version_changed" };
  const segment = lesson.active.segments.find((item) => item.position === position);
  if (!segment) return { status: "invalid", errors: { selection: copy.errors.selectionOutOfRange } };

  const phrase = field(formData, "phrase");
  const start = parsePositiveInt(field(formData, "start"));
  const end = parsePositiveInt(field(formData, "end"));
  const occurrenceIndex = parsePositiveInt(field(formData, "occurrence"), 999) ?? 0;
  const located =
    start !== null && end !== null
      ? normaliseSelection(segment.text, start, end)
      : phrase !== null
        ? locatePhrase(segment.text, phrase, occurrenceIndex)
        : ({ ok: false, error: "empty" } as const);
  if (!located.ok) return { status: "invalid", errors: { selection: SELECTION_MESSAGES[located.error] } };

  const selection = {
    lessonId,
    versionNo,
    position,
    start: located.value.start,
    end: located.value.end,
    sourceText: segment.text,
    selectedText: located.value.text,
  };

  let target: SaveTarget;
  let key: string | null = null;
  if (mode === "existing") {
    const vocabularyId = parseUuid(field(formData, "vocabularyId"));
    const extra = [...new Set(formData.keys())].filter((name) => !SAVE_FIELDS.includes(name) && !name.startsWith("$ACTION"));
    if (!vocabularyId || extra.length > 0) return { status: "invalid", errors: { form: en.form.invalid } };
    target = { kind: "existing", vocabularyId };
  } else {
    const parsed = parseWordForm(formData, [...SAVE_FIELDS, "clientRequestId"], selection.selectedText);
    if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
    const clientRequestId = parseUuid(field(formData, "clientRequestId"));
    if (!clientRequestId) return { status: "invalid", errors: { form: en.form.expired } };
    target = { kind: "new", clientRequestId, input: parsed.value.word };
    key = surfaceKey(parsed.value.word.surface, lesson.languageCode);
  }

  return fromResult(await repositories.vocabulary.saveFromSegment(guardOf(actor), { selection, target, surfaceKey: key }));
}

export async function listDecks(actor: Actor, repository: VocabularyRepository, language: LanguageCode): Promise<DeckView[]> {
  if (!allowed(actor, "vocabulary.read_private")) return [];
  return repository.listDecks(actor.userId, language);
}

export async function createDeck(
  actor: Actor,
  repository: VocabularyRepository,
  language: LanguageCode,
  formData: FormData,
): Promise<Outcome<{ deckId: string }>> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  if (!hasOnlyAllowed(formData, ["title"])) return { status: "invalid", errors: { form: en.form.invalidFields } };
  const title = parseDeckTitle(formData);
  if (!title.ok) return { status: "invalid", errors: { decks: title.error } };
  return fromResult(await repository.createDeck(guardOf(actor), { language, title: title.value }));
}

export async function renameDeck(
  actor: Actor,
  repository: VocabularyRepository,
  deckId: unknown,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  const id = parseUuid(deckId);
  const expectedVersion = parsePositiveInt(field(formData, "expectedVersion"));
  if (!id) return { status: "failed", reason: "not_found" };
  if (!hasOnlyAllowed(formData, ["title", "expectedVersion"]) || !expectedVersion) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }
  const title = parseDeckTitle(formData);
  if (!title.ok) return { status: "invalid", errors: { decks: title.error } };
  return fromResult(await repository.renameDeck(guardOf(actor), { deckId: id, expectedVersion, title: title.value }));
}

export async function changeDeck(
  actor: Actor,
  repository: VocabularyRepository,
  deckId: unknown,
  change: "archive" | "unarchive" | "delete",
  formData: FormData,
): Promise<Outcome> {
  const permission = change === "delete" ? "vocabulary.delete_private" : "vocabulary.write_private";
  if (!allowed(actor, permission)) return { status: "forbidden" };
  const id = parseUuid(deckId);
  const expectedVersion = parsePositiveInt(field(formData, "expectedVersion"));
  if (!id) return { status: "failed", reason: "not_found" };
  if (!hasOnlyAllowed(formData, ["expectedVersion"]) || !expectedVersion) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }
  if (change === "delete") return fromResult(await repository.removeDeck(guardOf(actor), { deckId: id, expectedVersion }));
  return fromResult(
    await repository.setDeckArchived(guardOf(actor), { deckId: id, expectedVersion, archived: change === "archive" }),
  );
}

export async function relateWords(
  actor: Actor,
  repository: VocabularyRepository,
  vocabularyId: unknown,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  const fromId = parseUuid(vocabularyId);
  const toId = parseUuid(field(formData, "relatedId"));
  const kind = parseRelationKind(field(formData, "kind"));
  if (!fromId) return { status: "failed", reason: "not_found" };
  if (!hasOnlyAllowed(formData, ["relatedId", "kind"]) || !toId || !kind) {
    return { status: "invalid", errors: { form: en.form.invalid } };
  }
  if (fromId === toId) return { status: "invalid", errors: { form: copy.errors.relationSelf } };
  return fromResult(await repository.addRelation(guardOf(actor), { fromId, toId, kind }));
}

export async function unrelateWords(
  actor: Actor,
  repository: VocabularyRepository,
  vocabularyId: unknown,
  formData: FormData,
): Promise<Outcome> {
  if (!allowed(actor, "vocabulary.write_private")) return { status: "forbidden" };
  const fromId = parseUuid(vocabularyId);
  const toId = parseUuid(field(formData, "relatedId"));
  if (!fromId) return { status: "failed", reason: "not_found" };
  if (!hasOnlyAllowed(formData, ["relatedId"]) || !toId) return { status: "invalid", errors: { form: en.form.invalid } };
  return fromResult(await repository.removeRelation(guardOf(actor), { fromId, toId }));
}
