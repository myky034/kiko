import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/server/config/env";

// One client per server process; reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { kikoPrisma?: PrismaClient };

/**
 * Runtime database client. Connects with DATABASE_URL, which must use the
 * least-privilege kiko_app role (validated in server/config/env.ts). The
 * migration identity (DIRECT_URL) is used only by the Prisma CLI.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.kikoPrisma) {
    const adapter = new PrismaPg({ connectionString: getServerEnv().DATABASE_URL });
    globalForPrisma.kikoPrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.kikoPrisma;
}
