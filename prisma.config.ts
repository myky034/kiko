import { defineConfig } from "prisma/config";

// The Prisma CLI does not read env files itself. Load the git-ignored local file
// when present; CI/hosting provide variables through their own secret stores.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No local env file: rely on the process environment.
}

const directUrl = process.env.DIRECT_URL ?? "";

// Fail closed before any command that connects (migrate, db) reaches a remote
// database without verified TLS (DEC-015). Prisma's dialect: sslmode=require
// verifies nothing unless sslaccept=strict; sslcert is the CA certificate path.
const command = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
if ((command === "migrate" || command === "db") && directUrl) {
  const url = new URL(directUrl);
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  const verifiedTls =
    url.searchParams.get("sslmode") === "require" &&
    url.searchParams.get("sslaccept") === "strict" &&
    Boolean(url.searchParams.get("sslcert"));
  if (!local && !verifiedTls) {
    throw new Error(
      "DIRECT_URL must use verified TLS for a remote database: append " +
        "?sslmode=require&sslaccept=strict&sslcert=<absolute path to the Supabase CA certificate>",
    );
  }
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
    url: directUrl,
  },
});
