"use client";

import { useActionState } from "react";
import type { LessonFormState } from "@/app/lessons/actions";
import { Alert, buttonClass, inputClass } from "@/components/ui";

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
        <Alert tone="error" title="Bài chưa bị xóa" role="alert">
          {state.errors.form}
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmTitle" className="font-semibold">
          Nhập lại đúng tiêu đề bài để xác nhận
        </label>
        <input id="confirmTitle" name="confirmTitle" autoComplete="off" className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass.secondary} border-destructive text-destructive hover:bg-surface`}
      >
        {pending ? "Đang xóa…" : "Xóa vĩnh viễn"}
      </button>
    </form>
  );
}
