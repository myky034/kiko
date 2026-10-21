import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/server/config/env";
import {
  AUTH_PROVIDER,
  type IdentityProvider,
  type VerifiedIdentity,
} from "@/modules/identity/types";
import { displayNameOf } from "@/modules/identity/display";
import { normalizeEmail } from "@/modules/identity/email";
import { hasVerifiedGoogleEmail } from "@/modules/identity/provider-identity";

/**
 * Per-request Supabase client bound to the request cookies. Uses the PKCE flow
 * (the @supabase/ssr default): the code verifier lives in a cookie set when
 * the OAuth sign-in starts and is consumed in /auth/callback.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. proxy.ts refreshes the
          // session; Server Actions and Route Handlers can set them here.
        }
      },
    },
  });
}

function authMethodsOf(amr: unknown): string[] {
  if (!Array.isArray(amr)) return [];
  return amr
    .map((entry) => (typeof entry === "string" ? entry : (entry as { method?: unknown })?.method))
    .filter((method): method is string => typeof method === "string");
}

export function createSupabaseIdentityProvider(supabase: SupabaseClient): IdentityProvider {
  return {
    async getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
      // getClaims() verifies the JWT signature; getSession() must never be
      // trusted for authorization on the server.
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data) return null;
      const { sub, email, is_anonymous: isAnonymous, amr, user_metadata: metadata } = data.claims;
      if (typeof sub !== "string" || sub.length === 0) return null;
      return {
        provider: AUTH_PROVIDER,
        subject: sub,
        email: typeof email === "string" && email.length > 0 ? normalizeEmail(email) : null,
        isAnonymous: isAnonymous === true,
        authMethods: authMethodsOf(amr),
        displayName: displayNameOf(metadata),
      };
    },

    async isEmailVerifiedByProvider(identity) {
      // Network call to Supabase Auth; only used once, at first admission.
      if (!identity.email) return false;
      const { data, error } = await supabase.auth.getUser();
      if (error) return false;
      return hasVerifiedGoogleEmail(data.user, identity.subject, identity.email);
    },
  };
}
