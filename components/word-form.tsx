"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import type { WordFormState } from "@/app/vocabulary/actions";
import { Alert, Card, FieldError, buttonClass, helpClass, inputClass, labelClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";
import type { LanguageCode } from "@/modules/language/registry";
import { VOCABULARY_LIMITS } from "@/modules/vocabulary/input";
import type { ExampleInput } from "@/modules/vocabulary/types";

const copy = en.vocabulary;

export type WordFormDefaults = {
  surface: string;
  meaning: string;
  readings: string[];
  notes: string;
  usage: string;
  tags: string;
  starred: boolean;
  examples: ExampleInput[];
  deckIds: string[];
};

function asList(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/** Create/edit form for a word. Empty reading/example rows are ignored on the server. */
export function WordForm({
  action,
  defaults,
  language,
  hidden,
  decks,
  submitLabel,
}: {
  action: (state: WordFormState, formData: FormData) => Promise<WordFormState>;
  defaults: WordFormDefaults;
  language: LanguageCode;
  hidden: Record<string, string>;
  decks: readonly { id: string; title: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const echoed = state.values;
  const initialReadings = asList(echoed?.reading) ?? (defaults.readings.length ? defaults.readings : [""]);
  const [readingCount, setReadingCount] = useState(Math.max(1, initialReadings.length));
  const initialExamples: ExampleInput[] = echoed?.exampleText
    ? (asList(echoed.exampleText) ?? []).map((text, index) => ({
        text,
        reading: asList(echoed.exampleReading)?.[index] ?? null,
        translation: asList(echoed.exampleTranslation)?.[index] ?? null,
      }))
    : defaults.examples;
  const [exampleCount, setExampleCount] = useState(Math.max(1, initialExamples.length));
  const selectedDecks = new Set(asList(echoed?.deckId) ?? defaults.deckIds);
  const value = (name: keyof WordFormDefaults & string, fallback: string) =>
    typeof echoed?.[name] === "string" ? (echoed[name] as string) : fallback;
  const errors = state.errors;

  return (
    <Card className="md:p-6">
      <form action={formAction} className="flex flex-col gap-6" noValidate>
        {Object.entries(hidden).map(([name, hiddenValue]) => (
          <input key={name} type="hidden" name={name} value={hiddenValue} />
        ))}
        {errors.form ? (
          <Alert tone="error" title={en.lessonForm.saveFailed} role="alert">
            {errors.form}
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="surface" className={labelClass}>
              {copy.surface}
            </label>
            <input id="surface" name="surface" lang={language} defaultValue={value("surface", defaults.surface)} aria-invalid={errors.surface ? true : undefined} className={inputClass} />
            <FieldError id="surface-error" message={errors.surface} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="meaning" className={labelClass}>
              {copy.meaning}
            </label>
            <input id="meaning" name="meaning" defaultValue={value("meaning", defaults.meaning)} aria-invalid={errors.meaning ? true : undefined} className={inputClass} />
            <FieldError id="meaning-error" message={errors.meaning} />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>
            {copy.readings[language]} <span className="font-normal text-muted">{copy.optional}</span>
          </legend>
          <p className={helpClass}>{copy.readingHint[language]}</p>
          {Array.from({ length: readingCount }, (_, index) => (
            <input key={index} name="reading" aria-label={`${copy.readings[language]} ${index + 1}`} defaultValue={initialReadings[index] ?? ""} className={inputClass} />
          ))}
          {readingCount < VOCABULARY_LIMITS.readings ? (
            <button type="button" onClick={() => setReadingCount((count) => count + 1)} className={`${buttonClass.soft} self-start`}>
              <Plus aria-hidden="true" size={14} strokeWidth={2.2} />
              {copy.readings[language]}
            </button>
          ) : null}
          <FieldError id="readings-error" message={errors.readings} />
        </fieldset>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="usage" className={labelClass}>
              {copy.usage} <span className="font-normal text-muted">{copy.optional}</span>
            </label>
            <textarea id="usage" name="usage" rows={3} defaultValue={value("usage", defaults.usage)} className={`${inputClass} py-3`} />
            <FieldError id="usage-error" message={errors.usage} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className={labelClass}>
              {copy.notes} <span className="font-normal text-muted">{copy.optional}</span>
            </label>
            <textarea id="notes" name="notes" rows={3} defaultValue={value("notes", defaults.notes)} className={`${inputClass} py-3`} />
            <FieldError id="notes-error" message={errors.notes} />
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className={labelClass}>
            {copy.examples} <span className="font-normal text-muted">{copy.optional}</span>
          </legend>
          {Array.from({ length: exampleCount }, (_, index) => {
            const example = initialExamples[index];
            return (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-md border border-line p-3 md:grid-cols-3">
                <input name="exampleText" lang={language} aria-label={`${copy.exampleText} ${index + 1}`} placeholder={copy.exampleText} defaultValue={example?.text ?? ""} className={inputClass} />
                <input name="exampleReading" aria-label={`${copy.exampleReading} ${index + 1}`} placeholder={copy.exampleReading} defaultValue={example?.reading ?? ""} className={inputClass} />
                <input name="exampleTranslation" aria-label={`${copy.exampleTranslation} ${index + 1}`} placeholder={copy.exampleTranslation} defaultValue={example?.translation ?? ""} className={inputClass} />
              </div>
            );
          })}
          {exampleCount < VOCABULARY_LIMITS.examples ? (
            <button type="button" onClick={() => setExampleCount((count) => count + 1)} className={`${buttonClass.soft} self-start`}>
              <Plus aria-hidden="true" size={14} strokeWidth={2.2} />
              {copy.exampleText}
            </button>
          ) : null}
          <FieldError id="examples-error" message={errors.examples} />
        </fieldset>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="tags" className={labelClass}>
              {copy.tags} <span className="font-normal text-muted">{copy.optional}</span>
            </label>
            <input id="tags" name="tags" defaultValue={value("tags", defaults.tags)} aria-describedby="tags-help" className={inputClass} />
            <p id="tags-help" className={helpClass}>
              {en.lessonForm.topicsHelp(5)}
            </p>
            <FieldError id="tags-error" message={errors.tags} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>{copy.decks}</legend>
            {decks.length === 0 ? <p className={helpClass}>{copy.noDecks}</p> : null}
            <div className="flex flex-wrap gap-2">
              {decks.map((deck) => (
                <label key={deck.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-control px-3 text-[13px] font-semibold text-ink has-checked:border-accent has-checked:bg-grad-active">
                  <input type="checkbox" name="deckId" value={deck.id} defaultChecked={selectedDecks.has(deck.id)} className="size-4 accent-[#5a3bd6]" />
                  {deck.title}
                </label>
              ))}
            </div>
            <FieldError id="decks-error" message={errors.decks} />
          </fieldset>
        </div>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink">
          <input type="checkbox" name="starred" defaultChecked={echoed ? echoed.starred === "on" : defaults.starred} className="size-4 accent-[#5a3bd6]" />
          {copy.starred}
        </label>

        <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`}>
          <Save aria-hidden="true" size={18} strokeWidth={2} />
          {pending ? copy.saving : submitLabel}
        </button>
      </form>
    </Card>
  );
}

export function DeleteWordForm({
  action,
  version,
}: {
  action: (state: WordFormState, formData: FormData) => Promise<WordFormState>;
  version: number;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="expectedVersion" value={version} />
      {state.errors.form ? (
        <Alert tone="error" title={en.lesson.actionFailed} role="alert">
          {state.errors.form}
        </Alert>
      ) : null}
      <button type="submit" disabled={pending} className={`${buttonClass.danger} self-start`}>
        <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
        {pending ? copy.deleting : copy.deleteConfirm}
      </button>
    </form>
  );
}
