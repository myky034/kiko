import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { Alert } from "@/components/ui";
import { signInErrorMessage } from "@/modules/identity/redirect";
import { getAccess } from "@/server/identity";
import { signInWithGoogle } from "./actions";
import { GoogleSubmitButton } from "./submit-button";

export const metadata: Metadata = { title: "Đăng nhập · Kiko" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const access = await getAccess();
  if (access.status === "active") redirect("/");
  if (access.status === "denied") redirect("/access-denied");

  const { error } = await searchParams;
  // Only known error codes are shown; arbitrary query text is never rendered.
  const message = signInErrorMessage(Array.isArray(error) ? error[0] : error);

  return (
    <AuthLayout title="Đăng nhập" description="Không gian học tiếng Trung, tiếng Nhật và tiếng Anh của bạn.">
      <div className="flex flex-col gap-4">
        {message ? (
          <Alert tone="error" title="Không đăng nhập được" role="alert">
            {message}
          </Alert>
        ) : null}
        <form action={signInWithGoogle}>
          <GoogleSubmitButton />
        </form>
        <p className="text-supporting text-muted-foreground">
          Chỉ tài khoản Google đã được cấp quyền mới dùng được Kiko. Đăng nhập Google thành công chưa có nghĩa là có
          quyền truy cập.
        </p>
      </div>
    </AuthLayout>
  );
}
