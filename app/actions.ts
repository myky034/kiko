"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseLearningLanguageForm } from "@/modules/language/learning-language";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getAccessDependencies } from "@/server/identity";
import { enabledLanguages } from "@/server/learning-language";
import { actionActor } from "@/server/lessons";

/** Ends the session on this device. POST-only (Server Action), never a GET link. */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}

/**
 * Switches the learning language shown across pages and stores it on the
 * actor's own profile (DEC-037). Only one of the actor's enabled languages is
 * accepted; anything else is ignored. It filters content only — every lesson
 * query stays scoped to the actor.
 */
export async function setLearningLanguage(formData: FormData): Promise<void> {
  const actor = await actionActor();
  const language = parseLearningLanguageForm(formData, await enabledLanguages(actor));
  if (!language) return;
  const { repository } = await getAccessDependencies();
  const result = await repository.saveLearningLanguage({
    userId: actor.userId,
    expectedRevision: actor.authorizationRevision,
    languageCode: language,
  });
  if (result === "stale_authorization") redirect("/");
  // Every signed-in page reads the learning language: re-render them all.
  revalidatePath("/", "layout");
}
