import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BackLink, Card } from "@/components/ui";
import { DeleteWordForm } from "@/components/word-form";
import { en } from "@/modules/i18n/en";
import { getLanguage } from "@/modules/language/registry";
import { getVocabulary } from "@/modules/vocabulary/vocabulary";
import { requireLearner } from "@/server/lessons";
import { shellContext } from "@/server/shell";
import { getVocabularyRepository } from "@/server/vocabulary";
import { signOut } from "../../../actions";
import { deleteWordAction } from "../../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.vocabulary.deleteTitle) };

export default async function DeleteWordPage({ params }: PageProps<"/vocabulary/[id]/delete">) {
  const actor = await requireLearner();
  const { id } = await params;
  const result = await getVocabulary(actor, getVocabularyRepository(), id);
  if (result.status !== "ok") notFound();
  const word = result.value;
  const backHref = `/vocabulary?word=${word.id}`;
  return (
    <AppShell
      currentPath="/vocabulary"
      signOutAction={signOut}
      {...(await shellContext(actor))}
    >
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <BackLink href={backHref} label={en.vocabulary.backToVocabulary} />
        <Card className="flex flex-col gap-5 border-danger-border">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-danger-bg text-danger-text">
              <TriangleAlert size={22} strokeWidth={1.9} />
            </span>
            <h1 className="pt-1.5 text-title-lg font-extrabold">{en.vocabulary.deleteTitle}</h1>
          </div>
          <p className="text-ink">
            <strong lang={getLanguage(word.languageCode).htmlLang}>{word.surface}</strong> — {word.meaning}
          </p>
          <p className="text-supporting text-muted">{en.vocabulary.deleteBody}</p>
          <DeleteWordForm action={deleteWordAction.bind(null, word.id)} version={word.version} />
        </Card>
      </div>
    </AppShell>
  );
}
