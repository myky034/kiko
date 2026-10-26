import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CreateDeckForm, RenameDeckForm } from "@/components/deck-forms";
import { Alert, BackLink, Card, PageHeader, buttonClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";
import { listDecks } from "@/modules/vocabulary/vocabulary";
import { getLearningContext } from "@/server/learning-language";
import { requireLearner } from "@/server/lessons";
import { shellContext } from "@/server/shell";
import { getVocabularyRepository } from "@/server/vocabulary";
import { signOut } from "../../actions";
import { archiveDeckAction, createDeckAction, deleteDeckAction, renameDeckAction, unarchiveDeckAction } from "../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.vocabulary.decksTitle) };

const copy = en.vocabulary;

export default async function DecksPage({ searchParams }: PageProps<"/vocabulary/decks">) {
  const actor = await requireLearner();
  const { current } = await getLearningContext(actor);
  if (!current) redirect("/");
  const decks = await listDecks(actor, getVocabularyRepository(), current);
  const { error } = await searchParams;
  const code = Array.isArray(error) ? error[0] : error;
  const message = code && Object.hasOwn(copy.failures, code) ? copy.failures[code as keyof typeof copy.failures] : null;
  return (
    <AppShell
      currentPath="/vocabulary"
      signOutAction={signOut}
      {...(await shellContext(actor))}
    >
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <BackLink href="/vocabulary" label={copy.backToVocabulary} />
        <PageHeader title={copy.decksTitle} subtitle={`${en.languages[current]} · ${copy.decksSubtitle}`} />
        {message ? (
          <Alert tone="error" title={en.lesson.actionFailed} role="alert">
            {message}
          </Alert>
        ) : null}
        <Card>
          <CreateDeckForm action={createDeckAction} />
        </Card>
        {decks.length === 0 ? (
          <p className="text-copy">{copy.noDecks}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {decks.map((deck) => (
              <li key={deck.id}>
                <Card className="flex flex-wrap items-center gap-3">
                  <RenameDeckForm action={renameDeckAction.bind(null, deck.id)} title={deck.title} version={deck.version} deckId={deck.id} />
                  <span className="num text-caption text-muted">{copy.deckWords(deck.itemCount)}</span>
                  {deck.archived ? <span className="text-caption font-bold text-copy">{copy.statusArchived}</span> : null}
                  <form action={(deck.archived ? unarchiveDeckAction : archiveDeckAction).bind(null, deck.id)}>
                    <input type="hidden" name="expectedVersion" value={deck.version} />
                    <button type="submit" className={`${buttonClass.secondary} min-h-10`}>
                      {deck.archived ? <ArchiveRestore aria-hidden="true" size={16} strokeWidth={2} /> : <Archive aria-hidden="true" size={16} strokeWidth={2} />}
                      {deck.archived ? copy.unarchive : copy.archive}
                    </button>
                  </form>
                  <form action={deleteDeckAction.bind(null, deck.id)}>
                    <input type="hidden" name="expectedVersion" value={deck.version} />
                    <button type="submit" className={`${buttonClass.danger} min-h-10`}>
                      <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
                      {copy.deleteDeck}
                    </button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
