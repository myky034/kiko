import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BackLink, PageHeader } from "@/components/ui";
import { WordForm } from "@/components/word-form";
import { en } from "@/modules/i18n/en";
import { listDecks } from "@/modules/vocabulary/vocabulary";
import { getLearningContext } from "@/server/learning-language";
import { requireLearner } from "@/server/lessons";
import { shellContext } from "@/server/shell";
import { getVocabularyRepository } from "@/server/vocabulary";
import { signOut } from "../../actions";
import { createWordAction } from "../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.vocabulary.newWord) };

export default async function NewWordPage() {
  const actor = await requireLearner();
  const { current } = await getLearningContext(actor);
  if (!current) redirect("/");
  const decks = (await listDecks(actor, getVocabularyRepository(), current)).filter((deck) => !deck.archived);
  return (
    <AppShell currentPath="/vocabulary" signOutAction={signOut} {...(await shellContext(actor))}>
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <BackLink href="/vocabulary" label={en.vocabulary.backToVocabulary} />
        <PageHeader title={en.vocabulary.newWord} subtitle={en.languages[current]} />
        <WordForm
          action={createWordAction}
          // A fresh id per rendered form makes a retried submit return the same word.
          hidden={{ clientRequestId: randomUUID() }}
          defaults={{ surface: "", meaning: "", readings: [], notes: "", usage: "", tags: "", starred: false, examples: [], deckIds: [] }}
          language={current}
          decks={decks}
          submitLabel={en.vocabulary.save}
        />
      </div>
    </AppShell>
  );
}
