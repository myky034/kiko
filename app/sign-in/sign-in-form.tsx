"use client";

import { useActionState } from "react";
import { Alert, FieldError, buttonClass, inputClass } from "@/components/ui";
import { submitSignIn, type SignInState } from "./actions";

const INITIAL_STATE: SignInState = { step: "email", email: "" };

export function SignInForm() {
  const [state, action, pending] = useActionState(submitSignIn, INITIAL_STATE);

  if (state.step === "email") {
    return (
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="intent" value="request" />
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "email-help email-error" : "email-help"}
            className={inputClass}
          />
          <p id="email-help" className="text-supporting text-muted-foreground">
            Kiko gửi mã đăng nhập qua email. Chỉ email đã được cấp quyền mới dùng được Kiko.
          </p>
          <FieldError id="email-error" message={state.error} />
        </div>
        <button type="submit" className={buttonClass.primary} disabled={pending}>
          {pending ? "Đang gửi mã…" : "Gửi mã đăng nhập"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {state.message ? (
        <Alert tone="info" title="Kiểm tra hộp thư" role="status">
          {state.message}
        </Alert>
      ) : null}
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <p className="text-supporting text-muted-foreground">
          Mã gửi tới <span className="font-medium text-foreground">{state.email}</span>
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="token" className="font-medium">
            Mã đăng nhập
          </label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            required
            autoFocus
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "token-error" : undefined}
            className={`${inputClass} tracking-[0.3em]`}
          />
          <FieldError id="token-error" message={state.error} />
        </div>
        <button type="submit" className={buttonClass.primary} disabled={pending}>
          {pending ? "Đang kiểm tra…" : "Đăng nhập"}
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="intent" value="restart" />
        <button type="submit" className={`${buttonClass.ghost} w-full`} disabled={pending}>
          Dùng email khác hoặc gửi lại mã
        </button>
      </form>
    </div>
  );
}
