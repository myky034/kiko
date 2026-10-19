"use client";

import { useActionState } from "react";
import { Alert, FieldError, buttonClass, inputClass } from "@/components/ui";
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
        <Alert tone="error" title="Không lưu được" role="alert">
          {state.errors.form}
        </Alert>
      ) : null}

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={state.errors.languages ? "languages-error" : "languages-help"}
      >
        <legend className="font-semibold">Ngôn ngữ bạn muốn học</legend>
        <p id="languages-help" className="text-supporting text-muted-foreground">
          Chọn một hoặc nhiều ngôn ngữ. Bạn có thể đổi lại sau.
        </p>
        {languages.map((language) => (
          <label
            key={language.code}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border-strong px-4 has-checked:border-primary-strong has-checked:bg-primary-soft"
          >
            <input
              type="checkbox"
              name="languages"
              value={language.code}
              defaultChecked={selected.has(language.code)}
              className="size-5 accent-primary-strong"
            />
            <span className="font-medium">{language.labelVi}</span>
            <span lang={language.htmlLang} className="text-muted-foreground">
              {language.nativeName}
            </span>
          </label>
        ))}
        <FieldError id="languages-error" message={state.errors.languages} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="timezone" className="font-semibold">
          Múi giờ
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
        <p id="timezone-help" className="text-supporting text-muted-foreground">
          Dùng để chia ngày học và lịch ôn tập theo giờ địa phương của bạn.
        </p>
        <FieldError id="timezone-error" message={state.errors.timezone} />
      </div>

      <button type="submit" className={buttonClass.primary} disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu và tiếp tục"}
      </button>
    </form>
  );
}
