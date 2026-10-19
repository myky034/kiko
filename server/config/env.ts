import { z } from "zod";
import { isSupportedTimeZone } from "@/modules/language/timezones";

/**
 * Validated configuration. Values are read lazily so `next build` and tests do
 * not need secrets; a protected request fails closed when a variable is missing
 * or invalid. Error messages name variables, never their values.
 */

export class ConfigurationError extends Error {
  constructor(readonly variables: string[]) {
    super(`Invalid or missing configuration: ${variables.join(", ")}`);
    this.name = "ConfigurationError";
  }
}

/** Roles that bypass RLS or own the schema; the web runtime must not use them. */
const PRIVILEGED_DB_USERS = new Set(["postgres", "supabase_admin", "service_role"]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Remote runtime connections must verify the server certificate (DEC-015):
 * pg dialect `sslmode=verify-full` plus `sslrootcert` (Supabase uses its own CA).
 */
function hasVerifiedTlsOrIsLocal(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (LOOPBACK_HOSTS.has(parsed.hostname)) return true;
    return (
      parsed.searchParams.get("sslmode") === "verify-full" &&
      (parsed.searchParams.get("sslrootcert") ?? "").length > 0
    );
  } catch {
    return false;
  }
}

function dbUserOf(url: string): string | null {
  try {
    // Supavisor pooler usernames look like `<role>.<project-ref>`.
    return decodeURIComponent(new URL(url).username).split(".")[0] || null;
  } catch {
    return null;
  }
}

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20)
    .refine((key) => !key.startsWith("sb_secret_"), "secret key in a public variable"),
});

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .refine((url) => /^postgres(ql)?:\/\//.test(url), "not a PostgreSQL URL")
    .refine((url) => {
      const user = dbUserOf(url);
      return user !== null && !PRIVILEGED_DB_USERS.has(user);
    }, "runtime must use the least-privilege kiko_app role")
    .refine(hasVerifiedTlsOrIsLocal, "remote database requires sslmode=verify-full and sslrootcert"),
  KIKO_DEFAULT_TIMEZONE: z
    .string()
    .default("Asia/Ho_Chi_Minh")
    .refine(isSupportedTimeZone, "not an IANA timezone"),
});

/**
 * Canonical public origin of this Kiko deployment (DEC-018). OAuth redirects
 * and post-login redirects are built from it, never from request Host or
 * X-Forwarded-Host headers. Plain http is allowed for loopback only.
 */
const appOriginSchema = z.object({
  KIKO_APP_ORIGIN: z
    .url({ protocol: /^https?$/ })
    .refine((value) => {
      const url = new URL(value);
      return url.origin === value.replace(/\/$/, "") && url.pathname === "/" && !url.search && !url.hash;
    }, "must be an origin without path, query or fragment")
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" || LOOPBACK_HOSTS.has(url.hostname);
    }, "http is allowed for localhost only")
    .transform((value) => new URL(value).origin),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function parse<T extends z.ZodType>(schema: T, source: Record<string, unknown>): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new ConfigurationError(variables);
  }
  return result.data;
}

export function getPublicEnv(): PublicEnv {
  // Referenced individually so Next.js can inline NEXT_PUBLIC_* if ever needed.
  return parse(publicSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv(): ServerEnv {
  return parse(serverSchema, {
    DATABASE_URL: process.env.DATABASE_URL,
    KIKO_DEFAULT_TIMEZONE: process.env.KIKO_DEFAULT_TIMEZONE || undefined,
  });
}

export function getAppOrigin(): string {
  return parse(appOriginSchema, { KIKO_APP_ORIGIN: process.env.KIKO_APP_ORIGIN }).KIKO_APP_ORIGIN;
}

export const __testing = { publicSchema, serverSchema, appOriginSchema };
