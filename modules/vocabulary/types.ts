import type { ActorGuard } from "@/modules/content/types";
import type { LanguageCode } from "@/modules/language/registry";

export type { ActorGuard };

export type Notation = "pinyin" | "kana" | "ipa";

export type ExampleInput = { text: string; reading: string | null; translation: string | null };

/** Learner-editable fields of a word (readings use the language's notation). */
export type VocabularyInput = {
  surface: string;
  meaning: string;
  notes: string | null;
  usage: string | null;
  tags: string[];
  starred: boolean;
  readings: string[];
  examples: ExampleInput[];
};

export type OccurrenceView = {
  lessonId: string;
  lessonTitle: string;
  sourceText: string;
  selectedText: string;
  start: number;
  end: number;
  createdAt: Date;
};

export type DeckRef = { id: string; title: string };

export type RelationKind = "related" | "synonym" | "antonym";

export type RelatedWord = { id: string; surface: string; readings: string[]; kind: RelationKind };

export type VocabularySummary = {
  id: string;
  languageCode: LanguageCode;
  surface: string;
  meaning: string;
  readings: string[];
  tags: string[];
  starred: boolean;
  archived: boolean;
  createdAt: Date;
  occurrenceCount: number;
};

export type VocabularyDetail = VocabularySummary & {
  notes: string | null;
  usage: string | null;
  examples: ExampleInput[];
  version: number;
  updatedAt: Date;
  occurrences: OccurrenceView[];
  decks: DeckRef[];
  related: RelatedWord[];
};

export type VocabularySort = "recent" | "alphabetical";
export type VocabularySource = "all" | "lesson" | "manual";

export type VocabularyListFilter = {
  language: LanguageCode;
  archived: boolean;
  tag: string | null;
  deckId: string | null;
  starred: boolean;
  source: VocabularySource;
  sort: VocabularySort;
  page: number;
  pageSize: number;
};

export type VocabularyPage = {
  items: VocabularySummary[];
  /** Matching items across all pages. */
  total: number;
  page: number;
  pageCount: number;
};

export type DeckView = { id: string; title: string; archived: boolean; itemCount: number; version: number };

export type VocabularyFailure =
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "version_changed"
  | "stale_authorization";

export type VocabularyResult<T = void> = { ok: true; value: T } | { ok: false; reason: VocabularyFailure };

/** Where a word saved from a lesson goes: a new word, or another sentence for an existing one. */
export type SaveTarget =
  | { kind: "new"; clientRequestId: string; input: VocabularyInput }
  | { kind: "existing"; vocabularyId: string };

export type SegmentSelection = {
  lessonId: string;
  /** Active version number the learner was reading; a newer publish is a conflict. */
  versionNo: number;
  position: number;
  start: number;
  end: number;
  /** Exact segment text and selected substring, derived on the server. */
  sourceText: string;
  selectedText: string;
};

/**
 * Vocabulary persistence port. Every method is scoped to `ownerId` /
 * `guard.userId` from the resolved actor, never from client input.
 */
export interface VocabularyRepository {
  list(ownerId: string, filter: VocabularyListFilter): Promise<VocabularyPage>;
  /** Active (non-archived) words in a language, for the Total stat. */
  countActive(ownerId: string, language: LanguageCode): Promise<number>;
  get(ownerId: string, vocabularyId: string): Promise<VocabularyDetail | null>;
  /** Active words in the language whose duplicate key matches (warning only). */
  findSimilar(ownerId: string, language: LanguageCode, surfaceKey: string): Promise<VocabularySummary[]>;
  /** Saved selections in a lesson's active version, for highlighting. */
  listLessonOccurrences(
    ownerId: string,
    lessonId: string,
  ): Promise<{ position: number; start: number; end: number; vocabularyId: string }[]>;
  create(
    guard: ActorGuard,
    input: { clientRequestId: string; language: LanguageCode; surfaceKey: string; word: VocabularyInput; deckIds: string[] },
  ): Promise<VocabularyResult<{ vocabularyId: string; created: boolean }>>;
  update(
    guard: ActorGuard,
    input: { vocabularyId: string; expectedVersion: number; surfaceKey: string; word: VocabularyInput; deckIds: string[] },
  ): Promise<VocabularyResult>;
  setArchived(guard: ActorGuard, input: { vocabularyId: string; expectedVersion: number; archived: boolean }): Promise<VocabularyResult>;
  setStarred(guard: ActorGuard, input: { vocabularyId: string; starred: boolean }): Promise<VocabularyResult>;
  remove(guard: ActorGuard, input: { vocabularyId: string; expectedVersion: number }): Promise<VocabularyResult>;
  saveFromSegment(
    guard: ActorGuard,
    input: { selection: SegmentSelection; target: SaveTarget; surfaceKey: string | null },
  ): Promise<VocabularyResult<{ vocabularyId: string }>>;
  removeOccurrence(guard: ActorGuard, input: { vocabularyId: string; lessonId: string; position: number; start: number; end: number }): Promise<VocabularyResult>;
  listDecks(ownerId: string, language: LanguageCode): Promise<DeckView[]>;
  createDeck(guard: ActorGuard, input: { language: LanguageCode; title: string }): Promise<VocabularyResult<{ deckId: string }>>;
  renameDeck(guard: ActorGuard, input: { deckId: string; expectedVersion: number; title: string }): Promise<VocabularyResult>;
  setDeckArchived(guard: ActorGuard, input: { deckId: string; expectedVersion: number; archived: boolean }): Promise<VocabularyResult>;
  removeDeck(guard: ActorGuard, input: { deckId: string; expectedVersion: number }): Promise<VocabularyResult>;
  addRelation(guard: ActorGuard, input: { fromId: string; toId: string; kind: RelationKind }): Promise<VocabularyResult>;
  removeRelation(guard: ActorGuard, input: { fromId: string; toId: string }): Promise<VocabularyResult>;
}
