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
import { normalizeEmail } from "@/modules/identity/email";

/** Per-request Supabase client bound to the request cookies. */
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

export function createSupabaseIdentityProvider(supabase: SupabaseClient): IdentityProvider {
  return {
    async getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
      // getClaims() verifies the JWT signature; getSession() must never be
      // trusted for authorization on the server.
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data) return null;
      const { sub, email, is_anonymous: isAnonymous } = data.claims;
      if (typeof sub !== "string" || sub.length === 0) return null;
      return {
        provider: AUTH_PROVIDER,
        subject: sub,
        email: typeof email === "string" && email.length > 0 ? normalizeEmail(email) : null,
        isAnonymous: isAnonymous === true,
      };
    },

    async isEmailConfirmed(identity) {
      // Network call to Supabase Auth; only used once, at first admission.
      const { data, error } = await supabase.auth.getUser();
      const user = data.user;
      if (error || !user || user.id !== identity.subject) return false;
      if (!user.email || !user.email_confirmed_at) return false;
      return identity.email !== null && normalizeEmail(user.email) === identity.email;
    },
  };
}
