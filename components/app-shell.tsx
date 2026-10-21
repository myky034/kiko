import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui";

type NavItem = {
  label: string;
  href: string;
  /** Only destinations whose route exists are rendered as links. */
  available: boolean;
  /** Shown in the compact bottom bar; the rest belong under "Thêm" (UI_SPEC §4). */
  primaryOnMobile: boolean;
};

export const LEARNING_NAV: readonly NavItem[] = [
  { label: "Trang chủ", href: "/", available: true, primaryOnMobile: true },
  { label: "Thư viện", href: "/library", available: true, primaryOnMobile: true },
  { label: "Từ vựng", href: "/vocabulary", available: false, primaryOnMobile: false },
  { label: "Luyện chữ", href: "/writing", available: false, primaryOnMobile: false },
  { label: "Ôn tập", href: "/review", available: false, primaryOnMobile: true },
  { label: "Tiến độ", href: "/progress", available: false, primaryOnMobile: false },
  { label: "Cài đặt", href: "/settings", available: false, primaryOnMobile: false },
];

const UNAVAILABLE_HINT = "Chưa có";

function NavEntry({ item, current }: { item: NavItem; current: boolean }) {
  const base = "flex min-h-11 items-center justify-between gap-2 rounded-md px-3 text-supporting";

  if (!item.available) {
    return (
      <span aria-disabled="true" className={`${base} cursor-not-allowed text-muted-foreground`}>
        <span>{item.label}</span>
        <span className="text-xs">{UNAVAILABLE_HINT}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`${base} font-medium ${
        current ? "bg-primary-soft text-primary-strong" : "text-foreground hover:bg-muted"
      }`}
    >
      {item.label}
    </Link>
  );
}

export function AppShell({
  children,
  currentPath,
  signOutAction,
}: {
  children: ReactNode;
  currentPath: string;
  /** Server Action that ends the session; rendered as a POST form. */
  signOutAction?: () => Promise<void>;
}) {
  const mobileItems = LEARNING_NAV.filter((item) => item.primaryOnMobile);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Bỏ qua đến nội dung chính
      </a>

      <header className="sticky top-0 z-40 flex h-(--shell-header-height) items-center justify-between border-b border-border bg-surface px-4 md:px-8">
        <Link href="/" className="text-xl font-semibold tracking-tight text-primary-strong">
          Kiko
        </Link>
        {signOutAction ? (
          <form action={signOutAction}>
            <button type="submit" className={buttonClass.ghost}>
              Đăng xuất
            </button>
          </form>
        ) : null}
      </header>

      <div className="flex flex-1">
        <nav
          aria-label="Điều hướng học tập"
          className="hidden w-(--shell-sidebar-width) shrink-0 border-r border-border bg-surface p-3 md:block"
        >
          <ul className="flex flex-col gap-1">
            {LEARNING_NAV.map((item) => (
              <li key={item.href}>
                <NavEntry item={item} current={item.href === currentPath} />
              </li>
            ))}
          </ul>
        </nav>

        <main
          id="main"
          className="min-w-0 flex-1 px-4 pt-6 pb-[calc(var(--shell-bottom-nav-height)+1.5rem)] md:px-8 md:pt-8 md:pb-8"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Điều hướng nhanh"
        className="fixed inset-x-0 bottom-0 z-40 h-(--shell-bottom-nav-height) border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid h-full grid-cols-4">
          {mobileItems.map((item) => (
            <li key={item.href} className="flex">
              {item.available ? (
                <Link
                  href={item.href}
                  aria-current={item.href === currentPath ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center justify-center text-xs font-medium ${
                    item.href === currentPath ? "text-primary-strong" : "text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex flex-1 flex-col items-center justify-center text-xs text-muted-foreground"
                >
                  {item.label}
                  <span className="sr-only"> ({UNAVAILABLE_HINT})</span>
                </span>
              )}
            </li>
          ))}
          <li className="flex">
            <span
              aria-disabled="true"
              className="flex flex-1 flex-col items-center justify-center text-xs text-muted-foreground"
            >
              Thêm
              <span className="sr-only"> ({UNAVAILABLE_HINT})</span>
            </span>
          </li>
        </ul>
      </nav>
    </div>
  );
}
