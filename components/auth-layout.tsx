import type { ReactNode } from "react";

/** Centered single-card layout for sign-in, access denied and onboarding. */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-12 md:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card md:p-8">
        <p className="text-xl font-semibold tracking-tight text-primary-strong">Kiko</p>
        <h1 className="mt-6 text-page-title font-bold">{title}</h1>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
