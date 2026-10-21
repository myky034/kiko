"use server";

import { redirect } from "next/navigation";
import type { LessonFormErrors } from "@/modules/content/lesson-input";
import {
  FAILURE_MESSAGES,
  createLesson,
  deleteLesson,
  transitionLesson,
  updateLesson,
  type Outcome,
} from "@/modules/content/lessons";
import { actionActor, getLessonRepository } from "@/server/lessons";

export type LessonFormState = {
  errors: LessonFormErrors;
  /** Echo of submitted values so nothing the user typed is lost on error. */
  values?: Record<string, string>;
};

function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of ["title", "languageCode", "tags", "levelLabel", "sourceNote", "content"]) {
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value;
  }
  return values;
}

function toFormState(outcome: Outcome<unknown>, formData: FormData): LessonFormState {
  if (outcome.status === "invalid") return { errors: outcome.errors, values: echo(formData) };
  if (outcome.status === "failed") return { errors: { form: FAILURE_MESSAGES[outcome.reason] }, values: echo(formData) };
  return { errors: {}, values: echo(formData) };
}

export async function createLessonAction(_previous: LessonFormState, formData: FormData): Promise<LessonFormState> {
  const actor = await actionActor();
  const outcome = await createLesson(actor, getLessonRepository(), formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") redirect(`/lessons/${outcome.value.lessonId}`);
  return toFormState(outcome, formData);
}

export async function updateLessonAction(
  lessonId: string,
  _previous: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const actor = await actionActor();
  const outcome = await updateLesson(actor, getLessonRepository(), lessonId, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") redirect(`/lessons/${lessonId}`);
  return toFormState(outcome, formData);
}

async function transition(lessonId: string, kind: "publish" | "archive" | "unarchive", formData: FormData) {
  const actor = await actionActor();
  const outcome = await transitionLesson(actor, getLessonRepository(), lessonId, kind, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "failed") redirect(`/lessons/${lessonId}?error=${outcome.reason}`);
  if (outcome.status === "invalid") redirect(`/lessons/${lessonId}?error=invalid_state`);
  redirect(`/lessons/${lessonId}`);
}

export async function publishLessonAction(lessonId: string, formData: FormData): Promise<void> {
  await transition(lessonId, "publish", formData);
}

export async function archiveLessonAction(lessonId: string, formData: FormData): Promise<void> {
  await transition(lessonId, "archive", formData);
}

export async function unarchiveLessonAction(lessonId: string, formData: FormData): Promise<void> {
  await transition(lessonId, "unarchive", formData);
}

export async function deleteLessonAction(
  lessonId: string,
  _previous: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const actor = await actionActor();
  const outcome = await deleteLesson(actor, getLessonRepository(), lessonId, formData);
  if (outcome.status === "forbidden") redirect("/");
  if (outcome.status === "ok") redirect("/library?deleted=1");
  if (outcome.status === "failed" && outcome.reason === "not_found") redirect("/library");
  return { errors: outcome.status === "invalid" ? outcome.errors : { form: FAILURE_MESSAGES[outcome.reason] } };
}
