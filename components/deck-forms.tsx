"use client";

import { Check, Plus } from "lucide-react";
import { useActionState } from "react";
import type { DeckFormState } from "@/app/vocabulary/actions";
import { FieldError, buttonClass, inputClass, labelClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";

const copy = en.vocabulary;

export function CreateDeckForm({ action }: { action: (state: DeckFormState, formData: FormData) => Promise<DeckFormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3" noValidate>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="deck-title" className={labelClass}>
          {copy.deckTitle}
        </label>
        <input id="deck-title" name="title" aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "deck-title-error" : undefined} className={inputClass} />
        <FieldError id="deck-title-error" message={state.error} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
        {copy.createDeck}
      </button>
    </form>
  );
}

export function RenameDeckForm({
  action,
  title,
  version,
  deckId,
}: {
  action: (state: DeckFormState, formData: FormData) => Promise<DeckFormState>;
  title: string;
  version: number;
  deckId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2" noValidate>
      <input type="hidden" name="expectedVersion" value={version} />
      <label htmlFor={`deck-${deckId}`} className="sr-only">
        {copy.deckTitle}
      </label>
      <input id={`deck-${deckId}`} name="title" defaultValue={title} aria-invalid={state.error ? true : undefined} className={`${inputClass} min-h-10 max-w-xs flex-1`} />
      <button type="submit" disabled={pending} className={`${buttonClass.secondary} min-h-10`}>
        <Check aria-hidden="true" size={16} strokeWidth={2.2} />
        {copy.rename}
      </button>
      <FieldError id={`deck-${deckId}-error`} message={state.error} />
    </form>
  );
}
