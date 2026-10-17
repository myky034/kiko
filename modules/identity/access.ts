import { isRoleCode, permissionsForRoles } from "@/server/policy/permissions";
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
 * 2. Kiko admission: a provider identity alone grants nothing. First sign-in is
 *    admitted only for a pre-approved, provider-confirmed email.
 * 3. Account state and roles are read from the database on every call; there is
 *    no cross-request role cache, so suspension applies to the next request.
 */
export async function resolveAccess({
  provider,
  repository,
}: AccessDependencies): Promise<AccessDecision> {
  const identity = await provider.getVerifiedIdentity();
  if (!identity) return { status: "unauthenticated" };
  if (identity.isAnonymous) return { status: "denied", reason: "anonymous_identity" };

  let profile: ProfileRecord | null = await repository.findProfileBySubject(
    AUTH_PROVIDER,
    identity.subject,
  );

  if (!profile) {
    if (!identity.email) return { status: "denied", reason: "not_admitted" };
    // Binding an approved email to this subject requires the provider to
    // confirm the address; an unverified email claim must not claim an account.
    if (!(await provider.isEmailConfirmed(identity))) {
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

  return {
    status: "active",
    actor: {
      userId: profile.id,
      email: identity.email,
      roles,
      permissions: permissionsForRoles(roles),
      authorizationRevision: profile.authorizationRevision,
      timezone: profile.timezone,
      onboardedAt: profile.onboardedAt,
    },
  };
}
