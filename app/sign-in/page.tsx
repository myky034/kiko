import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { getAccess } from "@/server/identity";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Đăng nhập · Kiko" };

export default async function SignInPage() {
  const access = await getAccess();
  if (access.status === "active") redirect("/");
  if (access.status === "denied") redirect("/access-denied");

  return (
    <AuthLayout title="Đăng nhập" description="Không gian học tiếng Trung, tiếng Nhật và tiếng Anh của bạn.">
      <SignInForm />
    </AuthLayout>
  );
}
