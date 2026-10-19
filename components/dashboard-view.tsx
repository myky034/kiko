import Link from "next/link";
import type { DashboardData } from "@/modules/identity/dashboard";
import { getLanguage } from "@/modules/language/registry";
import { Card } from "@/components/ui";

function EmptySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card className="flex h-full flex-col gap-2">
        <h2 id={id} className="text-section-title font-semibold">
          {title}
        </h2>
        <p className="text-muted-foreground">{children}</p>
      </Card>
    </section>
  );
}

/**
 * Dashboard for slice 1. Shows only data that exists: the actor's own languages
 * and timezone, and honest empty states. No counts, streaks or progress yet.
 */
export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 md:gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-page-title font-bold">Chào mừng đến Kiko</h1>
        {data.timezone ? (
          <p className="text-supporting text-muted-foreground">
            Múi giờ: <span className="font-medium text-foreground">{data.timezone}</span>
          </p>
        ) : null}
      </header>

      {data.isLearner ? (
        <>
          <section aria-labelledby="languages-title" className="flex flex-col gap-3">
            <h2 id="languages-title" className="text-section-title font-semibold">
              Ngôn ngữ đang học
            </h2>
            {data.languages.length > 0 ? (
              <ul className="flex flex-wrap gap-3">
                {data.languages.map((code) => {
                  const language = getLanguage(code);
                  return (
                    <li
                      key={code}
                      className="flex min-h-11 items-center gap-2 rounded-xl bg-primary-soft px-4 py-2"
                    >
                      <span className="font-medium text-primary-strong">{language.labelVi}</span>
                      <span lang={language.htmlLang} className="text-foreground">
                        {language.nativeName}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">Chưa chọn ngôn ngữ nào.</p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <EmptySection id="continue-title" title="Học tiếp">
              Bài học của bạn nằm trong{" "}
              <Link href="/library" className="font-medium text-primary-strong underline">
                Thư viện
              </Link>
              . Tạo bài mới hoặc mở lại bài đang học từ đó.
            </EmptySection>
            <EmptySection id="review-title" title="Ôn tập">
              Chưa có thẻ ôn tập. Thẻ sẽ xuất hiện khi bạn lưu từ vựng và thêm vào ôn tập.
            </EmptySection>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">
          Tài khoản này không có vai trò người học, nên không có nội dung học riêng.
        </p>
      )}

      {data.isOwner ? (
        <EmptySection id="admin-title" title="Quản trị">
          Khu quản trị (cấp quyền tài khoản, catalog, cấu hình) chưa được triển khai. Hiện việc
          cấp quyền email được thực hiện bằng script vận hành.
        </EmptySection>
      ) : null}
    </div>
  );
}
