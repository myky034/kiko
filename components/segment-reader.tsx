"use client";

import { Check, Plus, X } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { WordFormState } from "@/app/vocabulary/actions";
import { Alert, FieldError, buttonClass, helpClass, inputClass, labelClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";
import type { LanguageCode } from "@/modules/language/registry";
import { utf16ToCodePoint } from "@/modules/vocabulary/selection";

const copy = en.vocabulary;

type Segment = { position: number; text: string };
type SavedRange = { position: number; start: number; end: number };
type Similar = { id: string; surface: string; meaning: string; readings: string[] };
type Draft = { position: number; start: number | null; end: number | null; selected: string };

/** Splits a segment into plain and saved (underlined) runs, by code points. */
function runs(text: string, ranges: SavedRange[]): { text: string; saved: boolean }[] {
  const points = [...text];
  const marked = new Array<boolean>(points.length).fill(false);
  for (const range of ranges) for (let i = range.start; i < range.end && i < points.length; i += 1) marked[i] = true;
  const out: { text: string; saved: boolean }[] = [];
  points.forEach((point, index) => {
    const last = out.at(-1);
    if (last && last.saved === marked[index]) last.text += point;
    else out.push({ text: point, saved: marked[index] });
  });
  return out;
}

function SaveWordForm({
  lessonId,
  versionNo,
  language,
  draft,
  action,
  similarAction,
  onClose,
  onSaved,
}: {
  lessonId: string;
  versionNo: number;
  language: LanguageCode;
  draft: Draft;
  action: (state: WordFormState, formData: FormData) => Promise<WordFormState>;
  similarAction: (language: string, surface: string) => Promise<Similar[]>;
  onClose: () => void;
  onSaved: (surface: string) => void;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const [attachState, attachAction, attaching] = useActionState(action, { errors: {} });
  const [surface, setSurface] = useState(draft.selected);
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [requestId] = useState(() => crypto.randomUUID());
  const first = useRef<HTMLInputElement>(null);
  const id = useId();
  const hasOffsets = draft.start !== null && draft.end !== null;

  useEffect(() => first.current?.focus(), []);

  // Duplicate warning (never merges): look up similar active words while typing.
  useEffect(() => {
    const value = surface.trim();
    const timer = setTimeout(() => {
      if (!value) setSimilar([]);
      else similarAction(language, value).then(setSimilar, () => setSimilar([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [surface, language, similarAction]);

  useEffect(() => {
    const saved = state.saved ?? attachState.saved;
    if (saved) onSaved(saved.surface || surface);
  }, [state.saved, attachState.saved, onSaved, surface]);

  const selectionFields = (
    <>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="versionNo" value={versionNo} />
      <input type="hidden" name="position" value={draft.position} />
      {hasOffsets ? (
        <>
          <input type="hidden" name="start" value={draft.start!} />
          <input type="hidden" name="end" value={draft.end!} />
        </>
      ) : (
        <input type="hidden" name="phrase" value={surface} />
      )}
    </>
  );
  const errors = { ...attachState.errors, ...state.errors };

  return (
    <div className="mt-3 rounded-md border border-line bg-mist p-4" role="group" aria-labelledby={`${id}-title`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p id={`${id}-title`} className="text-supporting font-bold text-ink">
          {copy.saveFromLesson}
        </p>
        <button type="button" onClick={onClose} aria-label={copy.cancel} className={`${buttonClass.ghost} min-h-9 px-2`}>
          <X aria-hidden="true" size={16} strokeWidth={2.2} />
        </button>
      </div>

      {errors.form || errors.selection ? (
        <div className="mb-3">
          <Alert tone="error" title={en.lessonForm.saveFailed} role="alert">
            {errors.selection ?? errors.form}
          </Alert>
        </div>
      ) : null}

      {similar.length > 0 ? (
        <div className="mb-3 rounded-sm border border-warning-border bg-warning-bg p-3" role="status">
          <p className="text-supporting font-bold text-warning-dark">{copy.similarTitle}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {similar.map((word) => (
              <li key={word.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-supporting text-ink">
                  <span lang={language} className="font-bold">
                    {word.surface}
                  </span>
                  {word.readings[0] ? <span className="text-copy"> · {word.readings[0]}</span> : null} — {word.meaning}
                </span>
                <form action={attachAction}>
                  {selectionFields}
                  <input type="hidden" name="mode" value="existing" />
                  <input type="hidden" name="vocabularyId" value={word.id} />
                  <button type="submit" disabled={attaching} className={`${buttonClass.secondary} min-h-9 px-3`}>
                    {copy.similarAddHere}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2" noValidate>
        {selectionFields}
        <input type="hidden" name="mode" value="new" />
        <input type="hidden" name="clientRequestId" value={requestId} />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={`${id}-surface`} className={labelClass}>
            {copy.surface}
          </label>
          <input
            ref={first}
            id={`${id}-surface`}
            name="surface"
            lang={language}
            value={surface}
            onChange={(event) => setSurface(event.target.value)}
            aria-describedby={`${id}-surface-help`}
            aria-invalid={errors.surface || errors.selection ? true : undefined}
            className={inputClass}
          />
          <p id={`${id}-surface-help`} className={helpClass}>
            {hasOffsets ? `${copy.selected}: ${draft.selected}` : copy.selectHint}
          </p>
          <FieldError id={`${id}-surface-error`} message={errors.surface} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-reading`} className={labelClass}>
            {copy.readings[language]} <span className="font-normal text-muted">{copy.optional}</span>
          </label>
          <input id={`${id}-reading`} name="reading" placeholder={copy.readingHint[language]} className={inputClass} />
          <FieldError id={`${id}-reading-error`} message={errors.readings} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-meaning`} className={labelClass}>
            {copy.meaning}
          </label>
          <input id={`${id}-meaning`} name="meaning" required aria-invalid={errors.meaning ? true : undefined} className={inputClass} />
          <FieldError id={`${id}-meaning-error`} message={errors.meaning} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={`${id}-tags`} className={labelClass}>
            {copy.tags} <span className="font-normal text-muted">{copy.optional}</span>
          </label>
          <input id={`${id}-tags`} name="tags" className={inputClass} />
          <FieldError id={`${id}-tags-error`} message={errors.tags} />
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            <Check aria-hidden="true" size={18} strokeWidth={2.2} />
            {pending ? copy.saving : similar.length > 0 ? copy.createAnyway : copy.save}
          </button>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            {copy.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Lesson text with saved words underlined. Learners save a word by selecting
 * text in a sentence (mouse/touch) or with the sentence's "Add word" button
 * (keyboard). Offsets are sent in code points; the server derives the text.
 */
export function SegmentReader({
  lessonId,
  versionNo,
  language,
  htmlLang,
  segments,
  saved,
  action,
  similarAction,
}: {
  lessonId: string;
  versionNo: number;
  language: LanguageCode;
  htmlLang: string;
  segments: Segment[];
  saved: SavedRange[];
  action: (state: WordFormState, formData: FormData) => Promise<WordFormState>;
  similarAction: (language: string, surface: string) => Promise<Similar[]>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function captureSelection(segment: Segment, element: HTMLElement) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return;
    const before = document.createRange();
    before.selectNodeContents(element);
    before.setEnd(range.startContainer, range.startOffset);
    const startUnits = before.toString().length;
    const endUnits = startUnits + range.toString().length;
    setNotice(null);
    setDraft({
      position: segment.position,
      start: utf16ToCodePoint(segment.text, startUnits),
      end: utf16ToCodePoint(segment.text, endUnits),
      selected: range.toString().trim(),
    });
  }

  if (segments.length === 0) return <p className="text-muted">{en.lesson.noSegments}</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-muted">
        {copy.selectHint} {copy.savedInLesson}
      </p>
      {notice ? (
        <p role="status" className="text-supporting font-semibold text-success-dark">
          {notice}
        </p>
      ) : null}
      <ol className="flex flex-col divide-y divide-divider">
        {segments.map((segment) => {
          const ranges = saved.filter((range) => range.position === segment.position);
          const open = draft?.position === segment.position;
          return (
            <li key={segment.position} className="group py-3 first:pt-0 last:pb-0">
              <div className="flex gap-4">
                <span aria-hidden="true" className="num w-6 shrink-0 pt-2 text-right text-caption font-semibold text-muted">
                  {segment.position + 1}
                </span>
                <p
                  lang={htmlLang}
                  className="min-w-0 flex-1 text-transcript whitespace-pre-wrap"
                  onMouseUp={(event) => captureSelection(segment, event.currentTarget)}
                  onTouchEnd={(event) => captureSelection(segment, event.currentTarget)}
                >
                  {runs(segment.text, ranges).map((run, index) =>
                    run.saved ? (
                      <span key={index} className="underline decoration-accent decoration-2 underline-offset-[6px]">
                        {run.text}
                      </span>
                    ) : (
                      <span key={index}>{run.text}</span>
                    ),
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null);
                    setDraft({ position: segment.position, start: null, end: null, selected: "" });
                  }}
                  aria-label={`${copy.addWord}: ${en.lesson.content} ${segment.position + 1}`}
                  className={`${buttonClass.ghost} min-h-9 shrink-0 self-start px-2 text-accent-strong opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100`}
                >
                  <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
                  <span className="hidden sm:inline">{copy.addWord}</span>
                </button>
              </div>
              {open && draft ? (
                <SaveWordForm
                  key={`${draft.position}:${draft.start}:${draft.end}`}
                  lessonId={lessonId}
                  versionNo={versionNo}
                  language={language}
                  draft={draft}
                  action={action}
                  similarAction={similarAction}
                  onClose={() => setDraft(null)}
                  onSaved={(surface) => {
                    setDraft(null);
                    setNotice(copy.saved(surface));
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
