import { LANGUAGE_CODES } from "@/modules/language/registry";
import type {
  AccountState,
  AuditRecord,
  IdentityProvider,
  IdentityRepository,
  ProfileRecord,
  SaveOnboardingInput,
  VerifiedIdentity,
} from "@/modules/identity/types";

/**
 * TEST DOUBLE — not a database. Mirrors the semantics of the SQL layer
 * (kiko.admit_identity and the guarded onboarding update) so service-level
 * authorization can be tested without a database. The SQL itself is verified
 * separately in tests/db against PostgreSQL (PGlite).
 */

type StoredProfile = ProfileRecord & { subject: string; version: number };
type StoredAdmission = {
  email: string;
  status: "active" | "revoked";
  roles: string[];
  boundSubject: string | null;
};

export class InMemoryIdentityStore implements IdentityRepository {
  readonly profiles = new Map<string, StoredProfile>();
  readonly admissions = new Map<string, StoredAdmission>();
  readonly roles = new Map<string, string[]>();
  readonly preferences = new Map<string, Map<string, boolean>>();
  readonly audit: AuditRecord[] = [];
  private nextId = 1;
  /** Hook to simulate a concurrent change between access resolution and the write. */
  beforeSave?: () => void;

  allowEmail(email: string, roles: string[], status: "active" | "revoked" = "active") {
    this.admissions.set(email, { email, status, roles, boundSubject: null });
  }

  profileBySubject(subject: string): StoredProfile | undefined {
    return [...this.profiles.values()].find((profile) => profile.subject === subject);
  }

  /** Operator suspension: state change plus revision bump, like scripts/kiko-admin.mjs. */
  setState(userId: string, state: AccountState) {
    const profile = this.profiles.get(userId)!;
    profile.state = state;
    profile.authorizationRevision += 1;
  }

  async findProfileBySubject(_provider: string, subject: string) {
    const profile = this.profileBySubject(subject);
    if (!profile) return null;
    const { id, state, authorizationRevision, timezone, onboardedAt } = profile;
    return { id, state, authorizationRevision, timezone, onboardedAt };
  }

  async admitIdentity(_provider: string, subject: string, email: string) {
    const existing = this.profileBySubject(subject);
    if (existing) return existing.id;
    const admission = this.admissions.get(email.trim().toLowerCase());
    if (!admission || admission.status !== "active") return null;
    if (admission.boundSubject && admission.boundSubject !== subject) return null;

    const id = `user-${this.nextId++}`;
    this.profiles.set(id, {
      id,
      subject,
      state: "active",
      authorizationRevision: 1,
      timezone: null,
      onboardedAt: null,
      version: 1,
    });
    this.roles.set(id, [...admission.roles]);
    admission.boundSubject = subject;
    return id;
  }

  async listRoleCodes(userId: string) {
    return [...(this.roles.get(userId) ?? [])];
  }

  async listLanguagePreferences(userId: string) {
    return [...(this.preferences.get(userId) ?? new Map()).entries()].map(
      ([languageCode, enabled]) => ({ languageCode, enabled }),
    );
  }

  async saveOnboarding(input: SaveOnboardingInput) {
    this.beforeSave?.();
    const profile = this.profiles.get(input.userId);
    if (
      !profile ||
      profile.state !== "active" ||
      profile.authorizationRevision !== input.expectedRevision
    ) {
      return "stale_authorization" as const;
    }
    profile.timezone = input.timezone;
    profile.version += 1;
    profile.onboardedAt ??= new Date();

    const prefs = this.preferences.get(input.userId) ?? new Map<string, boolean>();
    const selected = new Set<string>(input.languages);
    for (const code of LANGUAGE_CODES) {
      if (selected.has(code)) prefs.set(code, true);
      else if (prefs.has(code)) prefs.set(code, false);
    }
    this.preferences.set(input.userId, prefs);
    return "saved" as const;
  }

  async recordAudit(event: AuditRecord) {
    this.audit.push(event);
  }
}

/** TEST DOUBLE for the provider session. `null` identity = no valid session. */
export class FakeIdentityProvider implements IdentityProvider {
  constructor(
    public identity: VerifiedIdentity | null,
    /** Whether Google verified the email (admission precondition). */
    public emailVerified = true,
  ) {}

  async getVerifiedIdentity() {
    return this.identity;
  }

  async isEmailVerifiedByProvider() {
    return this.emailVerified;
  }
}

/** Synthetic verified session; defaults to a Google OAuth sign-in. */
export function identity(
  subject: string,
  email: string | null,
  isAnonymous = false,
  authMethods: readonly string[] = ["oauth"],
): VerifiedIdentity {
  return { provider: "supabase", subject, email, isAnonymous, authMethods };
}
