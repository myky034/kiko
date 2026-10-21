import type { LanguageCode } from "@/modules/language/registry";
import type { SegmentDraft } from "./segmentation";

export type LessonStatus = "draft" | "ready" | "archived";

export type LessonSummary = {
  id: string;
  title: string;
  languageCode: LanguageCode;
  status: LessonStatus;
  tags: string[];
  updatedAt: Date;
  /** Optional self-assigned level label (DEC-023), shown as "Japanese • N5". */
  levelLabel?: string | null;
};

export type SegmentView = { position: number; text: string };

export type VersionView = {
  versionNo: number;
  sourceText: string;
  segments: SegmentView[];
};

export type LessonDetail = LessonSummary & {
  sourceNote: string | null;
  levelLabel: string | null;
  version: number;
  createdAt: Date;
  archivedAt: Date | null;
  /** Published version learners read; null until the first publish. */
  active: VersionView | null;
  /** Unpublished revision being edited, if any. */
  draft: VersionView | null;
};

export type LessonMetadata = {
  title: string;
  languageCode: LanguageCode;
  tags: string[];
  levelLabel: string | null;
  sourceNote: string | null;
};

export type LessonContent = {
  sourceText: string;
  segments: SegmentDraft[];
};

export type LessonListFilter = {
  language: LanguageCode | null;
  /** Default view hides archived lessons. */
  statuses: LessonStatus[];
  tag: string | null;
  cursor: string | null;
  limit: number;
};

/** Identity of the actor at write time; writes fail if it is no longer current. */
export type ActorGuard = { userId: string; authorizationRevision: number };

export type LessonFailure =
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "language_locked"
  | "empty_content"
  | "has_dependents"
  | "stale_authorization";

export type LessonResult<T = void> = { ok: true; value: T } | { ok: false; reason: LessonFailure };

/**
 * Lesson persistence port. Every method is scoped to `ownerId` / `guard.userId`
 * taken from the resolved actor, never from client input. Mutations take the
 * lesson version the user edited (optimistic concurrency).
 */
export interface LessonRepository {
  list(ownerId: string, filter: LessonListFilter): Promise<{ items: LessonSummary[]; nextCursor: string | null }>;
  get(ownerId: string, lessonId: string): Promise<LessonDetail | null>;
  create(
    guard: ActorGuard,
    input: { clientRequestId: string; metadata: LessonMetadata; content: LessonContent },
  ): Promise<LessonResult<{ lessonId: string; created: boolean }>>;
  update(
    guard: ActorGuard,
    input: { lessonId: string; expectedVersion: number; metadata: LessonMetadata; content: LessonContent },
  ): Promise<LessonResult>;
  publish(guard: ActorGuard, input: { lessonId: string; expectedVersion: number }): Promise<LessonResult>;
  archive(guard: ActorGuard, input: { lessonId: string; expectedVersion: number }): Promise<LessonResult>;
  unarchive(guard: ActorGuard, input: { lessonId: string; expectedVersion: number }): Promise<LessonResult>;
  remove(guard: ActorGuard, input: { lessonId: string; expectedVersion: number }): Promise<LessonResult>;
}
