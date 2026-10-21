"use client";

import { useActionState } from "react";
import type { LessonFormState } from "@/app/lessons/actions";
import { Trash2 } from "lucide-react";
import { Alert, buttonClass, inputClass, labelClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";

export function DeleteLessonForm({
  action,
  version,
}: {
  action: (state: LessonFormState, formData: FormData) => Promise<LessonFormState>;
  version: number;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="expectedVersion" value={version} />
      {state.errors.form ? (
        <Alert tone="error" title={en.deleteLesson.notDeleted} role="alert">
          {state.errors.form}
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmTitle" className={labelClass}>
          {en.deleteLesson.confirmLabel}
        </label>
        <input id="confirmTitle" name="confirmTitle" autoComplete="off" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={`${buttonClass.danger} self-start`}>
        <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
        {pending ? en.deleteLesson.deleting : en.deleteLesson.submit}
      </button>
    </form>
  );
}
