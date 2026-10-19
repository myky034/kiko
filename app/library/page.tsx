import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LanguageBadge, LessonStatusBadge } from "@/components/lesson-parts";
import { Alert, Card, buttonClass, inputClass } from "@/components/ui";
import { listLessons } from "@/modules/content/lessons";
import { getLanguage, listLanguages } from "@/modules/language/registry";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Thư viện · Kiko" };

const dateVi = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const actor = await requireLearner();
  const params = await searchParams;
  const query = {
    language: first(params.language),
    status: first(params.status),
    tag: first(params.tag),
    cursor: first(params.cursor),
  };
  const result = await listLessons(actor, getLessonRepository(), query);
  const page = result.status === "ok" ? result.value : { items: [], nextCursor: null };
  const filtered = Boolean(query.language || (query.status && query.status !== "active") || query.tag);

  const nextHref = (() => {
    if (!page.nextCursor) return null;
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value && key !== "cursor") next.set(key, value);
    next.set("cursor", page.nextCursor);
    return `/library?${next.toString()}`;
  })();

  return (
    <AppShell currentPath="/library" signOutAction={signOut}>
      <div className="mx-auto flex max-w-content flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-page-title font-bold">Thư viện</h1>
          <Link href="/lessons/new" className={buttonClass.primary}>
            Tạo bài học
          </Link>
        </header>

        {first(params.deleted) === "1" ? (
          <Alert tone="info" title="Đã xóa vĩnh viễn bài học" role="status" />
        ) : null}

        <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-4" aria-label="Lọc bài học">
          <label className="flex flex-col gap-1 text-supporting font-medium">
            Ngôn ngữ
            <select name="language" defaultValue={query.language ?? ""} className={inputClass}>
              <option value="">Tất cả</option>
              {listLanguages().map((language) => (
                <option key={language.code} value={language.code}>
                  {language.labelVi}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-supporting font-medium">
            Trạng thái
            <select name="status" defaultValue={query.status ?? "active"} className={inputClass}>
              <option value="active">Đang dùng (nháp + sẵn sàng)</option>
              <option value="draft">Nháp</option>
              <option value="ready">Sẵn sàng</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-supporting font-medium">
            Chủ đề
            <input name="tag" defaultValue={query.tag ?? ""} className={inputClass} />
          </label>
          <div className="flex items-end">
            <button type="submit" className={`${buttonClass.secondary} w-full`}>
              Lọc
            </button>
          </div>
        </form>

        {page.items.length === 0 ? (
          <Card className="flex flex-col items-start gap-3">
            <h2 className="text-section-title font-semibold">{filtered ? "Không có bài phù hợp" : "Chưa có bài học nào"}</h2>
            <p className="text-muted-foreground">
              {filtered
                ? "Thử bỏ bớt bộ lọc."
                : "Tạo bài đầu tiên bằng cách dán một đoạn văn bản tiếng Trung, tiếng Nhật hoặc tiếng Anh."}
            </p>
            {!filtered ? (
              <Link href="/lessons/new" className={buttonClass.secondary}>
                Tạo bài học
              </Link>
            ) : null}
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {page.items.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/lessons/${lesson.id}`}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card hover:border-primary"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <LanguageBadge code={lesson.languageCode} />
                    <LessonStatusBadge status={lesson.status} />
                  </div>
                  <h2 lang={getLanguage(lesson.languageCode).htmlLang} className="text-section-title font-semibold">
                    {lesson.title}
                  </h2>
                  {lesson.tags.length > 0 ? (
                    <p className="text-supporting text-muted-foreground">Chủ đề: {lesson.tags.join(", ")}</p>
                  ) : null}
                  <p className="mt-auto text-supporting text-muted-foreground">
                    Cập nhật {dateVi.format(lesson.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {nextHref ? (
          <Link href={nextHref} className={`${buttonClass.secondary} self-center`}>
            Xem thêm
          </Link>
        ) : null}
      </div>
    </AppShell>
  );
}
