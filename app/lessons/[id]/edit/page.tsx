import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { shellContext } from "@/server/shell";
import { LessonForm } from "@/components/lesson-form";
import { BackLink, PageHeader } from "@/components/ui";
import { getLesson } from "@/modules/content/lessons";
import { en } from "@/modules/i18n/en";
import { listLanguages } from "@/modules/language/registry";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { signOut } from "../../../actions";
import { updateLessonAction } from "../../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.lessonForm.editPageTitle) };

export default async function EditLessonPage({ params }: PageProps<"/lessons/[id]/edit">) {
  const actor = await requireLearner();
  const { id } = await params;
  const result = await getLesson(actor, getLessonRepository(), id);
  if (result.status !== "ok") notFound();
  const lesson = result.value;
  if (lesson.status === "archived") redirect(`/lessons/${lesson.id}?error=invalid_state`);

  const everPublished = lesson.active !== null;
  return (
    <AppShell currentPath="/library" signOutAction={signOut} {...(await shellContext(actor))}>
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <BackLink href={`/lessons/${lesson.id}`} label={en.lesson.backToLesson} />
        <PageHeader title={en.lessonForm.editTitle} />
        <LessonForm
          action={updateLessonAction.bind(null, lesson.id)}
          hidden={{ expectedVersion: String(lesson.version) }}
          defaults={{
            title: lesson.title,
            languageCode: lesson.languageCode,
            tags: lesson.tags.join(", "),
            levelLabel: lesson.levelLabel ?? "",
            sourceNote: lesson.sourceNote ?? "",
            content: lesson.draft?.sourceText ?? lesson.active?.sourceText ?? "",
          }}
          languages={listLanguages()}
          languageLocked={everPublished}
          submitLabel={everPublished ? en.lessonForm.saveEdit : en.lessonForm.saveDraft}
          contentHint={everPublished ? en.lessonForm.editContentHint : undefined}
        />
      </div>
    </AppShell>
  );
}
