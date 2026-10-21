import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { shellContext } from "@/server/shell";
import { DeleteLessonForm } from "@/components/delete-lesson-form";
import { BackLink, Card } from "@/components/ui";
import { getLesson } from "@/modules/content/lessons";
import { en } from "@/modules/i18n/en";
import { getLanguage } from "@/modules/language/registry";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { signOut } from "../../../actions";
import { deleteLessonAction } from "../../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.deleteLesson.pageTitle) };

const copy = en.lesson;
const del = en.deleteLesson;

export default async function DeleteLessonPage({ params }: PageProps<"/lessons/[id]/delete">) {
  const actor = await requireLearner();
  const { id } = await params;
  const result = await getLesson(actor, getLessonRepository(), id);
  if (result.status !== "ok") notFound();
  const lesson = result.value;

  return (
    <AppShell currentPath="/library" signOutAction={signOut} {...(await shellContext(actor))} topBarStart={<BackLink href={`/lessons/${lesson.id}`} label={copy.backToLesson} />}>
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <BackLink href={`/lessons/${lesson.id}`} label={copy.backToLesson} inline />
        <Card className="flex flex-col gap-5 border-danger-border">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-danger-bg text-danger-text"
            >
              <TriangleAlert size={22} strokeWidth={1.9} />
            </span>
            <h1 className="pt-1.5 text-title-lg font-extrabold">{del.title}</h1>
          </div>
          <div className="flex flex-col gap-2 text-ink">
            <p>
              {del.bodyStart}
              <strong lang={getLanguage(lesson.languageCode).htmlLang}>{lesson.title}</strong> — <strong>{del.bodyAll}</strong>
              {del.bodyRest}
              <strong>{del.bodyIrreversible}</strong>
            </p>
            <p className="text-supporting text-muted">{del.hint}</p>
          </div>
          <DeleteLessonForm action={deleteLessonAction.bind(null, lesson.id)} version={lesson.version} />
        </Card>
      </div>
    </AppShell>
  );
}
