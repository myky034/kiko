import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { LANGUAGE_CODES } from "@/modules/language/registry";
import type {
  AuditRecord,
  AuthProvider,
  IdentityRepository,
  LanguagePreferenceRecord,
  ProfileRecord,
  SaveOnboardingInput,
  SaveOnboardingResult,
} from "@/modules/identity/types";

/**
 * Prisma implementation of the identity port. Runs as kiko_app, whose grants
 * only allow the columns written here (see the identity_security migration).
 * The client is obtained lazily so requests without a session never connect.
 */
export function createPrismaIdentityRepository(client: () => PrismaClient): IdentityRepository {
  return {
    async findProfileBySubject(provider: AuthProvider, subject: string): Promise<ProfileRecord | null> {
      return client().userProfile.findUnique({
        where: { authProvider_authSubject: { authProvider: provider, authSubject: subject } },
        select: {
          id: true,
          state: true,
          authorizationRevision: true,
          timezone: true,
          onboardedAt: true,
          displayName: true,
          currentLearningLanguage: true,
        },
      });
    },

    async seedDisplayName(userId, displayName) {
      await client().userProfile.updateMany({
        where: { id: userId, state: "active", displayName: null },
        data: { displayName },
      });
    },

    async saveLearningLanguage(input) {
      return client().$transaction(async (tx) => {
        const preference = await tx.userLanguagePreference.findUnique({
          where: { userId_languageCode: { userId: input.userId, languageCode: input.languageCode } },
          select: { enabled: true },
        });
        if (!preference?.enabled) return "not_enabled";
        // Guarded like onboarding: only while still active at the observed revision.
        const updated = await tx.userProfile.updateMany({
          where: { id: input.userId, state: "active", authorizationRevision: input.expectedRevision },
          data: { currentLearningLanguage: input.languageCode },
        });
        return updated.count === 1 ? "saved" : "stale_authorization";
      });
    },

    async admitIdentity(provider, subject, email) {
      const rows = await client().$queryRaw<{ id: string | null }[]>`
        SELECT kiko.admit_identity(${provider}, ${subject}, ${email}) AS id`;
      return rows[0]?.id ?? null;
    },

    async listRoleCodes(userId) {
      const roles = await client().userRole.findMany({
        where: { userId },
        select: { roleCode: true },
      });
      return roles.map((role) => role.roleCode);
    },

    async listLanguagePreferences(userId): Promise<LanguagePreferenceRecord[]> {
      return client().userLanguagePreference.findMany({
        where: { userId },
        select: { languageCode: true, enabled: true },
      });
    },

    async saveOnboarding(input: SaveOnboardingInput): Promise<SaveOnboardingResult> {
      return client().$transaction(async (tx) => {
        // Guarded write: matches only while the account is still active and its
        // authorization revision is the one observed for this request. The row
        // lock serializes against concurrent suspension/role changes.
        const updated = await tx.userProfile.updateMany({
          where: {
            id: input.userId,
            state: "active",
            authorizationRevision: input.expectedRevision,
          },
          data: { timezone: input.timezone, version: { increment: 1 } },
        });
        if (updated.count !== 1) return "stale_authorization";

        // Preserve the first onboarding time on retries.
        await tx.userProfile.updateMany({
          where: { id: input.userId, onboardedAt: null },
          data: { onboardedAt: new Date() },
        });

        const selected = new Set(input.languages);
        for (const code of LANGUAGE_CODES) {
          const enabled = selected.has(code);
          if (enabled) {
            await tx.userLanguagePreference.upsert({
              where: { userId_languageCode: { userId: input.userId, languageCode: code } },
              create: { userId: input.userId, languageCode: code, enabled: true },
              update: { enabled: true },
            });
          } else {
            await tx.userLanguagePreference.updateMany({
              where: { userId: input.userId, languageCode: code },
              data: { enabled: false },
            });
          }
        }

        // createMany issues no RETURNING: kiko_app may append but not read audit rows.
        await tx.auditEvent.createMany({
          data: [
            {
              actorUserId: input.userId,
              action: "profile.onboarding",
              targetType: "user_profile",
              targetId: input.userId,
              result: "success",
            },
          ],
        });
        return "saved";
      });
    },

    async recordAudit(event: AuditRecord) {
      await client().auditEvent.createMany({
        data: [
          {
            actorUserId: event.actorUserId,
            action: event.action,
            targetType: event.targetType ?? null,
            targetId: event.targetId ?? null,
            result: event.result,
          },
        ],
      });
    },
  };
}
