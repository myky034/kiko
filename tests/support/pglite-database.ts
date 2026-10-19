import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

/**
 * Disposable in-process PostgreSQL (PGlite) with every Prisma migration applied
 * in order. Supabase API roles, Supabase's default privileges on `public` and
 * Prisma's history table are created first so migrations run the same branches
 * as on Supabase.
 *
 * Limits: PGlite is a different PostgreSQL major than the Supabase project, and
 * has no pooler, Supabase Auth or network TLS. It verifies SQL semantics,
 * constraints, grants and RLS, not deployment parity.
 */
export async function createMigratedDatabase(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    -- Supabase grants new tables in public to the API roles by default.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    -- Prisma Migrate creates its history table before the first migration.
    CREATE TABLE public._prisma_migrations (id varchar(36) PRIMARY KEY, migration_name varchar(255) NOT NULL);
  `);

  const migrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of migrations) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
    await db.exec(sql);
  }
  return db;
}

/** Runs `fn` as `role`, always restoring the session role afterwards. */
export async function asRole<T>(
  db: PGlite,
  role: string,
  fn: () => Promise<T>,
): Promise<T> {
  await db.exec(`SET ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}

/** Resolves to the PostgreSQL error message, or null when the query succeeds. */
export async function errorOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function admitEmail(
  db: PGlite,
  email: string,
  roles: readonly string[],
): Promise<string> {
  const account = await db.query<{ id: string }>(
    "INSERT INTO kiko.allowed_account (email) VALUES ($1) RETURNING id",
    [email],
  );
  const id = account.rows[0].id;
  for (const role of roles) {
    await db.query(
      "INSERT INTO kiko.allowed_account_role (allowed_account_id, role_code) VALUES ($1, $2)",
      [id, role],
    );
  }
  return id;
}
