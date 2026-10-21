import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { getLearningContext } from "@/server/learning-language";
import { shellContext } from "@/server/shell";
import { LessonForm } from "@/components/lesson-form";
import { hasPermission } from "@/server/policy/permissions";
import { listLanguages } from "@/modules/language/registry";
import { PageHeader } from "@/components/ui";
import { en } from "@/modules/i18n/en";
import { requireLearner } from "@/server/lessons";
import { redirect } from "next/navigation";
import { signOut } from "../../actions";
import { createLessonAction } from "../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.lessonForm.newPageTitle) };

export default async function NewLessonPage() {
  const actor = await requireLearner();
  if (!hasPermission(actor, "lesson.write_private")) redirect("/library");

  return (
    <AppShell currentPath="/library" signOutAction={signOut} {...(await shellContext(actor))}>
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <PageHeader title={en.lessonForm.newTitle} />
        <LessonForm
          action={createLessonAction}
          // A fresh id per rendered form makes a retried submit return the same lesson.
          hidden={{ clientRequestId: randomUUID() }}
          defaults={{ title: "", languageCode: (await getLearningContext(actor)).current ?? "", tags: "", levelLabel: "", sourceNote: "", content: "" }}
          languages={listLanguages()}
          languageLocked={false}
          submitLabel={en.lessonForm.saveDraft}
        />
      </div>
    </AppShell>
  );
}
