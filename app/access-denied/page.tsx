import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { buttonClass } from "@/components/ui";
import { getAccess } from "@/server/identity";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Chưa có quyền truy cập · Kiko" };

export default async function AccessDeniedPage() {
  const access = await getAccess();
  if (access.status === "active") redirect("/");

  return (
    <AuthLayout
      title="Chưa có quyền truy cập"
      description="Tài khoản này chưa được cấp quyền dùng Kiko hoặc đang tạm khóa. Hãy liên hệ người quản lý Kiko nếu bạn cho rằng đây là nhầm lẫn."
    >
      {access.status === "denied" ? (
        <form action={signOut}>
          <button type="submit" className={`${buttonClass.secondary} w-full`}>
            Đăng xuất
          </button>
        </form>
      ) : (
        <Link href="/sign-in" className={`${buttonClass.secondary} w-full`}>
          Về trang đăng nhập
        </Link>
      )}
    </AuthLayout>
  );
}
