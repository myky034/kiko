import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveAccess } from "@/modules/identity/access";
import { loadDashboard } from "@/modules/identity/dashboard";
import { saveOnboarding } from "@/modules/identity/onboarding";
import type { IdentityRepository } from "@/modules/identity/types";
import { createPrismaIdentityRepository } from "@/server/db/identity-repository";
import { FakeIdentityProvider, identity } from "../support/in-memory-identity";

const execFileAsync = promisify(execFile);

let prisma: PrismaClient;
let repository: IdentityRepository;
let admin: pg.Client;
let app: pg.Client;

beforeAll(async () => {
  // Runtime path as in production code: Prisma + adapter-pg, current_user kiko_app.
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject("appUrl") }) });
  repository = createPrismaIdentityRepository(() => prisma);
  admin = new pg.Client({ connectionString: inject("adminUrl") });
  app = new pg.Client({ connectionString: inject("appUrl") });
  await Promise.all([admin.connect(), app.connect()]);
});

afterAll(async () => {
  await prisma?.$disconnect();
  await Promise.all([admin?.end(), app?.end()]);
});

/** Unique synthetic identity per test; no real emails. */
function synthetic(label: string) {
  const id = randomUUID().slice(0, 8);
  return { email: `${label}-${id}@example.test`, subject: `subject-${label}-${id}` };
}

/** Operator admission, as scripts/kiko-admin.mjs does. */
async function allow(email: string, roles: string[]) {
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO kiko.allowed_account (email) VALUES ($1) RETURNING id",
    [email],
  );
  for (const role of roles) {
    await admin.query(
      "INSERT INTO kiko.allowed_account_role (allowed_account_id, role_code) VALUES ($1, $2)",
      [rows[0].id, role],
    );
  }
}

/** kiko.is_email_admissible as the runtime role (SQL function kept; DEC-018). */
async function admissible(email: string): Promise<boolean> {
  const { rows } = await app.query<{ ok: boolean }>(
    "SELECT kiko.is_email_admissible('supabase', $1) AS ok",
    [email],
  );
  return rows[0].ok;
}

function onboardingForm(languages: string[], timezone = "Asia/Ho_Chi_Minh", extra: [string, string][] = []) {
  const data = new FormData();
  for (const code of languages) data.append("languages", code);
  data.append("timezone", timezone);
  for (const [name, value] of extra) data.append(name, value);
  return data;
}

async function activeActor(provider: FakeIdentityProvider) {
  const access = await resolveAccess({ provider, repository });
  if (access.status !== "active") throw new Error(`expected active, got ${JSON.stringify(access)}`);
  return access.actor;
}

