import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { LessonForm } from "@/components/lesson-form";
import { hasPermission } from "@/server/policy/permissions";
import { listLanguages } from "@/modules/language/registry";
import { requireLearner } from "@/server/lessons";
import { redirect } from "next/navigation";
import { signOut } from "../../actions";
import { createLessonAction } from "../actions";

export const metadata: Metadata = { title: "Tạo bài học · Kiko" };

export default async function NewLessonPage() {
  const actor = await requireLearner();
  if (!hasPermission(actor, "lesson.write_private")) redirect("/library");

  return (
    <AppShell currentPath="/library" signOutAction={signOut}>
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <h1 className="text-page-title font-bold">Tạo bài học</h1>
        <LessonForm
          action={createLessonAction}
          // A fresh id per rendered form makes a retried submit return the same lesson.
          hidden={{ clientRequestId: randomUUID() }}
          defaults={{ title: "", languageCode: "", tags: "", levelLabel: "", sourceNote: "", content: "" }}
          languages={listLanguages()}
          languageLocked={false}
          submitLabel="Lưu bản nháp"
        />
      </div>
    </AppShell>
  );
}
