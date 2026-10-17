"use server";

import { redirect } from "next/navigation";
import { emailSchema, otpSchema } from "@/modules/identity/email";
import { AUTH_PROVIDER } from "@/modules/identity/types";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getAccessDependencies } from "@/server/identity";

export type SignInState = {
  step: "email" | "code";
  email: string;
  message?: string;
  error?: string;
};

const CODE_SENT_MESSAGE =
  "Nếu email này đã được cấp quyền dùng Kiko, mã đăng nhập vừa được gửi tới hộp thư. Mã có thể mất một lúc để đến; nếu chưa thấy, đợi khoảng 60 giây rồi gửi lại.";

/**
 * Step 1: request an email OTP. Only pre-approved emails get a code, so the
 * form cannot create provider identities for arbitrary addresses. The response
 * is identical whether or not the email is approved, and also when Supabase
 * rejects the send (e.g. rate limit), so it cannot be used to enumerate emails.
 */
async function requestCode(formData: FormData): Promise<SignInState> {
  const raw = formData.get("email");
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { step: "email", email: typeof raw === "string" ? raw : "", error: "Email không hợp lệ." };
  }
  const email = parsed.data;

  const { repository } = await getAccessDependencies();
  if (await repository.isEmailAdmissible(AUTH_PROVIDER, email)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Approved emails may not have a provider identity yet. Kiko access is
      // still decided by admission after sign-in, never by this flag.
      options: { shouldCreateUser: true },
    });
    if (error) {
      // Logged without the email address or provider message details.
      console.warn("kiko.sign_in.otp_send_failed", { status: error.status ?? null, code: error.code ?? null });
    }
  }

  return { step: "code", email, message: CODE_SENT_MESSAGE };
}

/** Step 2: verify the code; on success the dashboard resolves Kiko admission. */
async function verifyCode(formData: FormData): Promise<SignInState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { step: "email", email: "", error: "Email không hợp lệ." };

  const token = otpSchema.safeParse(formData.get("token"));
  if (!token.success) {
    return { step: "code", email: email.data, error: "Mã đăng nhập gồm 6 đến 10 chữ số." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: token.data,
    type: "email",
  });
  if (error) {
    return { step: "code", email: email.data, error: "Mã không đúng hoặc đã hết hạn." };
  }

  redirect("/");
}

/** Single entry point for the two-step form; `intent` selects the step. */
export async function submitSignIn(previous: SignInState, formData: FormData): Promise<SignInState> {
  switch (formData.get("intent")) {
    case "request":
      return requestCode(formData);
    case "verify":
      return verifyCode(formData);
    case "restart":
      return { step: "email", email: previous.email };
    default:
      return { step: "email", email: "", error: "Yêu cầu không hợp lệ." };
  }
}
