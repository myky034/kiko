import { BookOpen, Layers, Mic, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Logo, MeshBackground } from "@/components/brand";
import { IconTile, type Tone } from "@/components/ui";
import { en } from "@/modules/i18n/en";

const FEATURE_ICONS = [
  { icon: BookOpen, tone: "sky" },
  { icon: Layers, tone: "violet" },
  { icon: Mic, tone: "coral" },
  { icon: ShieldCheck, tone: "amber" },
] as const satisfies readonly { icon: typeof BookOpen; tone: Tone }[];

/** Brand panel (desktop): headline, pitch and the product's real scope (DEC-030). */
function BrandPanel() {
  const copy = en.signIn;
  return (
    <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#cdeafe_0%,#e9e4ff_55%,#fde2e4_100%)] px-12 py-12 lg:flex lg:flex-col">
      <Logo size="lg" />
      <div className="mt-16 flex max-w-md flex-col gap-5">
        <p className="text-[3.25rem] leading-[1.05] font-extrabold tracking-tight text-ink">
          {copy.headlineStart} {copy.headlineMiddle} <span className="text-grad-cta">{copy.headlineEnd}</span>
        </p>
        <p className="text-title leading-relaxed text-copy">{copy.pitch}</p>
      </div>
      <ul className="mt-10 flex max-w-md flex-col gap-5">
        {copy.features.map((feature, index) => (
          <li key={feature.title} className="flex items-center gap-4">
            <IconTile icon={FEATURE_ICONS[index].icon} tone={FEATURE_ICONS[index].tone} size="lg" />
            <div>
              <p className="font-bold text-ink">{feature.title}</p>
              <p className="text-supporting text-copy">{feature.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {/* Decorative hills and petals. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-48">
        <div className="absolute -bottom-24 -left-16 h-56 w-md rounded-[50%] bg-[linear-gradient(120deg,rgba(125,211,252,.55),rgba(167,139,250,.45))]" />
        <div className="absolute -right-20 -bottom-28 h-60 w-104 rounded-[50%] bg-[linear-gradient(120deg,rgba(196,181,253,.5),rgba(252,165,165,.45))]" />
        <div className="absolute right-24 bottom-24 h-24 w-12 rotate-35 rounded-[60%_60%_60%_60%/80%_80%_40%_40%] bg-[linear-gradient(180deg,#fda4af,#c4b5fd)] opacity-80" />
        <div className="absolute right-36 bottom-28 size-16 rounded-full bg-[linear-gradient(135deg,#fcd34d,#fca5a5)] opacity-80" />
      </div>
    </section>
  );
}

/** Two-panel layout for sign-in, access denied and onboarding; single column on mobile. */
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
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <MeshBackground />
      <BrandPanel />
      <main className="flex flex-col items-center justify-start px-4 py-8 md:justify-center md:py-12">
        <div className="mb-6 flex w-full max-w-md flex-col gap-4 lg:hidden">
          <Logo size="lg" />
          <p className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink">
            {en.signIn.headlineStart} {en.signIn.headlineMiddle}{" "}
            <span className="text-grad-cta">{en.signIn.headlineEnd}</span>
          </p>
        </div>
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-elevated md:p-8">
          <h1 className="text-title-lg font-extrabold tracking-tight md:text-display">{title}</h1>
          {description ? <p className="mt-2 text-copy">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
