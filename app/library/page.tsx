import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LibraryView } from "@/components/library-view";
import { listLessons } from "@/modules/content/lessons";
import { en } from "@/modules/i18n/en";
import { getLearningContext } from "@/server/learning-language";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { shellContext } from "@/server/shell";
import { signOut } from "../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.library.pageTitle) };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const actor = await requireLearner();
  const params = await searchParams;
  const { current } = await getLearningContext(actor);
  const explicitLanguage = first(params.language);
  // Without an explicit choice the Library shows the header's learning language; "all" shows every language.
  const query = {
    language: explicitLanguage ?? current ?? undefined,
    status: first(params.status),
    tag: first(params.tag),
    cursor: first(params.cursor),
  };
  const result = await listLessons(actor, getLessonRepository(), query);
  const page = result.status === "ok" ? result.value : { items: [], nextCursor: null };
  const filtered = Boolean(
    (explicitLanguage && explicitLanguage !== current) || (query.status && query.status !== "active") || query.tag,
  );

  const nextHref = (() => {
    if (!page.nextCursor) return null;
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, language: explicitLanguage })) {
      if (value && key !== "cursor") next.set(key, value);
    }
    next.set("cursor", page.nextCursor);
    return `/library?${next.toString()}`;
  })();

  return (
    <AppShell currentPath="/library" signOutAction={signOut} {...(await shellContext(actor))}>
      <LibraryView
        lessons={page.items}
        nextHref={nextHref}
        query={query}
        filtered={filtered}
        deleted={first(params.deleted) === "1"}
        timeZone={actor.timezone}
      />
    </AppShell>
  );
}
