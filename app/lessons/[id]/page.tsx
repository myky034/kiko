import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LanguageBadge, LessonStatusBadge, SegmentList } from "@/components/lesson-parts";
import { Alert, buttonClass } from "@/components/ui";
import { FAILURE_MESSAGES, getLesson } from "@/modules/content/lessons";
import type { LessonFailure } from "@/modules/content/types";
import { getLanguage } from "@/modules/language/registry";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { signOut } from "../../actions";
import { archiveLessonAction, publishLessonAction, unarchiveLessonAction } from "../actions";

// Titles are private: the browser title stays generic.
export const metadata: Metadata = { title: "Bài học · Kiko" };

function errorMessage(code: unknown): string | null {
  return typeof code === "string" && Object.hasOwn(FAILURE_MESSAGES, code) ? FAILURE_MESSAGES[code as LessonFailure] : null;
}

function VersionForm({ action, version, label, primary }: { action: (formData: FormData) => Promise<void>; version: number; label: string; primary?: boolean }) {
  return (
    <form action={action}>
      <input type="hidden" name="expectedVersion" value={version} />
      <button type="submit" className={primary ? buttonClass.primary : buttonClass.secondary}>
        {label}
      </button>
    </form>
  );
}

export default async function LessonPage({ params, searchParams }: PageProps<"/lessons/[id]">) {
  const actor = await requireLearner();
  const { id } = await params;
  const result = await getLesson(actor, getLessonRepository(), id);
  if (result.status !== "ok") notFound();
  const lesson = result.value;
  const { error } = await searchParams;
  const message = errorMessage(Array.isArray(error) ? error[0] : error);

  const showing = lesson.active ?? lesson.draft;
  const archived = lesson.status === "archived";

  return (
    <AppShell currentPath="/library" signOutAction={signOut}>
      <article className="mx-auto flex max-w-reading flex-col gap-6">
        <header className="flex flex-col gap-3">
          <Link href="/library" className="text-supporting font-medium text-primary-strong">
            ← Thư viện
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageBadge code={lesson.languageCode} />
            <LessonStatusBadge status={lesson.status} />
            {lesson.levelLabel ? <span className="text-supporting text-muted-foreground">Mức độ: {lesson.levelLabel}</span> : null}
          </div>
          <h1 lang={getLanguage(lesson.languageCode).htmlLang} className="text-page-title font-bold">
            {lesson.title}
          </h1>
          {lesson.tags.length > 0 ? <p className="text-supporting text-muted-foreground">Chủ đề: {lesson.tags.join(", ")}</p> : null}
          {lesson.sourceNote ? <p className="whitespace-pre-wrap text-supporting text-muted-foreground">Nguồn: {lesson.sourceNote}</p> : null}
        </header>

        {message ? (
          <Alert tone="error" title="Chưa thực hiện được" role="alert">
            {message}
          </Alert>
        ) : null}
        {lesson.status === "ready" && lesson.draft ? (
          <Alert tone="info" title="Có bản sửa chưa công bố" role="status">
            Nội dung bên dưới là bản đang học (phiên bản {lesson.active?.versionNo}). Bản sửa {lesson.draft.versionNo} chỉ thay
            thế khi bạn công bố.
          </Alert>
        ) : null}
        {lesson.status === "draft" ? (
          <Alert tone="warning" title="Bản nháp" role="status">
            Bài chưa sẵn sàng. Chuyển sang sẵn sàng để khóa phiên bản này làm bản học.
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {!archived ? (
            <Link href={`/lessons/${lesson.id}/edit`} className={buttonClass.secondary}>
              Sửa
            </Link>
          ) : null}
          {lesson.status === "draft" ? (
            <VersionForm action={publishLessonAction.bind(null, lesson.id)} version={lesson.version} label="Chuyển sang sẵn sàng" primary />
          ) : null}
          {lesson.status === "ready" && lesson.draft ? (
            <VersionForm action={publishLessonAction.bind(null, lesson.id)} version={lesson.version} label="Công bố bản sửa" primary />
          ) : null}
          {archived ? (
            <VersionForm action={unarchiveLessonAction.bind(null, lesson.id)} version={lesson.version} label="Bỏ lưu trữ" />
          ) : (
            <VersionForm action={archiveLessonAction.bind(null, lesson.id)} version={lesson.version} label="Lưu trữ" />
          )}
          <Link href={`/lessons/${lesson.id}/delete`} className={`${buttonClass.ghost} text-destructive`}>
            Xóa vĩnh viễn…
          </Link>
        </div>

        <section aria-labelledby="content-title" className="flex flex-col gap-3">
          <h2 id="content-title" className="text-section-title font-semibold">
            Nội dung {showing ? <span className="text-supporting font-normal text-muted-foreground">(phiên bản {showing.versionNo})</span> : null}
          </h2>
          <SegmentList segments={showing?.segments ?? []} languageCode={lesson.languageCode} />
        </section>
      </article>
    </AppShell>
  );
}
