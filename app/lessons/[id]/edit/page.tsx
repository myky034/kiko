import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LessonForm } from "@/components/lesson-form";
import { getLesson } from "@/modules/content/lessons";
import { listLanguages } from "@/modules/language/registry";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { signOut } from "../../../actions";
import { updateLessonAction } from "../../actions";

export const metadata: Metadata = { title: "Sửa bài học · Kiko" };

export default async function EditLessonPage({ params }: PageProps<"/lessons/[id]/edit">) {
  const actor = await requireLearner();
  const { id } = await params;
  const result = await getLesson(actor, getLessonRepository(), id);
  if (result.status !== "ok") notFound();
  const lesson = result.value;
  if (lesson.status === "archived") redirect(`/lessons/${lesson.id}?error=invalid_state`);

  const everPublished = lesson.active !== null;
  return (
    <AppShell currentPath="/library" signOutAction={signOut}>
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <Link href={`/lessons/${lesson.id}`} className="text-supporting font-medium text-primary-strong">
          ← Quay lại bài học
        </Link>
        <h1 className="text-page-title font-bold">Sửa bài học</h1>
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
          submitLabel={everPublished ? "Lưu bản sửa (chưa công bố)" : "Lưu bản nháp"}
          contentHint={
            everPublished
              ? "Bản đang học không đổi. Nội dung sửa được lưu thành bản mới và chỉ thay thế khi bạn công bố. Mỗi dòng không trống là một đoạn."
              : undefined
          }
        />
      </div>
    </AppShell>
  );
}
