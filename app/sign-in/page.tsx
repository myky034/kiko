import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { Alert } from "@/components/ui";
import { signInErrorMessage } from "@/modules/identity/redirect";
import { en } from "@/modules/i18n/en";
import { getAccess } from "@/server/identity";
import { signInWithGoogle } from "./actions";
import { GoogleSubmitButton } from "./submit-button";

export const metadata: Metadata = { title: en.app.pageTitle(en.signIn.pageTitle) };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const access = await getAccess();
  if (access.status === "active") redirect("/");
  if (access.status === "denied") redirect("/access-denied");

  const { error } = await searchParams;
  // Only known error codes are shown; arbitrary query text is never rendered.
  const message = signInErrorMessage(Array.isArray(error) ? error[0] : error);

  return (
    <AuthLayout title={en.signIn.welcome} description={en.signIn.subtitle}>
      <div className="flex flex-col gap-5">
        {message ? (
          <Alert tone="error" title={en.signIn.failedTitle} role="alert">
            {message}
          </Alert>
        ) : null}
        <form action={signInWithGoogle}>
          <GoogleSubmitButton />
        </form>
        <p className="text-supporting text-muted">{en.signIn.notice}</p>
      </div>
    </AuthLayout>
  );
}
