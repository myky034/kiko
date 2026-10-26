import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Shared Tailwind class recipes built only from design tokens (no component library). */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-sm font-bold transition duration-150 ease-out active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";

export const buttonClass = {
  /* White text on the CTA gradient: ≥ 4.52:1 at both stops (DEC-031). */
  primary: `${buttonBase} min-h-12 bg-grad-cta px-5 text-supporting text-white shadow-cta hover:brightness-95 active:shadow-none`,
  secondary: `${buttonBase} min-h-11 border border-control bg-surface px-4 text-supporting text-ink hover:-translate-y-px hover:bg-mist`,
  soft: `${buttonBase} min-h-10 rounded-full bg-tag-bg px-4 text-supporting text-accent hover:brightness-97`,
  ghost: `${buttonBase} min-h-11 px-3 text-supporting font-semibold text-copy hover:bg-soft`,
  danger: `${buttonBase} min-h-11 border border-danger-text bg-surface px-4 text-supporting text-danger-text hover:bg-danger-bg`,
} as const;

/* accent-strong, not accent: links also sit on the mesh glows, where accent drops to 3.5:1. */
export const linkClass =
  "inline-flex items-center gap-1 rounded-xs text-supporting font-bold text-accent-strong hover:underline";

export const inputClass =
  "min-h-12 w-full rounded-sm border border-control bg-surface px-4 text-body text-ink placeholder:text-muted aria-[invalid=true]:border-danger-text";

export const labelClass = "text-supporting font-bold text-ink";

export const helpClass = "text-supporting text-muted";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-surface p-4 shadow-card md:p-5 ${className}`}>{children}</div>
  );
}

/** Page title block on the mesh background: subtitle uses copy, not muted (contrast on the mesh). */
export function PageHeader({
  title,
  subtitle,
  action,
  lang,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  lang?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 lang={lang} className="text-[1.375rem] leading-tight font-extrabold tracking-tight md:text-display">
          {title}
        </h1>
        {subtitle ? <p className="text-copy">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

/** Card/section title with optional subtitle and trailing action. */
export function SectionHeader({ id, title, subtitle, action }: { id?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-title font-extrabold">
          {title}
        </h2>
        {subtitle ? <p className="text-supporting text-copy">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export type Tone = "sky" | "violet" | "coral" | "amber";

const TILE_TONES: Record<Tone, string> = {
  sky: "tile-sky",
  violet: "tile-violet",
  coral: "tile-coral",
  amber: "tile-amber",
};

/** Square tone tile holding a decorative Lucide icon. */
export function IconTile({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "size-9 rounded-xs", md: "size-11 rounded-sm", lg: "size-14 rounded-md" }[size];
  const glyph = { sm: 18, md: 22, lg: 26 }[size];
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${box} ${TILE_TONES[tone]}`}>
      <Icon size={glyph} strokeWidth={1.8} />
    </span>
  );
}

/** Persistent inline message; meaning is carried by the title text and icon, not colour alone. */
export function Alert({
  tone,
  title,
  children,
  role,
}: {
  tone: "info" | "error" | "warning" | "success";
  title: string;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  const tones = {
    info: { box: "border-info-border bg-info-bg", title: "text-info-dark", icon: Info },
    error: { box: "border-danger-border bg-danger-bg", title: "text-danger-text", icon: CircleAlert },
    warning: { box: "border-warning-border bg-warning-bg", title: "text-warning-dark", icon: TriangleAlert },
    success: { box: "border-success-border bg-success-bg", title: "text-success-dark", icon: CircleCheck },
  } as const;
  const { box, title: titleTone, icon: Icon } = tones[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-md border px-4 py-3 text-supporting ${box}`}>
      <Icon aria-hidden="true" size={18} strokeWidth={2} className={`mt-0.5 shrink-0 ${titleTone}`} />
      <div className="min-w-0">
        <p className={`font-bold ${titleTone}`}>{title}</p>
        {children ? <div className="mt-1 text-ink">{children}</div> : null}
      </div>
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-supporting font-semibold text-danger-text">
      {message}
    </p>
  );
}

/** "Back to …" link at the top of a page's content (the top bar is the same on every page, DEC-045). */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 self-start rounded-xs text-[14px] font-medium text-copy hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
      {label}
    </Link>
  );
}
