"use client";

import { Check, Languages } from "lucide-react";
import { useRef } from "react";
import { en } from "@/modules/i18n/en";
import { getLanguage, type LanguageCode } from "@/modules/language/registry";

/** Language colour dots (DESIGN.md §3.1); decorative, the name carries meaning. */
const DOTS: Record<LanguageCode, string> = { ja: "bg-violet", zh: "bg-danger", en: "bg-info" };

/** Short badge on the button (decorative; the accessible name says the language). */
const BADGES: Record<LanguageCode, { text: string; lang: string; className: string }> = {
  zh: { text: "中", lang: "zh", className: "bg-danger-bg text-danger-text" },
  ja: { text: "日", lang: "ja", className: "bg-tag-bg text-tag-text" },
  en: { text: "EN", lang: "en", className: "bg-info-bg text-info-dark" },
};

/**
 * Header icon button that switches the learning language. Each option is a POST
 * form to a Server Action; the menu closes after a choice.
 */
export function LanguageSwitcher({
  current,
  options,
  action,
}: {
  current: LanguageCode;
  options: readonly LanguageCode[];
  action: (formData: FormData) => Promise<void>;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const currentLanguage = getLanguage(current);
  return (
    <details ref={menu} className="group relative">
      <summary
        aria-label={en.shell.learningLanguageButton(currentLanguage.label)}
        title={en.shell.learningLanguageButton(currentLanguage.label)}
        className="relative flex size-10 cursor-pointer list-none items-center justify-center rounded-full text-copy hover:bg-soft group-open:bg-soft [&::-webkit-details-marker]:hidden"
      >
        <Languages aria-hidden="true" size={22} strokeWidth={1.8} />
        <span
          aria-hidden="true"
          lang={BADGES[current].lang}
          className={`absolute -right-0.5 -bottom-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-[3px] text-[8.5px] leading-none font-extrabold ring-2 ring-white ${BADGES[current].className}`}
        >
          {BADGES[current].text}
        </span>
      </summary>
      <div className="absolute top-full right-0 z-50 mt-2 w-60 rounded-lg border border-line bg-surface p-1.5 shadow-elevated">
        <p className="px-3 pt-1.5 pb-2 text-[11px] font-bold tracking-wide text-muted uppercase">{en.shell.learningLanguage}</p>
        <ul className="flex flex-col gap-0.5">
          {options.map((code) => {
            const language = getLanguage(code);
            const selected = code === current;
            return (
              <li key={code}>
                <form action={action} onSubmit={() => menu.current?.removeAttribute("open")}>
                  <input type="hidden" name="language" value={code} />
                  <button
                    type="submit"
                    aria-pressed={selected}
                    className={`flex min-h-10 w-full items-center gap-2.5 rounded-sm px-3 text-left text-[14px] ${
                      selected ? "bg-grad-active font-bold text-accent-strong" : "font-semibold text-ink hover:bg-soft"
                    }`}
                  >
                    <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOTS[code]}`} />
                    <span className="flex-1">
                      {language.label}
                      {language.nativeName !== language.label ? (
                        <>
                          {" "}
                          <span lang={language.htmlLang} className="font-medium text-copy">
                            {language.nativeName}
                          </span>
                        </>
                      ) : null}
                    </span>
                    {selected ? <Check aria-hidden="true" size={16} strokeWidth={2.4} /> : null}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
