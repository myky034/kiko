"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui";

export function GoogleSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${buttonClass.primary} w-full`} disabled={pending}>
      {pending ? "Đang chuyển tới Google…" : "Đăng nhập bằng Google"}
    </button>
  );
}