describe("environment", () => {
  it("runs as the least-privilege runtime role, which cannot log in", async () => {
    const rows = await prisma.$queryRaw<{ user: string; superuser: boolean; bypassrls: boolean }[]>`
      SELECT current_user AS "user", r.rolsuper AS superuser, r.rolbypassrls AS bypassrls
      FROM pg_roles r WHERE r.rolname = current_user`;
    expect(rows[0]).toEqual({ user: "kiko_app", superuser: false, bypassrls: false });
    const login = await admin.query<{ rolcanlogin: boolean; has_password: boolean }>(
      "SELECT rolcanlogin, rolpassword IS NOT NULL AS has_password FROM pg_authid WHERE rolname = 'kiko_app'",
    );
    expect(login.rows[0]).toEqual({ rolcanlogin: false, has_password: false });
  });

  it("applied every migration through prisma migrate deploy", async () => {
    const { rows } = await admin.query<{ migration_name: string }>(
      "SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL ORDER BY 1",
    );
    const expected = readdirSync(path.join(process.cwd(), "prisma", "migrations"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(expected.length).toBeGreaterThanOrEqual(5);
    expect(rows.map((row) => row.migration_name)).toEqual(expected);
  });

  it("keeps Prisma's history table away from Supabase API roles", async () => {
    const { rows } = await admin.query<{ role: string; any_privilege: boolean }>(
      `SELECT r AS role,
              has_table_privilege(r, 'public._prisma_migrations', 'SELECT,INSERT,UPDATE,DELETE') AS any_privilege
       FROM unnest(ARRAY['anon', 'authenticated', 'service_role', 'kiko_app']) AS r`,
    );
    for (const row of rows) expect(row.any_privilege, row.role).toBe(false);
  });
});

describe("Prisma identity repository as kiko_app", () => {
  it("checks admissibility without exposing the allowlist", async () => {
    const a = synthetic("adm");
    await allow(a.email, ["LEARNER"]);
    expect(await admissible(a.email)).toBe(true);
    expect(await admissible(synthetic("no").email)).toBe(false);
  });

  it("admits once, returns roles and finds the profile", async () => {
    const a = synthetic("owner");
    await allow(a.email, ["OWNER", "LEARNER"]);
    const userId = await repository.admitIdentity("supabase", a.subject, a.email);
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await repository.admitIdentity("supabase", a.subject, a.email)).toBe(userId);
    expect((await repository.listRoleCodes(userId!)).sort()).toEqual(["LEARNER", "OWNER"]);
    const profile = await repository.findProfileBySubject("supabase", a.subject);
    expect(profile).toMatchObject({ id: userId, state: "active", authorizationRevision: 1, onboardedAt: null });
  });

  it("saves onboarding, converges on retries and appends audit rows", async () => {
    const a = synthetic("onb");
    await allow(a.email, ["LEARNER"]);
    const userId = (await repository.admitIdentity("supabase", a.subject, a.email))!;
    const input = { userId, expectedRevision: 1, timezone: "Asia/Tokyo", languages: ["ja", "en"] as const };

    expect(await repository.saveOnboarding({ ...input, languages: [...input.languages] })).toBe("saved");
    const first = await repository.findProfileBySubject("supabase", a.subject);
    expect(await repository.saveOnboarding({ ...input, languages: [...input.languages] })).toBe("saved");
    const second = await repository.findProfileBySubject("supabase", a.subject);

    expect(second?.onboardedAt?.getTime()).toBe(first?.onboardedAt?.getTime());
    expect(second?.timezone).toBe("Asia/Tokyo");
    expect(await repository.listLanguagePreferences(userId)).toEqual(
      expect.arrayContaining([
        { languageCode: "ja", enabled: true },
        { languageCode: "en", enabled: true },
      ]),
    );
    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.audit_event WHERE actor_user_id = $1 AND action = 'profile.onboarding' AND result = 'success'",
      [userId],
    );
    expect(rows[0].n).toBe(2);
  });

  it("refuses a write guarded on a stale revision or a suspended account", async () => {
    const a = synthetic("stale");
    await allow(a.email, ["LEARNER"]);
    const userId = (await repository.admitIdentity("supabase", a.subject, a.email))!;
    await admin.query(
      "UPDATE kiko.user_profile SET authorization_revision = authorization_revision + 1 WHERE id = $1",
      [userId],
    );
    const stale = { userId, expectedRevision: 1, timezone: "UTC", languages: ["zh" as const] };
    expect(await repository.saveOnboarding(stale)).toBe("stale_authorization");

    await admin.query("UPDATE kiko.user_profile SET state = 'suspended' WHERE id = $1", [userId]);
    expect(await repository.saveOnboarding({ ...stale, expectedRevision: 2 })).toBe("stale_authorization");

    const profile = await repository.findProfileBySubject("supabase", a.subject);
    expect(profile?.timezone).toBeNull();
    expect(await repository.listLanguagePreferences(userId)).toEqual([]);
  });

  it("saves the learning language only for an enabled preference at the observed revision", async () => {
    const a = synthetic("learning-language");
    await allow(a.email, ["LEARNER"]);
    const userId = (await repository.admitIdentity("supabase", a.subject, a.email))!;
    await repository.saveOnboarding({ userId, expectedRevision: 1, timezone: "UTC", languages: ["zh", "ja"] });
    await repository.saveOnboarding({ userId, expectedRevision: 1, timezone: "UTC", languages: ["zh"] });

    expect(await repository.saveLearningLanguage({ userId, expectedRevision: 1, languageCode: "en" })).toBe("not_enabled");
    expect(await repository.saveLearningLanguage({ userId, expectedRevision: 1, languageCode: "ja" })).toBe("not_enabled");
    expect(await repository.saveLearningLanguage({ userId, expectedRevision: 2, languageCode: "zh" })).toBe(
      "stale_authorization",
    );
    expect(await repository.saveLearningLanguage({ userId, expectedRevision: 1, languageCode: "zh" })).toBe("saved");
    expect((await repository.findProfileBySubject("supabase", a.subject))?.currentLearningLanguage).toBe("zh");
  });

  it("seeds the display name once and never overwrites it", async () => {
    const a = synthetic("display-name");
    await allow(a.email, ["LEARNER"]);
    const userId = (await repository.admitIdentity("supabase", a.subject, a.email))!;
    await repository.seedDisplayName(userId, "First Name");
    await repository.seedDisplayName(userId, "Second Name");
    expect((await repository.findProfileBySubject("supabase", a.subject))?.displayName).toBe("First Name");
  });

  it("records standalone audit events without needing read access", async () => {
    const a = synthetic("audit");
    await allow(a.email, ["LEARNER"]);
    const userId = (await repository.admitIdentity("supabase", a.subject, a.email))!;
    await repository.recordAudit({ actorUserId: userId, action: "profile.onboarding", result: "denied" });
    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.audit_event WHERE actor_user_id = $1 AND result = 'denied'",
      [userId],
    );
    expect(rows[0].n).toBe(1);
  });
});

