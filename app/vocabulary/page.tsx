import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { VocabularyView, type VocabularyTab } from "@/components/vocabulary-view";
import { en } from "@/modules/i18n/en";
import { listDecks, listVocabulary, getVocabulary } from "@/modules/vocabulary/vocabulary";
import { signOut } from "../actions";
import { getLearningContext } from "@/server/learning-language";
import { requireLearner } from "@/server/lessons";
import { shellContext } from "@/server/shell";
import { getVocabularyRepository } from "@/server/vocabulary";
import { archiveWordAction, relateWordAction, starWordAction, unarchiveWordAction, unrelateWordAction } from "./actions";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: en.app.pageTitle(en.vocabulary.pageTitle) };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const TABS: readonly VocabularyTab[] = ["overview", "character", "examples", "notes"];

export default async function VocabularyPage({ searchParams }: PageProps<"/vocabulary">) {
  const actor = await requireLearner();
  const { current } = await getLearningContext(actor);
  if (!current) redirect("/");
  const params = await searchParams;
  const query = {
    archived: first(params.archived),
    tag: first(params.tag),
    deck: first(params.deck),
    starred: first(params.starred),
    source: first(params.source),
    sort: first(params.sort),
    page: first(params.page),
    size: first(params.size),
    view: first(params.view) === "cards" ? "cards" : undefined,
  };
  const repository = getVocabularyRepository();
  const [result, decks] = await Promise.all([
    listVocabulary(actor, repository, current, query),
    listDecks(actor, repository, current),
  ]);
  if (result.status !== "ok") redirect("/");

  const wordParam = first(params.word);
  const detail = wordParam ? await getVocabulary(actor, repository, wordParam) : null;
  // A word from another language (e.g. after switching) is not shown in this language's view.
  const selected = detail?.status === "ok" && detail.value.languageCode === current ? detail.value : null;
  const relationOptions = selected
    ? (
        await repository.list(actor.userId, { ...result.value.filter, archived: false, tag: null, deckId: null, starred: false, source: "all", sort: "alphabetical", page: 1, pageSize: 48 })
      ).items
        .filter((item) => item.id !== selected.id && !selected.related.some((related) => related.id === item.id))
        .map((item) => ({ id: item.id, surface: item.surface }))
    : [];
  const tabParam = first(params.tab);
  const errorCode = first(params.error);
  const error = errorCode && Object.hasOwn(en.vocabulary.failures, errorCode) ? en.vocabulary.failures[errorCode as keyof typeof en.vocabulary.failures] : null;

  return (
    <AppShell currentPath="/vocabulary" signOutAction={signOut} {...(await shellContext(actor))}>
      <VocabularyView
        language={current}
        items={result.value.items}
        total={result.value.total}
        activeTotal={result.value.activeTotal}
        page={result.value.page}
        pageCount={result.value.pageCount}
        filter={result.value.filter}
        query={{ ...query, word: selected?.id, tab: selected && tabParam && tabParam !== "overview" ? tabParam : undefined }}
        view={query.view === "cards" ? "cards" : "list"}
        decks={decks.filter((deck) => !deck.archived)}
        selected={selected}
        tab={(TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as VocabularyTab) : "overview"}
        relationOptions={relationOptions}
        deleted={first(params.deleted) === "1"}
        error={error}
        timeZone={actor.timezone}
        actions={{ star: starWordAction, archive: archiveWordAction, unarchive: unarchiveWordAction, relate: relateWordAction, unrelate: unrelateWordAction }}
      />
    </AppShell>
  );
}
