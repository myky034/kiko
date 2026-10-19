"use client";

import { buttonClass } from "@/components/ui";

/**
 * Generic failure screen. Error details (which may include configuration or
 * database messages) are never rendered; Next.js logs them on the server.
 */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div role="alert" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
        <p className="text-xl font-semibold text-primary-strong">Kiko</p>
        <h1 className="mt-4 text-section-title font-semibold">Không tải được trang</h1>
        <p className="mt-2 text-muted-foreground">
          Đã có lỗi khi kết nối dịch vụ. Dữ liệu của bạn không bị thay đổi. Vui lòng thử lại.
        </p>
        <button type="button" onClick={() => retry()} className={`${buttonClass.primary} mt-6 w-full`}>
          Thử lại
        </button>
      </div>
    </main>
  );
}
