import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ChevronDown,
  Copy,
  GraduationCap,
  House,
  Layers,
  LibraryBig,
  LogOut,
  Mic,
  Search,
  Settings,
  Sprout,
  User,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, MeshBackground } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { en } from "@/modules/i18n/en";
import type { AccountSummary } from "@/modules/identity/display";
import type { LanguageCode } from "@/modules/language/registry";

export type ShellLearning = {
  current: LanguageCode;
  options: readonly LanguageCode[];
  /** Server Action that switches the learning language. */
  action: (formData: FormData) => Promise<void>;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only destinations whose route exists are rendered as links. */
  available: boolean;
};

const nav = en.shell.nav;

/** Sidebar destinations as drawn in the Hi-fi (DEC-033); unbuilt ones are not links. */
export const LEARNING_NAV: readonly NavItem[] = [
  { label: nav.home, href: "/", icon: House, available: true },
  { label: nav.library, href: "/library", icon: BookOpen, available: true },
  { label: nav.myLearning, href: "/my-learning", icon: GraduationCap, available: false },
  { label: nav.vocabulary, href: "/vocabulary", icon: Layers, available: true },
  { label: nav.flashcards, href: "/flashcards", icon: Copy, available: false },
  { label: nav.speaking, href: "/speaking", icon: Mic, available: false },
  { label: nav.profile, href: "/profile", icon: User, available: false },
  { label: nav.settings, href: "/settings", icon: Settings, available: false },
];

/** Mobile bottom bar (Hi-fi): Home, Library, My Learning, Profile. */
const MOBILE_NAV: readonly NavItem[] = [
  { label: nav.home, href: "/", icon: House, available: true },
  { label: nav.library, href: "/library", icon: LibraryBig, available: true },
  { label: nav.myLearning, href: "/my-learning", icon: GraduationCap, available: false },
  { label: nav.profile, href: "/profile", icon: User, available: false },
];

function NavEntry({ item, current }: { item: NavItem; current: boolean }) {
  const Icon = item.icon;
  const base = "flex h-10 items-center gap-[7px] rounded-[12px] pr-3 pl-[9.5px] text-[14px]";

  if (!item.available) {
    return (
      <span aria-disabled="true" title={en.home.comingSoon} className={`${base} cursor-default font-medium text-copy`}>
        <Icon aria-hidden="true" size={22} strokeWidth={1.8} className="text-muted" />
        <span>{item.label}</span>
        <span className="sr-only"> ({en.shell.notYet})</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`${base} ${current ? "bg-grad-active font-bold text-accent-strong" : "font-medium text-copy hover:bg-soft"}`}
    >
      <Icon aria-hidden="true" size={22} strokeWidth={current ? 1.9 : 1.8} className={current ? "" : "text-muted"} />
      <span>{item.label}</span>
    </Link>
  );
}

/** Header search: no backend yet (FR23), so it is drawn disabled and labelled on every page. */
function HeaderSearch() {
  return (
    <label className="flex h-[38px] max-w-[488px] items-center gap-3 rounded-[12px] border border-line bg-surface px-3">
      <Search aria-hidden="true" size={18} strokeWidth={2} className="text-muted" />
      <span className="sr-only">{en.home.searchLabel}</span>
      <input
        type="search"
        disabled
        placeholder={en.home.searchPlaceholder}
        className="num min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted disabled:cursor-default"
      />
    </label>
  );
}

