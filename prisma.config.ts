import { defineConfig } from "prisma/config";

// The Prisma CLI does not read env files itself. Load the git-ignored local file
// when present; CI/hosting provide variables through their own secret stores.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No local env file: rely on the process environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migration identity only (DEC-006). The web runtime uses DATABASE_URL with
    // the least-privilege kiko_app role. `prisma generate` and `migrate diff`
    // do not connect, so an empty value is acceptable for them.
    url: process.env.DIRECT_URL ?? "",
  },
});
