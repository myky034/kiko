import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { resolveAccess, type AccessDependencies } from "@/modules/identity/access";
import type { AccessDecision, Actor } from "@/modules/identity/types";
import { createSupabaseIdentityProvider, createSupabaseServerClient } from "@/server/auth/supabase";
import { createPrismaIdentityRepository } from "@/server/db/identity-repository";
import { getPrisma } from "@/server/db/prisma";

/** Composition root for the identity DAL; one set of adapters per request. */
export const getAccessDependencies = cache(async (): Promise<AccessDependencies> => {
  const supabase = await createSupabaseServerClient();
  return {
    provider: createSupabaseIdentityProvider(supabase),
    repository: createPrismaIdentityRepository(getPrisma),
  };
});

/** Access decision for the current request, memoized within the request only. */
export const getAccess = cache(async (): Promise<AccessDecision> => {
  return resolveAccess(await getAccessDependencies());
});

/** For protected pages: redirects anyone who is not an active Kiko actor. */
export async function requireActiveActor(): Promise<Actor> {
  const access = await getAccess();
  if (access.status === "unauthenticated") redirect("/sign-in");
  if (access.status === "denied") redirect("/access-denied");
  return access.actor;
}