/** Avatar with the email initial; the gradient carries white text at ≥ 4.52:1. */
function Avatar({ initial, size = "md" }: { initial: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-10 text-[18px]" : "size-8 text-[15px]";
  return (
    <span
      aria-hidden="true"
      className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-grad-cta font-bold text-white ring-1 ring-white/60`}
    >
      {initial}
    </span>
  );
}

/** Notifications have no source yet: the bell is shown but disabled and never shows an unread dot. */
function NotificationsBell() {
  return (
    <button
      type="button"
      disabled
      aria-label={en.shell.notifications}
      className="flex size-10 items-center justify-center rounded-full text-copy disabled:cursor-default"
    >
      <Bell aria-hidden="true" size={22} strokeWidth={1.8} />
    </button>
  );
}

/** Account menu (native <details>): the only place Sign out lives, on every page. */
function AccountMenu({
  account,
  signOutAction,
  compact,
}: {
  account: AccountSummary;
  signOutAction?: () => Promise<void>;
  compact?: boolean;
}) {
  return (
    <details className="group relative">
      <summary
        aria-label={en.shell.accountMenu(account.name)}
        className="flex cursor-pointer list-none items-center gap-2.5 rounded-full p-0.5 [&::-webkit-details-marker]:hidden"
      >
        <Avatar initial={account.initial} size={compact ? "lg" : "md"} />
        {compact ? null : (
          <>
            <span className="max-w-[160px] truncate text-[13px] font-semibold text-ink" title={account.name}>
              {account.name}
            </span>
            <ChevronDown aria-hidden="true" size={14} strokeWidth={2.2} className="text-muted transition-transform group-open:rotate-180" />
          </>
        )}
      </summary>
      {signOutAction ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-48 rounded-lg border border-line bg-surface p-1.5 shadow-elevated">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-10 w-full items-center gap-2.5 rounded-sm px-3 text-[14px] font-semibold text-ink hover:bg-soft"
            >
              <LogOut aria-hidden="true" size={18} strokeWidth={1.9} className="text-muted" />
              {en.shell.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </details>
  );
}

export function AppShell({
  children,
  currentPath,
  signOutAction,
  account = { initial: "K", name: en.shell.roles.LEARNER, roleLabel: en.shell.roles.LEARNER },
  learning,
}: {
  children: ReactNode;
  currentPath: string;
  /** Server Action that ends the session; rendered as a POST form. */
  signOutAction?: () => Promise<void>;
  account?: AccountSummary;
  /** Learning-language switcher next to the bell (learners only). */
  learning?: ShellLearning;
}) {
  const switcher = learning ? (
    <LanguageSwitcher current={learning.current} options={learning.options} action={learning.action} />
  ) : null;
  return (
    <div className="min-h-dvh bg-surface md:bg-transparent">
      <MeshBackground />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2"
      >
        {en.shell.skipToContent}
      </a>

      {/*
        Frame (Hi-fi lesson workspace, DEC-034): full-height sidebar flush to the left edge,
        content directly on the mesh. Text on the mesh uses copy, not muted (contrast).
      */}
      {/* Fixed, not sticky: the sidebar stays put while the page scrolls; content is offset by its width. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[186px] flex-col overflow-y-auto border-r border-line bg-white/72 px-[13px] pt-4 pb-[21px] backdrop-blur-sm md:flex">
        <Link href="/" className="mb-[22px] self-start rounded-sm px-2">
          <Logo />
        </Link>
        <nav aria-label={en.shell.learningNav} className="flex-1">
          <ul className="flex flex-col gap-[4px]">
              {LEARNING_NAV.map((item) => (
                <li key={item.href}>
                  <NavEntry item={item} current={item.href === currentPath} />
                </li>
              ))}
            </ul>
          </nav>
        <div className="-mr-[5px] flex h-[61px] items-center gap-[7px] rounded-[14px] bg-grad-keep pl-[10px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.8)]">
          <Sprout aria-hidden="true" size={24} strokeWidth={1.7} className="shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-ink">{en.shell.keepLearningTitle}</p>
            <p className="text-[9.3px] whitespace-nowrap text-copy">{en.shell.keepLearningBody}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col md:pl-[186px]">
        {/* Mobile header (Hi-fi): logo, bell, avatar menu. */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
          <Link href="/" className="rounded-sm">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {switcher}
            <NotificationsBell />
            <AccountMenu account={account} signOutAction={signOutAction} compact />
          </div>
        </header>

        {/* Desktop top bar, the same on every page (DEC-045): search left; language, bell and account right. */}
        <div className="hidden h-[65px] shrink-0 items-center justify-between gap-4 px-[14px] md:flex">
          <div className="min-w-0 flex-1">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-3 pr-1">
            {switcher}
            <NotificationsBell />
            <AccountMenu account={account} signOutAction={signOutAction} />
          </div>
        </div>

        <main
          id="main"
          className="min-w-0 flex-1 px-4 pt-4 pb-[calc(var(--shell-bottom-nav-height)+1.5rem)] md:px-[14px] md:pt-0 md:pb-[14px]"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label={en.shell.quickNav}
        className="fixed inset-x-0 bottom-0 z-40 h-[calc(var(--shell-bottom-nav-height)+env(safe-area-inset-bottom))] border-t border-line bg-white/94 pb-[env(safe-area-inset-bottom)] shadow-nav md:hidden"
      >
        <ul className="grid h-(--shell-bottom-nav-height) grid-cols-4">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const current = item.href === currentPath;
            const inner = (
              <>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full ${current ? "bg-grad-active" : ""}`}>
                  <Icon aria-hidden="true" size={20} strokeWidth={current ? 2 : 1.8} />
                </span>
                {item.label}
              </>
            );
            return (
              <li key={item.href} className="flex">
                {item.available ? (
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                      current ? "font-bold text-accent-strong" : "font-medium text-copy"
                    }`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-copy"
                  >
                    {inner}
                    <span className="sr-only"> ({en.shell.notYet})</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
