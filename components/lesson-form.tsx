"use client";

import { useActionState, useMemo, useState } from "react";
import type { LessonFormState } from "@/app/lessons/actions";
import { Save } from "lucide-react";
import { Alert, Card, FieldError, buttonClass, helpClass, inputClass, labelClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";
import { METADATA_LIMITS, describeSegmentationIssue } from "@/modules/content/lesson-input";
import { CONTENT_LIMITS, segmentSource } from "@/modules/content/segmentation";
import type { LanguageDefinition } from "@/modules/language/registry";

const copy = en.lessonForm;

export type LessonFormDefaults = {
  title: string;
  languageCode: string;
  tags: string;
  levelLabel: string;
  sourceNote: string;
  content: string;
};

export function LessonForm({
  action,
  defaults,
  languages,
  hidden,
  languageLocked,
  submitLabel,
  contentHint,
}: {
  action: (state: LessonFormState, formData: FormData) => Promise<LessonFormState>;
  defaults: LessonFormDefaults;
  languages: readonly LanguageDefinition[];
  /** e.g. clientRequestId or expectedVersion. */
  hidden: Record<string, string>;
  languageLocked: boolean;
  submitLabel: string;
  contentHint?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const values = { ...defaults, ...state.values };
  const [content, setContent] = useState(values.content);
  // Same rule and counting as the server (DEC-021, DEC-022).
  const stats = useMemo(() => segmentSource(content), [content]);
  const errors = state.errors;

  return (
    <Card className="md:p-6">
      <form action={formAction} className="flex flex-col gap-6" noValidate>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {errors.form ? (
          <Alert tone="error" title={copy.saveFailed} role="alert">
            {errors.form}
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className={labelClass}>
            {copy.title}
          </label>
          <input
            id="title"
            name="title"
            defaultValue={values.title}
            required
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={inputClass}
          />
          <FieldError id="title-error" message={errors.title} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="languageCode" className={labelClass}>
            {copy.language}
          </label>
          {languageLocked ? <input type="hidden" name="languageCode" value={values.languageCode} /> : null}
          <select
            id="languageCode"
            name={languageLocked ? undefined : "languageCode"}
            defaultValue={values.languageCode}
            disabled={languageLocked}
            aria-describedby="language-help"
            className={inputClass}
          >
            <option value="">{copy.chooseLanguage}</option>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label === language.nativeName ? language.label : `${language.label} — ${language.nativeName}`}
              </option>
            ))}
          </select>
          <p id="language-help" className={helpClass}>
            {languageLocked ? copy.languageLocked : copy.languageOpen}
          </p>
          <FieldError id="languageCode-error" message={errors.languageCode} />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="tags" className={labelClass}>
              {copy.topics} <span className="font-normal text-muted">{en.form.optional}</span>
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={values.tags}
              aria-describedby={errors.tags ? "tags-help tags-error" : "tags-help"}
              className={inputClass}
            />
            <p id="tags-help" className={helpClass}>
              {copy.topicsHelp(METADATA_LIMITS.tags)}
            </p>
            <FieldError id="tags-error" message={errors.tags} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="levelLabel" className={labelClass}>
              {copy.level} <span className="font-normal text-muted">{en.form.optional}</span>
            </label>
            <input
              id="levelLabel"
              name="levelLabel"
              defaultValue={values.levelLabel}
              aria-describedby={errors.levelLabel ? "level-help levelLabel-error" : "level-help"}
              className={inputClass}
            />
            <p id="level-help" className={helpClass}>
              {copy.levelHelp}
            </p>
            <FieldError id="levelLabel-error" message={errors.levelLabel} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="sourceNote" className={labelClass}>
            {copy.sourceNote} <span className="font-normal text-muted">{en.form.optional}</span>
          </label>
          <textarea
            id="sourceNote"
            name="sourceNote"
            rows={2}
            defaultValue={values.sourceNote}
            aria-invalid={errors.sourceNote ? true : undefined}
            className={`${inputClass} py-3`}
          />
          <FieldError id="sourceNote-error" message={errors.sourceNote} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="content" className={labelClass}>
            {copy.content}
          </label>
          <p id="content-help" className={helpClass}>
            {contentHint ?? copy.contentHelp}
          </p>
          <textarea
            id="content"
            name="content"
            rows={14}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            aria-invalid={errors.content || stats.issues.length > 0 ? true : undefined}
            aria-describedby="content-help content-stats"
            className={`${inputClass} py-3 font-[inherit] leading-relaxed`}
            lang={values.languageCode || undefined}
          />
          <p id="content-stats" aria-live="polite" className="num text-supporting text-muted">
            {copy.stats(stats.segments.length, stats.sourceLength, CONTENT_LIMITS.sourceText)}
          </p>
          {stats.issues.length > 0 ? (
            <Alert tone="warning" title={copy.overLimit}>
              <ul className="list-disc pl-5">
                {stats.issues.slice(0, 10).map((issue) => (
                  <li key={JSON.stringify(issue)}>{describeSegmentationIssue(issue)}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <FieldError id="content-error" message={errors.content} />
          {errors.contentLines?.length ? (
            <ul className="list-disc pl-5 text-supporting text-danger-text">
              {errors.contentLines.slice(0, 20).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <button type="submit" className={`${buttonClass.primary} self-start`} disabled={pending}>
          <Save aria-hidden="true" size={18} strokeWidth={2} />
          {pending ? en.form.saving : submitLabel}
        </button>
      </form>
    </Card>
  );
}
