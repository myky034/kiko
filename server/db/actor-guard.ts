import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ActorGuard } from "@/modules/content/types";

/**
 * Re-checks the actor inside a write transaction and share-locks the profile
 * row, so a concurrent suspension or role change serializes against the write
 * (DEC-012). Returns false when the actor is no longer active at the observed
 * authorization revision.
 */
export async function lockActiveActor(tx: Prisma.TransactionClient, guard: ActorGuard): Promise<boolean> {
  const rows = await tx.$queryRaw<{ ok: number }[]>`
    SELECT 1 AS ok FROM kiko.user_profile
    WHERE id = ${guard.userId}::uuid AND state = 'active' AND authorization_revision = ${guard.authorizationRevision}
    FOR SHARE`;
  return rows.length === 1;
}
