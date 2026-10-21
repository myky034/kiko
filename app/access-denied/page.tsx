import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { buttonClass } from "@/components/ui";
import { en } from "@/modules/i18n/en";
import { getAccess } from "@/server/identity";
import { signOut } from "../actions";

export const metadata: Metadata = { title: en.app.pageTitle(en.accessDenied.pageTitle) };

export default async function AccessDeniedPage() {
  const access = await getAccess();
  if (access.status === "active") redirect("/");

  return (
    <AuthLayout title={en.accessDenied.title} description={en.accessDenied.body}>
      {access.status === "denied" ? (
        <form action={signOut}>
          <button type="submit" className={`${buttonClass.secondary} w-full`}>
            {en.shell.signOut}
          </button>
        </form>
      ) : (
        <Link href="/sign-in" className={`${buttonClass.secondary} w-full`}>
          {en.accessDenied.backToSignIn}
        </Link>
      )}
    </AuthLayout>
  );
}