describe("concurrency", () => {
  it("creates exactly one profile for concurrent first sign-ins", async () => {
    const a = synthetic("race");
    await allow(a.email, ["LEARNER"]);
    const ids = await Promise.all(
      Array.from({ length: 6 }, () => repository.admitIdentity("supabase", a.subject, a.email)),
    );
    expect(new Set(ids).size).toBe(1);
    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.user_profile WHERE auth_subject = $1",
      [a.subject],
    );
    expect(rows[0].n).toBe(1);
  });

  it("keeps one preference row per language under concurrent onboarding submissions", async () => {
    const a = synthetic("dup");
    await allow(a.email, ["LEARNER"]);
    const provider = new FakeIdentityProvider(identity(a.subject, a.email));
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => saveOnboarding({ provider, repository }, onboardingForm(["zh", "ja"]))),
    );
    const saved = results.filter((r) => r.status === "fulfilled" && r.value.status === "saved").length;
    expect(saved).toBeGreaterThanOrEqual(1);
    const actor = await activeActor(provider);
    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.user_language_preference WHERE user_id = $1",
      [actor.userId],
    );
    expect(rows[0].n).toBe(2);
  });
});

describe("end-to-end use cases on real PostgreSQL", () => {
  it("denies an identity that was never admitted and writes nothing", async () => {
    const e = synthetic("e");
    const provider = new FakeIdentityProvider(identity(e.subject, e.email));
    expect(await resolveAccess({ provider, repository })).toEqual({ status: "denied", reason: "not_admitted" });
    expect(await saveOnboarding({ provider, repository }, onboardingForm(["en"]))).toEqual({ status: "denied" });
    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.user_profile WHERE auth_subject = $1",
      [e.subject],
    );
    expect(rows[0].n).toBe(0);
  });

  it("onboards a learner and shows only their languages on the dashboard", async () => {
    const a = synthetic("a");
    const b = synthetic("b");
    await allow(a.email, ["OWNER", "LEARNER"]);
    await allow(b.email, ["LEARNER"]);
    const providerA = new FakeIdentityProvider(identity(a.subject, a.email));
    const providerB = new FakeIdentityProvider(identity(b.subject, b.email));

    expect(await saveOnboarding({ provider: providerA, repository }, onboardingForm(["zh", "ja"]))).toEqual({
      status: "saved",
    });
    const actorA = await activeActor(providerA);
    const actorB = await activeActor(providerB);

    expect(await loadDashboard(actorA, repository)).toMatchObject({
      isLearner: true,
      isOwner: true,
      timezone: "Asia/Ho_Chi_Minh",
      languages: ["zh", "ja"],
    });
    expect(await loadDashboard(actorB, repository)).toMatchObject({ languages: [], timezone: null });
  });

  it("rejects a cross-owner target and self-escalation fields", async () => {
    const a = synthetic("victim");
    const b = synthetic("attacker");
    await allow(a.email, ["LEARNER"]);
    await allow(b.email, ["LEARNER"]);
    const providerB = new FakeIdentityProvider(identity(b.subject, b.email));
    const victim = await activeActor(new FakeIdentityProvider(identity(a.subject, a.email)));

    const outcome = await saveOnboarding(
      { provider: providerB, repository },
      onboardingForm(["en"], "UTC", [
        ["userId", victim.userId],
        ["role", "OWNER"],
      ]),
    );
    expect(outcome.status).toBe("invalid");
    const attacker = await activeActor(providerB);
    expect(attacker.roles).toEqual(["LEARNER"]);
    expect(await repository.listLanguagePreferences(victim.userId)).toEqual([]);
  });

  it("blocks the next request after suspension mid-session", async () => {
    const d = synthetic("d");
    await allow(d.email, ["LEARNER"]);
    const provider = new FakeIdentityProvider(identity(d.subject, d.email));
    const actor = await activeActor(provider);
    await admin.query(
      "UPDATE kiko.user_profile SET state = 'suspended', authorization_revision = authorization_revision + 1 WHERE id = $1",
      [actor.userId],
    );
    expect(await resolveAccess({ provider, repository })).toEqual({ status: "denied", reason: "suspended" });
    expect(await saveOnboarding({ provider, repository }, onboardingForm(["en"]))).toEqual({ status: "denied" });
  });
});

