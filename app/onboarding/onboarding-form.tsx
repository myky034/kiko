"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Alert, FieldError, buttonClass, helpClass, inputClass, labelClass } from "@/components/ui";
import { LanguageName } from "@/components/lesson-parts";
import { en } from "@/modules/i18n/en";
import type { LanguageDefinition } from "@/modules/language/registry";
import { submitOnboarding, type OnboardingFormState } from "./actions";

const INITIAL_STATE: OnboardingFormState = { errors: {} };

export function OnboardingForm({
  languages,
  timezones,
  defaultTimezone,
}: {
  languages: readonly LanguageDefinition[];
  timezones: readonly string[];
  defaultTimezone: string;
}) {
  const [state, action, pending] = useActionState(submitOnboarding, INITIAL_STATE);
  const selected = new Set(state.values?.languages ?? []);
  const timezone = state.values?.timezone || defaultTimezone;

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {state.errors.form ? (
        <Alert tone="error" title={en.onboarding.saveFailed} role="alert">
          {state.errors.form}
        </Alert>
      ) : null}

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={state.errors.languages ? "languages-error" : "languages-help"}
      >
        <legend className={labelClass}>{en.onboarding.languagesLegend}</legend>
        <p id="languages-help" className={helpClass}>
          {en.onboarding.languagesHelp}
        </p>
        {languages.map((language) => (
          <label
            key={language.code}
            className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-control px-4 transition-colors has-checked:border-accent has-checked:bg-grad-active has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
          >
            <input
              type="checkbox"
              name="languages"
              value={language.code}
              defaultChecked={selected.has(language.code)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-control bg-surface text-transparent peer-checked:border-transparent peer-checked:bg-grad-cta peer-checked:text-white"
            >
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="font-semibold text-ink group-has-checked:text-accent-strong">
              <LanguageName language={language} nativeClassName="font-normal text-copy" />
            </span>
          </label>
        ))}
        <FieldError id="languages-error" message={state.errors.languages} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="timezone" className={labelClass}>
          {en.onboarding.timezoneLabel}
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={timezone}
          aria-invalid={state.errors.timezone ? true : undefined}
          aria-describedby={state.errors.timezone ? "timezone-help timezone-error" : "timezone-help"}
          className={inputClass}
        >
          {timezones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p id="timezone-help" className={helpClass}>
          {en.onboarding.timezoneHelp}
        </p>
        <FieldError id="timezone-error" message={state.errors.timezone} />
      </div>

      <button type="submit" className={buttonClass.primary} disabled={pending}>
        {pending ? en.form.saving : en.onboarding.submit}
      </button>
    </form>
  );
}
