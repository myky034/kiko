import type { ReactNode } from "react";

/** Shared Tailwind class recipes built only from design tokens (no component library). */

export const buttonClass = {
  primary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-strong px-5 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-strong-hover disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 font-medium text-foreground transition-colors duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-supporting font-medium text-foreground transition-colors duration-150 hover:bg-muted",
} as const;

export const inputClass =
  "min-h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-body text-foreground aria-[invalid=true]:border-destructive";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6 ${className}`}>
      {children}
    </div>
  );
}

/** Persistent inline message; meaning is carried by text, not color alone. */
export function Alert({
  tone,
  title,
  children,
  role,
}: {
  tone: "info" | "error" | "warning";
  title: string;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  const tones = {
    info: "border-primary/30 bg-primary-soft",
    error: "border-destructive/40 bg-surface",
    warning: "border-warning/40 bg-accent-yellow",
  } as const;
  const titleTones = {
    info: "text-primary-strong",
    error: "text-destructive",
    warning: "text-warning-strong",
  } as const;
  return (
    <div role={role} className={`rounded-lg border px-4 py-3 text-supporting ${tones[tone]}`}>
      <p className={`font-semibold ${titleTones[tone]}`}>{title}</p>
      {children ? <div className="mt-1 text-foreground">{children}</div> : null}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-supporting font-medium text-destructive">
      {message}
    </p>
  );
}
