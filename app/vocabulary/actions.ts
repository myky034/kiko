"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { en } from "@/modules/i18n/en";
import { isLanguageCode } from "@/modules/language/registry";
import type { VocabularyFormErrors } from "@/modules/vocabulary/input";
import {
  changeDeck,
  createDeck,
  createVocabulary,
  deleteVocabulary,
  findSimilarWords,
  relateWords,
  renameDeck,
  saveWordFromLesson,
  setVocabularyArchived,
  setVocabularyStarred,
  unrelateWords,
  updateVocabulary,
  type Outcome,
} from "@/modules/vocabulary/vocabulary";
import { getLearningContext } from "@/server/learning-language";
import { actionActor, getLessonRepository } from "@/server/lessons";
import { getVocabularyRepository } from "@/server/vocabulary";

export type WordFormState = {
  errors: VocabularyFormErrors;
  /** Echo of submitted values so nothing the user typed is lost on error. */
  values?: Record<string, string | string[]>;
  /** Set after a successful save from a lesson (the panel stays open). */
  saved?: { vocabularyId: string; surface: string };
};

const ECHO_FIELDS = ["surface", "meaning", "reading", "notes", "usage", "tags", "starred", "exampleText", "exampleReading", "exampleTranslation", "deckId"];

function echo(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const name of ECHO_FIELDS) {
    const all = formData.getAll(name).filter((value): value is string => typeof value === "string");
    if (all.length === 1) values[name] = all[0];
    else if (all.length > 1) values[name] = all;
  }
  return values;
}

function toState(outcome: Outcome<unknown>, formData: FormData): WordFormState {
  if (outcome.status === "invalid") return { errors: outcome.errors, values: echo(formData) };
  if (outcome.status === "failed") return { errors: { form: en.vocabulary.failures[outcome.reason] }, values: echo(formData) };
  return { errors: {}, values: echo(formData) };
}

async function currentLanguage() {
  const actor = await actionActor();
  const { current } = await getLearningContext(actor);
  return { actor, language: current };
}

/** Save from a lesson segment: a new word or another sentence for an existing word. */
export async function saveWordAction(_previous: WordFormState, formData: FormData): Promise<WordFormState> {
  const actor = await actionActor();
  const outcome = await saveWordFromLesson(actor, { vocabulary: getVocabularyRepository(), lessons: getLessonRepository() }, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status !== "ok") return toState(outcome, formData);
  const lessonId = formData.get("lessonId");
  if (typeof lessonId === "string") revalidatePath(`/lessons/${lessonId}`);
  const surface = formData.get("surface");
  return { errors: {}, saved: { vocabularyId: outcome.value.vocabularyId, surface: typeof surface === "string" ? surface : "" } };
}

/** Duplicate warning while typing; returns only the fields the panel shows. */
export async function similarWordsAction(language: string, surface: string) {
  const actor = await actionActor();
  if (!isLanguageCode(language) || typeof surface !== "string" || surface.length > 200) return [];
  const words = await findSimilarWords(actor, getVocabularyRepository(), language, surface);
  return words.map((word) => ({ id: word.id, surface: word.surface, meaning: word.meaning, readings: word.readings }));
}

export async function createWordAction(_previous: WordFormState, formData: FormData): Promise<WordFormState> {
  const { actor, language } = await currentLanguage();
  if (!language) redirect("/");
  const outcome = await createVocabulary(actor, getVocabularyRepository(), language, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") redirect(`/vocabulary?word=${outcome.value.vocabularyId}`);
  return toState(outcome, formData);
}

export async function updateWordAction(vocabularyId: string, _previous: WordFormState, formData: FormData): Promise<WordFormState> {
  const actor = await actionActor();
  const outcome = await updateVocabulary(actor, getVocabularyRepository(), vocabularyId, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") redirect(`/vocabulary?word=${vocabularyId}`);
  return toState(outcome, formData);
}

export async function deleteWordAction(vocabularyId: string, _previous: WordFormState, formData: FormData): Promise<WordFormState> {
  const actor = await actionActor();
  const outcome = await deleteVocabulary(actor, getVocabularyRepository(), vocabularyId, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") redirect("/vocabulary?deleted=1");
  return toState(outcome, formData);
}

async function afterChange(vocabularyId: string, outcome: Outcome) {
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "failed") redirect(`/vocabulary?word=${vocabularyId}&error=${outcome.reason}`);
  if (outcome.status === "invalid") redirect(`/vocabulary?word=${vocabularyId}&error=invalid_state`);
  revalidatePath("/vocabulary");
}

export async function archiveWordAction(vocabularyId: string, formData: FormData): Promise<void> {
  const actor = await actionActor();
  await afterChange(vocabularyId, await setVocabularyArchived(actor, getVocabularyRepository(), vocabularyId, true, formData));
}

export async function unarchiveWordAction(vocabularyId: string, formData: FormData): Promise<void> {
  const actor = await actionActor();
  await afterChange(vocabularyId, await setVocabularyArchived(actor, getVocabularyRepository(), vocabularyId, false, formData));
}

export async function starWordAction(vocabularyId: string, starred: boolean): Promise<void> {
  const actor = await actionActor();
  await afterChange(vocabularyId, await setVocabularyStarred(actor, getVocabularyRepository(), vocabularyId, starred));
}

export async function relateWordAction(vocabularyId: string, formData: FormData): Promise<void> {
  const actor = await actionActor();
  await afterChange(vocabularyId, await relateWords(actor, getVocabularyRepository(), vocabularyId, formData));
}

export async function unrelateWordAction(vocabularyId: string, formData: FormData): Promise<void> {
  const actor = await actionActor();
  await afterChange(vocabularyId, await unrelateWords(actor, getVocabularyRepository(), vocabularyId, formData));
}

export type DeckFormState = { error?: string };

function deckError(outcome: Outcome<unknown>): DeckFormState {
  if (outcome.status === "invalid") return { error: outcome.errors.decks ?? outcome.errors.form ?? en.form.invalid };
  if (outcome.status === "failed") return { error: en.vocabulary.failures[outcome.reason] };
  return {};
}

export async function createDeckAction(_previous: DeckFormState, formData: FormData): Promise<DeckFormState> {
  const { actor, language } = await currentLanguage();
  if (!language) redirect("/");
  const outcome = await createDeck(actor, getVocabularyRepository(), language, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") revalidatePath("/vocabulary/decks");
  return deckError(outcome);
}

export async function renameDeckAction(deckId: string, _previous: DeckFormState, formData: FormData): Promise<DeckFormState> {
  const actor = await actionActor();
  const outcome = await renameDeck(actor, getVocabularyRepository(), deckId, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") revalidatePath("/vocabulary/decks");
  return deckError(outcome);
}

async function deckChange(deckId: string, change: "archive" | "unarchive" | "delete", formData: FormData) {
  const actor = await actionActor();
  const outcome = await changeDeck(actor, getVocabularyRepository(), deckId, change, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status !== "ok") redirect(`/vocabulary/decks?error=${outcome.status === "failed" ? outcome.reason : "invalid_state"}`);
  revalidatePath("/vocabulary/decks");
}

export async function archiveDeckAction(deckId: string, formData: FormData): Promise<void> {
  await deckChange(deckId, "archive", formData);
}

export async function unarchiveDeckAction(deckId: string, formData: FormData): Promise<void> {
  await deckChange(deckId, "unarchive", formData);
}

export async function deleteDeckAction(deckId: string, formData: FormData): Promise<void> {
  await deckChange(deckId, "delete", formData);
}
