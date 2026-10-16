import { AppShell } from "@/components/app-shell";
import { LanguageCard } from "@/components/language-card";
import { listLanguages } from "@/modules/language/registry";

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      <div className="mx-auto flex max-w-workspace flex-col gap-8">
        <section aria-labelledby="home-title" className="flex flex-col gap-3">
          <h1 id="home-title" className="text-3xl font-semibold tracking-tight">
            Kiko
          </h1>
          <p className="max-w-reading text-muted-text">
            Không gian tự học tiếng Trung, tiếng Nhật và tiếng Anh: đọc, lưu từ,
            shadowing, luyện chữ và ôn tập.
          </p>
          <p
            role="status"
            className="max-w-reading rounded-control border border-warning/40 bg-surface px-4 py-3 text-sm"
          >
            <strong className="font-semibold text-warning">
              Đang khởi tạo.
            </strong>{" "}
            Chưa có đăng nhập, lưu trữ hay dữ liệu học. Các mục điều hướng đánh
            dấu “Chưa có” sẽ được bổ sung theo kế hoạch triển khai.
          </p>
        </section>

        <section aria-labelledby="languages-title" className="flex flex-col gap-4">
          <h2 id="languages-title" className="text-xl font-semibold">
            Ngôn ngữ học
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {listLanguages().map((language) => (
              <li key={language.code} className="flex">
                <LanguageCard language={language} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
