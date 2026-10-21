"use client";

import { RotateCw } from "lucide-react";
import { Logo, MeshBackground } from "@/components/brand";
import { buttonClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";

/**
 * Generic failure screen. Error details (which may include configuration or
 * database messages) are never rendered; Next.js logs them on the server.
 */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <MeshBackground />
      <div role="alert" className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-elevated md:p-8">
        <Logo />
        <h1 className="mt-6 text-title-lg font-extrabold">{en.error.title}</h1>
        <p className="mt-2 text-copy">{en.error.body}</p>
        <button type="button" onClick={() => retry()} className={`${buttonClass.primary} mt-6 w-full`}>
          <RotateCw aria-hidden="true" size={18} strokeWidth={2} />
          {en.error.retry}
        </button>
      </div>
    </main>
  );
}
