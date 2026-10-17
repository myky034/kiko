/**
 * Guard for the integration-test database (DEC-014). The suite drops and
 * recreates the `kiko` schema, so it must never reach a shared database.
 * Requirements: an explicit KIKO_TEST_DATABASE_URL, a loopback host, a
 * PostgreSQL URL, and a value different from the app's DATABASE_URL/DIRECT_URL.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export class UnsafeTestDatabaseError extends Error {
  constructor(reason: string) {
    super(`Refusing to run integration tests: ${reason}`);
    this.name = "UnsafeTestDatabaseError";
  }
}

export function resolveTestDatabaseUrl(env: Record<string, string | undefined>): URL {
  const raw = env.KIKO_TEST_DATABASE_URL;
  if (!raw) {
    throw new UnsafeTestDatabaseError(
      "KIKO_TEST_DATABASE_URL is not set. Add a local database to .env.local, e.g. " +
        "KIKO_TEST_DATABASE_URL=postgresql://<local user>@localhost:5432/kiko_flashcard",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeTestDatabaseError("KIKO_TEST_DATABASE_URL is not a valid URL");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new UnsafeTestDatabaseError("KIKO_TEST_DATABASE_URL is not a PostgreSQL URL");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new UnsafeTestDatabaseError("KIKO_TEST_DATABASE_URL must point to localhost");
  }
  if (url.pathname.length <= 1) {
    throw new UnsafeTestDatabaseError("KIKO_TEST_DATABASE_URL must name a database");
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (env[name] && env[name] === raw) {
      throw new UnsafeTestDatabaseError(`KIKO_TEST_DATABASE_URL must differ from ${name}`);
    }
  }
  return url;
}

/** host:port/db for logs; never includes credentials. */
export function describeTarget(url: URL): string {
  return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
}
