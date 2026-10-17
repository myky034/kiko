"use server";

import { redirect } from "next/navigation";
import { appUrl } from "@/modules/identity/redirect";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getAppOrigin, getPublicEnv } from "@/server/config/env";

function configuredOrigins(): { app: string; auth: string } | null {
  try {
    return { app: getAppOrigin(), auth: new URL(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).origin };
  } catch {
    return null;
  }
}

/**
 * Starts Google sign-in through Supabase Auth (PKCE). POST-only Server Action.
 * The callback URL is built from the configured app origin and must also be in
 * Supabase's Redirect URLs allow list. Signing in with Google only proves the
 * identity; Kiko access is decided afterwards by server-side admission.
 */
export async function signInWithGoogle(): Promise<void> {
  const origins = configuredOrigins();
  if (!origins) redirect("/sign-in?error=config");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: appUrl(origins.app, "/auth/callback").href },
  });

  // Follow the provider redirect only to the configured Supabase Auth origin.
  const target = !error && data.url ? new URL(data.url) : null;
  if (!target || target.origin !== origins.auth) redirect("/sign-in?error=oauth_failed");
  redirect(target.href);
}
