import { normalizeEmail } from "./email";

/** Minimal shape of a Supabase Auth user needed for the admission check. */
export type ProviderUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  identities?: ReadonlyArray<{
    provider: string;
    identity_data?: Record<string, unknown>;
  }> | null;
};

export const ADMISSION_PROVIDER = "google";

/**
 * True only when the provider user is the session subject and has a Google
 * identity whose email Google marked verified and that equals the email being
 * admitted (DEC-007, DEC-018). Admission binds an approved email to a provider
 * subject once, so an unverified or non-Google email must never qualify.
 */
export function hasVerifiedGoogleEmail(
  user: ProviderUser | null | undefined,
  subject: string,
  email: string,
): boolean {
  if (!user || user.id !== subject || !user.email || !user.email_confirmed_at) return false;
  const expected = normalizeEmail(email);
  if (normalizeEmail(user.email) !== expected) return false;

  return (user.identities ?? []).some((identity) => {
    if (identity.provider !== ADMISSION_PROVIDER) return false;
    const data = identity.identity_data ?? {};
    return (
      data.email_verified === true &&
      typeof data.email === "string" &&
      normalizeEmail(data.email) === expected
    );
  });
}

/** Authentication methods (JWT `amr`) accepted for a Kiko session. */
export const ACCEPTED_AUTH_METHODS: ReadonlySet<string> = new Set(["oauth"]);
