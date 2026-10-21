import type { LanguageCode } from "@/modules/language/registry";
import type { Permission, RoleCode } from "@/server/policy/permissions";

export const AUTH_PROVIDER = "supabase";
export type AuthProvider = typeof AUTH_PROVIDER;

export type AccountState = "pending" | "active" | "suspended" | "removed";

/** Identity whose session signature the provider adapter has verified. */
export type VerifiedIdentity = {
  provider: AuthProvider;
  subject: string;
  email: string | null;
  isAnonymous: boolean;
  /** Authentication methods of this session (JWT `amr`), e.g. ["oauth"]. */
  authMethods: readonly string[];
  /** Display name from the provider profile (Google full name). Display only, never for authorization. */
  displayName?: string | null;
};

/** Authentication provider port (implemented by server/auth). */
export interface IdentityProvider {
  /** Returns null when there is no valid session. Never trusts unverified cookies. */
  getVerifiedIdentity(): Promise<VerifiedIdentity | null>;
  /**
   * Confirms with the provider that the identity's email is verified by the
   * admission provider (Google). Used once, before binding an approved email.
   */
  isEmailVerifiedByProvider(identity: VerifiedIdentity): Promise<boolean>;
}

export type ProfileRecord = {
  id: string;
  state: AccountState;
  authorizationRevision: number;
  timezone: string | null;
  onboardedAt: Date | null;
  /** Stored display name (DEC-037); null until seeded from the provider profile. */
  displayName?: string | null;
  /** Stored learning-language choice (DEC-037); always one of the user's preference rows. */
  currentLearningLanguage?: string | null;
};

export type SaveLearningLanguageInput = {
  userId: string;
  /** Revision observed when access was resolved; the write fails if it changed. */
  expectedRevision: number;
  languageCode: LanguageCode;
};

export type SaveLearningLanguageResult = "saved" | "stale_authorization" | "not_enabled";

export type LanguagePreferenceRecord = {
  languageCode: string;
  enabled: boolean;
};

export type SaveOnboardingInput = {
  userId: string;
  /** Revision observed when access was resolved; the write fails if it changed. */
  expectedRevision: number;
  timezone: string;
  languages: readonly LanguageCode[];
};

export type SaveOnboardingResult = "saved" | "stale_authorization";

export type AuditRecord = {
  actorUserId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  result: "success" | "denied" | "failure";
};

/**
 * Identity persistence port. Every method is scoped by the caller-supplied
 * actor/user id that the access service resolved from the verified session;
 * no method accepts an id taken from client input.
 */
export interface IdentityRepository {
  findProfileBySubject(provider: AuthProvider, subject: string): Promise<ProfileRecord | null>;
  /** Controlled admission; returns the user id or null when not admitted. */
  admitIdentity(provider: AuthProvider, subject: string, email: string): Promise<string | null>;
  listRoleCodes(userId: string): Promise<string[]>;
  listLanguagePreferences(userId: string): Promise<LanguagePreferenceRecord[]>;
  /** Atomic: guarded on active state + unchanged authorization revision. */
  saveOnboarding(input: SaveOnboardingInput): Promise<SaveOnboardingResult>;
  /** One-time, idempotent: sets display_name only while it is still NULL. */
  seedDisplayName(userId: string, displayName: string): Promise<void>;
  /** Guarded like onboarding; the language must be one of the user's enabled preferences. */
  saveLearningLanguage(input: SaveLearningLanguageInput): Promise<SaveLearningLanguageResult>;
  recordAudit(event: AuditRecord): Promise<void>;
}

export type Actor = {
  userId: string;
  email: string | null;
  /** Display only (stored name, else the provider profile name). */
  displayName?: string | null;
  /** Stored learning-language choice; validated against enabled languages before use. */
  learningLanguage?: string | null;
  roles: readonly RoleCode[];
  permissions: ReadonlySet<Permission>;
  authorizationRevision: number;
  timezone: string | null;
  onboardedAt: Date | null;
};

export type DeniedReason =
  | "anonymous_identity"
  | "unsupported_sign_in_method"
  | "email_unverified"
  | "not_admitted"
  | "pending"
  | "suspended"
  | "removed";

export type AccessDecision =
  | { status: "unauthenticated" }
  | { status: "denied"; reason: DeniedReason }
  | { status: "active"; actor: Actor };
