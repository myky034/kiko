import { Archive, ArchiveRestore, CircleCheck, Pencil, Send, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { shellContext } from "@/server/shell";
import { LanguageBadge, LessonStatusBadge, LessonThumb, SegmentList } from "@/components/lesson-parts";
import { Alert, BackLink, Card, buttonClass } from "@/components/ui";
import { FAILURE_MESSAGES, getLesson } from "@/modules/content/lessons";
import type { LessonFailure } from "@/modules/content/types";
import { en } from "@/modules/i18n/en";
import { getLanguage } from "@/modules/language/registry";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { signOut } from "../../actions";
import { archiveLessonAction, publishLessonAction, unarchiveLessonAction } from "../actions";

// Titles are private: the browser title stays generic.
export const metadata: Metadata = { title: en.app.pageTitle(en.lesson.pageTitle) };

const copy = en.lesson;

function errorMessage(code: unknown): string | null {
  return typeof code === "string" && Object.hasOwn(FAILURE_MESSAGES, code) ? FAILURE_MESSAGES[code as LessonFailure] : null;
}

function VersionForm({
  action,
  version,
  label,
  icon: Icon,
  primary,
}: {
  action: (formData: FormData) => Promise<void>;
  version: number;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="expectedVersion" value={version} />
      <button type="submit" className={primary ? buttonClass.primary : buttonClass.secondary}>
        <Icon aria-hidden="true" size={18} strokeWidth={2} />
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
    <AppShell currentPath="/library" signOutAction={signOut} {...(await shellContext(actor))} topBarStart={<BackLink href="/library" label={copy.backToLibrary} />}>
      <article className="mx-auto flex max-w-reading flex-col gap-6">
        <BackLink href="/library" label={copy.backToLibrary} inline />

        <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <LessonThumb code={lesson.languageCode} className="h-28 shrink-0 rounded-[12px] sm:h-32 sm:w-44" />
          <header className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <LanguageBadge code={lesson.languageCode} />
              <LessonStatusBadge status={lesson.status} />
              {lesson.levelLabel ? (
                <span className="inline-flex min-h-6 items-center rounded-full bg-soft px-2.5 text-caption font-bold text-copy">
                  {copy.level(lesson.levelLabel)}
                </span>
              ) : null}
            </div>
            <h1 lang={getLanguage(lesson.languageCode).htmlLang} className="text-title-lg font-extrabold tracking-tight">
              {lesson.title}
            </h1>
            {lesson.tags.length > 0 ? <p className="text-supporting text-muted">{copy.topics(lesson.tags.join(", "))}</p> : null}
            {lesson.sourceNote ? (
              <p className="whitespace-pre-wrap text-supporting text-muted">{copy.source(lesson.sourceNote)}</p>
            ) : null}
          </header>
        </Card>

        {message ? (
          <Alert tone="error" title={copy.actionFailed} role="alert">
            {message}
          </Alert>
        ) : null}
        {lesson.status === "ready" && lesson.draft ? (
          <Alert tone="info" title={copy.pendingEditTitle} role="status">
            {copy.pendingEditBody(lesson.active?.versionNo, lesson.draft.versionNo)}
          </Alert>
        ) : null}
        {lesson.status === "draft" ? (
          <Alert tone="warning" title={copy.draftTitle} role="status">
            {copy.draftBody}
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {lesson.status === "draft" ? (
            <VersionForm
              action={publishLessonAction.bind(null, lesson.id)}
              version={lesson.version}
              label={copy.markReady}
              icon={CircleCheck}
              primary
            />
          ) : null}
          {lesson.status === "ready" && lesson.draft ? (
            <VersionForm
              action={publishLessonAction.bind(null, lesson.id)}
              version={lesson.version}
              label={copy.publishEdit}
              icon={Send}
              primary
            />
          ) : null}
          {!archived ? (
            <Link href={`/lessons/${lesson.id}/edit`} className={buttonClass.secondary}>
              <Pencil aria-hidden="true" size={18} strokeWidth={2} />
              {copy.edit}
            </Link>
          ) : null}
          {archived ? (
            <VersionForm
              action={unarchiveLessonAction.bind(null, lesson.id)}
              version={lesson.version}
              label={copy.unarchive}
              icon={ArchiveRestore}
            />
          ) : (
            <VersionForm
              action={archiveLessonAction.bind(null, lesson.id)}
              version={lesson.version}
              label={copy.archive}
              icon={Archive}
            />
          )}
          <Link href={`/lessons/${lesson.id}/delete`} className={buttonClass.danger}>
            <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
            {copy.deleteLink}
          </Link>
        </div>

        <section aria-labelledby="content-title">
          <Card className="flex flex-col gap-4">
            <h2 id="content-title" className="text-title font-extrabold">
              {copy.content}{" "}
              {showing ? <span className="num text-supporting font-medium text-muted">{copy.version(showing.versionNo)}</span> : null}
            </h2>
            <SegmentList segments={showing?.segments ?? []} languageCode={lesson.languageCode} />
          </Card>
        </section>
      </article>
    </AppShell>
  );
}
