import { isRoleCode, permissionsForRoles } from "@/server/policy/permissions";
import { ACCEPTED_AUTH_METHODS } from "./provider-identity";
import {
  AUTH_PROVIDER,
  type AccessDecision,
  type IdentityProvider,
  type IdentityRepository,
  type ProfileRecord,
} from "./types";

export type AccessDependencies = {
  provider: IdentityProvider;
  repository: IdentityRepository;
};

/**
 * Resolves the Kiko actor for the current request (ACCESS_CONTROL.md §8).
 *
 * 1. Verified provider session (signature-checked), never client-supplied ids.
 * 2. Only OAuth (Google) sessions are accepted, so a password/OTP identity that
 *    Supabase linked to the same user by email cannot reuse the account.
 * 3. Kiko admission: a provider identity alone grants nothing. First sign-in is
 *    admitted only for a pre-approved email that Google verified.
 * 4. Account state and roles are read from the database on every call; there is
 *    no cross-request role cache, so suspension applies to the next request.
 */
export async function resolveAccess({
  provider,
  repository,
}: AccessDependencies): Promise<AccessDecision> {
  const identity = await provider.getVerifiedIdentity();
  if (!identity) return { status: "unauthenticated" };
  if (identity.isAnonymous) return { status: "denied", reason: "anonymous_identity" };
  if (!identity.authMethods.some((method) => ACCEPTED_AUTH_METHODS.has(method))) {
    return { status: "denied", reason: "unsupported_sign_in_method" };
  }

  let profile: ProfileRecord | null = await repository.findProfileBySubject(
    AUTH_PROVIDER,
    identity.subject,
  );

  if (!profile) {
    if (!identity.email) return { status: "denied", reason: "not_admitted" };
    // Binding an approved email to this subject requires Google to have
    // verified the address; an unverified email claim must not claim an account.
    if (!(await provider.isEmailVerifiedByProvider(identity))) {
      return { status: "denied", reason: "email_unverified" };
    }
    const admittedId = await repository.admitIdentity(
      AUTH_PROVIDER,
      identity.subject,
      identity.email,
    );
    if (!admittedId) return { status: "denied", reason: "not_admitted" };
    profile = await repository.findProfileBySubject(AUTH_PROVIDER, identity.subject);
    if (!profile) return { status: "denied", reason: "not_admitted" };
  }

  if (profile.state !== "active") return { status: "denied", reason: profile.state };

  const roles = (await repository.listRoleCodes(profile.id)).filter(isRoleCode);

  // One-time seed of the stored display name from the verified provider profile
  // (DEC-037), like admission a first-request write; later edits are never overwritten.
  if (!profile.displayName && identity.displayName) {
    await repository.seedDisplayName(profile.id, identity.displayName);
  }

  return {
    status: "active",
    actor: {
      userId: profile.id,
      email: identity.email,
      displayName: profile.displayName ?? identity.displayName ?? null,
      learningLanguage: profile.currentLearningLanguage ?? null,
      roles,
      permissions: permissionsForRoles(roles),
      authorizationRevision: profile.authorizationRevision,
      timezone: profile.timezone,
      onboardedAt: profile.onboardedAt,
    },
  };
}