describe("runtime role grants", () => {
  it.each([
    "UPDATE kiko.user_profile SET state = 'active'",
    "UPDATE kiko.user_profile SET authorization_revision = 99",
    "INSERT INTO kiko.user_role (user_id, role_code) SELECT id, 'OWNER' FROM kiko.user_profile LIMIT 1",
    "SELECT email FROM kiko.allowed_account",
    "SELECT * FROM kiko.audit_event",
    "DELETE FROM kiko.user_language_preference",
    "CREATE TABLE kiko.injected (id int)",
  ])("denies: %s", async (sql) => {
    await expect(app.query(sql)).rejects.toThrow(/permission denied/);
  });
});

describe("scripts/kiko-admin.mjs", () => {
  const script = path.join(process.cwd(), "scripts", "kiko-admin.mjs");
  const run = (args: string[]) =>
    execFileAsync(process.execPath, [script, ...args], {
      env: { ...process.env, DIRECT_URL: inject("adminUrl") },
    });

  it("refuses writes without --yes and prints the local target", async () => {
    const x = synthetic("cli");
    await expect(run(["admit", "--email", x.email, "--roles", "LEARNER"])).rejects.toMatchObject({
      stderr: expect.stringContaining("Re-run with --yes"),
    });
    expect(await admissible(x.email)).toBe(false);
  });

  it("admits, suspends and reactivates an account", async () => {
    const x = synthetic("cli");
    const admitted = await run(["admit", "--email", x.email, "--roles", "LEARNER", "--yes"]);
    expect(admitted.stdout).toContain("Target: localhost");
    expect(await admissible(x.email)).toBe(true);

    const provider = new FakeIdentityProvider(identity(x.subject, x.email));
    await activeActor(provider);

    await run(["suspend", "--email", x.email, "--yes"]);
    expect(await resolveAccess({ provider, repository })).toEqual({ status: "denied", reason: "suspended" });

    await run(["reactivate", "--email", x.email, "--yes"]);
    expect((await resolveAccess({ provider, repository })).status).toBe("active");

    const status = await run(["status", "--email", x.email]);
    expect(status.stdout).toContain("accountState: 'active'");
  });

  it("rejects unknown roles and refuses to re-admit an existing account", async () => {
    const x = synthetic("cli");
    await expect(run(["admit", "--email", x.email, "--roles", "ADMIN", "--yes"])).rejects.toMatchObject({
      stderr: expect.stringContaining("--roles must list OWNER and/or LEARNER"),
    });
    await run(["admit", "--email", x.email, "--roles", "LEARNER", "--yes"]);
    await activeActor(new FakeIdentityProvider(identity(x.subject, x.email)));
    await expect(run(["admit", "--email", x.email, "--roles", "OWNER", "--yes"])).rejects.toMatchObject({
      stderr: expect.stringContaining("already has a Kiko account"),
    });
  });
});
