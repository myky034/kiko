import "server-only";
import { redirect } from "next/navigation";
import type { LessonRepository } from "@/modules/content/types";
import { needsOnboarding } from "@/modules/identity/dashboard";
import { resolveAccess } from "@/modules/identity/access";
import type { Actor } from "@/modules/identity/types";
import { createPrismaLessonRepository } from "@/server/db/lesson-repository";
import { getPrisma } from "@/server/db/prisma";
import { getAccessDependencies, requireActiveActor } from "@/server/identity";
import { hasPermission } from "@/server/policy/permissions";

export function getLessonRepository(): LessonRepository {
  return createPrismaLessonRepository(getPrisma);
}

/** For lesson pages: an active, onboarded actor with learner permissions. */
export async function requireLearner(): Promise<Actor> {
  const actor = await requireActiveActor();
  if (needsOnboarding(actor)) redirect("/onboarding");
  if (!hasPermission(actor, "lesson.read_private")) redirect("/");
  return actor;
}

/** For Server Actions: re-resolves access from the verified session. */
export async function actionActor(): Promise<Actor> {
  const access = await resolveAccess(await getAccessDependencies());
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status === "denied") redirect("/access-denied");
  return access.actor;
}
