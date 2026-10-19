import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import type { TestProject } from "vitest/node";
import { describeTarget, resolveTestDatabaseUrl } from "./target";

declare module "vitest" {
  export interface ProvidedContext {
    /** Superuser/operator connection to the local test database. */
    adminUrl: string;
    /** Connection whose current_user is the kiko_app runtime role. */
    appUrl: string;
  }
}

const PRISMA_BIN = path.join(process.cwd(), "node_modules", ".bin", "prisma");

function prisma(args: string[], databaseUrl: string): string {
  // DIRECT_URL is set explicitly; process env wins over .env.local in prisma.config.ts.
  return execFileSync(PRISMA_BIN, args, {
    env: { ...process.env, DIRECT_URL: databaseUrl },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Resets Kiko objects in the local test database and applies the real
 * migrations with `prisma migrate deploy`, the same path used for Supabase.
 * Role changes are limited to creating the NOLOGIN Supabase API roles when
 * missing (existing roles are never altered) and the migration's own kiko_app.
 */
export default async function setup(project: TestProject) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Variables may come from the shell instead.
  }
  const target = resolveTestDatabaseUrl(process.env);
  const adminUrl = target.href;
  console.log(`[integration] target ${describeTarget(target)}`);

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    // Supabase provides these cluster roles; recreate them locally so the
    // migration's revokes run the same branches. NOLOGIN, no privileges.
    await admin.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
      END
      $$;`);
    // Emulate Supabase's default privileges on `public` in this test database
    // only (per-database setting), so the migration-history protection is
    // exercised. Idempotent.
    await admin.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role",
    );
    // Reset only what Kiko migrations own in this database.
    await admin.query("DROP SCHEMA IF EXISTS kiko CASCADE");
    await admin.query("DROP TABLE IF EXISTS public._prisma_migrations");
  } finally {
    await admin.end();
  }

  // Belt and braces: confirm Prisma resolves the local target before writing.
  const status = (() => {
    try {
      return prisma(["migrate", "status"], adminUrl);
    } catch (error) {
      // `migrate status` exits non-zero while migrations are pending.
      return String((error as { stdout?: string }).stdout ?? "");
    }
  })();
  if (!status.includes(`at "${target.hostname}:${target.port || "5432"}"`) || status.includes("supabase.com")) {
    throw new Error("[integration] Prisma did not resolve the local test database; aborting before migrate deploy");
  }
  prisma(["migrate", "deploy"], adminUrl);

  // The runtime role is entered with a startup parameter instead of a login:
  // current_user becomes kiko_app, so grants and RLS apply exactly as for the
  // app, while kiko_app keeps NOLOGIN and no password exists to clean up
  // (even if the run is interrupted). Requires the admin user to be a
  // superuser or a member of kiko_app.
  const appUrl = new URL(adminUrl);
  appUrl.searchParams.set("options", "-c role=kiko_app");

  project.provide("adminUrl", adminUrl);
  project.provide("appUrl", appUrl.href);
}
