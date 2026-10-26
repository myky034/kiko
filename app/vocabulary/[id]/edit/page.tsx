import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BackLink, PageHeader } from "@/components/ui";
import { WordForm } from "@/components/word-form";
import { en } from "@/modules/i18n/en";
import { getVocabulary, listDecks } from "@/modules/vocabulary/vocabulary";
import { requireLearner } from "@/server/lessons";
import { shellContext } from "@/server/shell";
import { getVocabularyRepository } from "@/server/vocabulary";
import { signOut } from "../../../actions";
import { updateWordAction } from "../../actions";

// Words are private: the browser title stays generic.
export const metadata: Metadata = { title: en.app.pageTitle(en.vocabulary.editWord) };

export default async function EditWordPage({ params }: PageProps<"/vocabulary/[id]/edit">) {
  const actor = await requireLearner();
  const { id } = await params;
  const repository = getVocabularyRepository();
  const result = await getVocabulary(actor, repository, id);
  if (result.status !== "ok" || result.value.archived) notFound();
  const word = result.value;
  const decks = await listDecks(actor, repository, word.languageCode);
  const usable = decks.filter((deck) => !deck.archived || word.decks.some((item) => item.id === deck.id));
  const backHref = `/vocabulary?word=${word.id}`;
  return (
    <AppShell
      currentPath="/vocabulary"
      signOutAction={signOut}
      {...(await shellContext(actor))}
    >
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <BackLink href={backHref} label={en.vocabulary.backToVocabulary} />
        <PageHeader title={en.vocabulary.editWord} subtitle={en.languages[word.languageCode]} />
        <WordForm
          action={updateWordAction.bind(null, word.id)}
          hidden={{ expectedVersion: String(word.version) }}
          defaults={{
            surface: word.surface,
            meaning: word.meaning,
            readings: word.readings,
            notes: word.notes ?? "",
            usage: word.usage ?? "",
            tags: word.tags.join(", "),
            starred: word.starred,
            examples: word.examples,
            deckIds: word.decks.map((deck) => deck.id),
          }}
          language={word.languageCode}
          decks={usable}
          submitLabel={en.vocabulary.save}
        />
      </div>
    </AppShell>
  );
}
