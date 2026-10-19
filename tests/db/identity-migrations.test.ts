// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import {
  admitEmail,
  asRole,
  createMigratedDatabase,
  errorOf,
} from "../support/pglite-database";

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDatabase();
}, 60_000);

async function admit(subject: string, email: string): Promise<string | null> {
  const result = await asRole(db, "kiko_app", () =>
    db.query<{ id: string | null }>(
      "SELECT kiko.admit_identity('supabase', $1, $2) AS id",
      [subject, email],
    ),
  );
  return result.rows[0].id;
}

async function rolesOf(userId: string): Promise<string[]> {
  const result = await db.query<{ role_code: string }>(
    "SELECT role_code FROM kiko.user_role WHERE user_id = $1 ORDER BY role_code",
    [userId],
  );
  return result.rows.map((row) => row.role_code);
}

describe("reference data", () => {
  it("seeds exactly zh/ja/en and OWNER/LEARNER", async () => {
    const languages = await db.query<{ code: string }>(
      "SELECT code FROM kiko.language ORDER BY code",
    );
    expect(languages.rows.map((row) => row.code)).toEqual(["en", "ja", "zh"]);
    const roles = await db.query<{ code: string }>("SELECT code FROM kiko.role ORDER BY code");
    expect(roles.rows.map((row) => row.code)).toEqual(["LEARNER", "OWNER"]);
  });

  it("rejects unknown languages and roles", async () => {
    expect(await errorOf(db.query("INSERT INTO kiko.language VALUES ('ko')"))).toMatch(
      /language_code_check/,
    );
    expect(await errorOf(db.query("INSERT INTO kiko.role VALUES ('ADMIN')"))).toMatch(
      /role_code_check/,
    );
  });
});

describe("constraints", () => {
  it("requires normalized admission emails", async () => {
    for (const email of ["Owner@Example.test", " a@example.test", "no-at-sign", "@x"]) {
      expect(
        await errorOf(db.query("INSERT INTO kiko.allowed_account (email) VALUES ($1)", [email])),
      ).toMatch(/allowed_account_email_check/);
    }
  });

  it("binds subject and user together, including NULL combinations", async () => {
    const account = await admitEmail(db, "binding@example.test", ["LEARNER"]);
    const userId = await admit("subject-binding", "binding@example.test");
    expect(userId).not.toBeNull();

    expect(
      await errorOf(
        db.query("UPDATE kiko.allowed_account SET bound_subject = NULL WHERE id = $1", [account]),
      ),
    ).toMatch(/allowed_account_binding_check/);
    expect(
      await errorOf(
        db.query("UPDATE kiko.allowed_account SET bound_user_id = NULL WHERE id = $1", [account]),
      ),
    ).toMatch(/allowed_account_binding_check/);
  });

  it("requires a timezone once onboarded and a positive revision", async () => {
    await admitEmail(db, "checks@example.test", ["LEARNER"]);
    const userId = await admit("subject-checks", "checks@example.test");

    expect(
      await errorOf(
        db.query("UPDATE kiko.user_profile SET onboarded_at = now() WHERE id = $1", [userId]),
      ),
    ).toMatch(/user_profile_onboarded_timezone_check/);
    expect(
      await errorOf(
        db.query("UPDATE kiko.user_profile SET authorization_revision = 0 WHERE id = $1", [userId]),
      ),
    ).toMatch(/user_profile_revision_check/);
    expect(
      await errorOf(
        db.query("UPDATE kiko.user_profile SET authorization_revision = NULL WHERE id = $1", [
          userId,
        ]),
      ),
    ).toMatch(/null value/);
  });

  it("does not accept a language preference for an unsupported language", async () => {
    await admitEmail(db, "prefs@example.test", ["LEARNER"]);
    const userId = await admit("subject-prefs", "prefs@example.test");
    expect(
      await errorOf(
        db.query(
          "INSERT INTO kiko.user_language_preference (user_id, language_code) VALUES ($1, 'fr')",
          [userId],
        ),
      ),
    ).toMatch(/foreign key/);
  });
});

describe("admission function", () => {
  it("admits a pre-approved email once with exactly the granted roles", async () => {
    await admitEmail(db, "owner@example.test", ["OWNER", "LEARNER"]);

    const first = await admit("subject-owner", "Owner@Example.test");
    expect(first).not.toBeNull();
    expect(await rolesOf(first!)).toEqual(["LEARNER", "OWNER"]);

    const profile = await db.query<{ state: string }>(
      "SELECT state FROM kiko.user_profile WHERE id = $1",
      [first],
    );
    expect(profile.rows[0].state).toBe("active");

    // Retried first sign-in: same profile, no duplicate rows.
    expect(await admit("subject-owner", "owner@example.test")).toBe(first);
    const count = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.user_profile WHERE auth_subject = 'subject-owner'",
    );
    expect(count.rows[0].n).toBe(1);
  });

  it("does not admit an identity whose email was never approved", async () => {
    expect(await admit("subject-stranger", "stranger@example.test")).toBeNull();
    const profiles = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM kiko.user_profile WHERE auth_subject = 'subject-stranger'",
    );
    expect(profiles.rows[0].n).toBe(0);
  });

  it("does not admit a revoked email", async () => {
    const account = await admitEmail(db, "revoked@example.test", ["LEARNER"]);
    await db.query("UPDATE kiko.allowed_account SET status = 'revoked' WHERE id = $1", [account]);
    expect(await admit("subject-revoked", "revoked@example.test")).toBeNull();
  });

  it("does not rebind an admitted email to a different provider subject", async () => {
    await admitEmail(db, "bound@example.test", ["LEARNER"]);
    expect(await admit("subject-bound-1", "bound@example.test")).not.toBeNull();
    expect(await admit("subject-bound-2", "bound@example.test")).toBeNull();
  });

  it("records admissions in the audit log without emails", async () => {
    const rows = await db.query<{ action: string; result: string; target_id: string | null }>(
      "SELECT action, result, target_id FROM kiko.audit_event",
    );
    expect(rows.rows.some((row) => row.result === "success")).toBe(true);
    expect(rows.rows.some((row) => row.result === "denied")).toBe(true);
    expect(JSON.stringify(rows.rows)).not.toContain("@");
  });

  it("reports admissible emails without revealing anything else", async () => {
    const check = (email: string) =>
      asRole(db, "kiko_app", () =>
        db.query<{ ok: boolean }>("SELECT kiko.is_email_admissible('supabase', $1) AS ok", [email]),
      );
    expect((await check(" OWNER@example.test ")).rows[0].ok).toBe(true);
    expect((await check("stranger@example.test")).rows[0].ok).toBe(false);
    expect((await check("revoked@example.test")).rows[0].ok).toBe(false);
  });
});

describe("runtime role kiko_app", () => {
  let userId: string;

  beforeAll(async () => {
    await admitEmail(db, "runtime@example.test", ["LEARNER"]);
    userId = (await admit("subject-runtime", "runtime@example.test"))!;
  });

  it("can save onboarding preference columns", async () => {
    const error = await asRole(db, "kiko_app", () =>
      errorOf(
        db.query(
          "UPDATE kiko.user_profile SET timezone = 'Asia/Tokyo', onboarded_at = now(), version = version + 1 WHERE id = $1",
          [userId],
        ),
      ),
    );
    expect(error).toBeNull();
    const insert = await asRole(db, "kiko_app", () =>
      errorOf(
        db.query(
          "INSERT INTO kiko.user_language_preference (user_id, language_code, enabled) VALUES ($1, 'ja', true)",
          [userId],
        ),
      ),
    );
    expect(insert).toBeNull();
  });

  it.each([
    ["state", "UPDATE kiko.user_profile SET state = 'active' WHERE id = $1"],
    ["revision", "UPDATE kiko.user_profile SET authorization_revision = 99 WHERE id = $1"],
    ["identity binding", "UPDATE kiko.user_profile SET auth_subject = 'other' WHERE id = $1"],
    ["role grant", "INSERT INTO kiko.user_role (user_id, role_code) VALUES ($1, 'OWNER')"],
    ["profile creation", "INSERT INTO kiko.user_profile (id, auth_provider, auth_subject) VALUES ($1, 'supabase', 'x')"],
    ["profile deletion", "DELETE FROM kiko.user_profile WHERE id = $1"],
  ])("cannot change %s (self-escalation)", async (_label, sql) => {
    const error = await asRole(db, "kiko_app", () => errorOf(db.query(sql, [userId])));
    expect(error).toMatch(/permission denied/);
  });

  it("cannot read or edit the admission allowlist directly", async () => {
    for (const sql of [
      "SELECT email FROM kiko.allowed_account",
      "INSERT INTO kiko.allowed_account (email) VALUES ('self@example.test')",
      "SELECT * FROM kiko.allowed_account_role",
    ]) {
      const error = await asRole(db, "kiko_app", () => errorOf(db.query(sql)));
      expect(error).toMatch(/permission denied/);
    }
  });

  it("can append audit rows without RETURNING, but not read them back", async () => {
    const insert =
      "INSERT INTO kiko.audit_event (actor_user_id, action, target_type, target_id, result) VALUES ($1::uuid, 'profile.onboarding', 'user_profile', $1::text, 'success')";
    expect(await asRole(db, "kiko_app", () => errorOf(db.query(insert, [userId])))).toBeNull();
    expect(
      await asRole(db, "kiko_app", () => errorOf(db.query(`${insert} RETURNING id`, [userId]))),
    ).toMatch(/permission denied/);
  });

  it("can upsert its own preference rows as the repository does", async () => {
    const upsert = `INSERT INTO kiko.user_language_preference (user_id, language_code, enabled, updated_at)
      VALUES ($1, 'zh', true, now())
      ON CONFLICT (user_id, language_code) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = EXCLUDED.updated_at
      RETURNING user_id, language_code, enabled`;
    expect(await asRole(db, "kiko_app", () => errorOf(db.query(upsert, [userId])))).toBeNull();
    expect(await asRole(db, "kiko_app", () => errorOf(db.query(upsert, [userId])))).toBeNull();
  });

  it("cannot rewrite or read the audit log", async () => {
    for (const sql of ["SELECT * FROM kiko.audit_event", "DELETE FROM kiko.audit_event"]) {
      const error = await asRole(db, "kiko_app", () => errorOf(db.query(sql)));
      expect(error).toMatch(/permission denied/);
    }
  });
});

describe("Supabase API roles", () => {
  it.each(["anon", "authenticated", "service_role"])(
    "%s cannot read Kiko tables or call admission",
    async (role) => {
      for (const sql of [
        "SELECT * FROM kiko.user_profile",
        "SELECT kiko.admit_identity('supabase', 'x', 'owner@example.test')",
        "SELECT kiko.is_email_admissible('supabase', 'owner@example.test')",
      ]) {
        const error = await asRole(db, role, () => errorOf(db.query(sql)));
        expect(error).toMatch(/permission denied/);
      }
    },
  );

  it("PUBLIC has no execute right on admission functions", async () => {
    const result = await db.query<{ granted: boolean }>(
      "SELECT has_function_privilege('public', 'kiko.admit_identity(text, text, text)', 'EXECUTE') AS granted",
    );
    expect(result.rows[0].granted).toBe(false);
  });
});

describe("migration history table", () => {
  it("is not reachable by Supabase API roles despite public default privileges", async () => {
    const rls = await db.query<{ relrowsecurity: boolean }>(
      "SELECT relrowsecurity FROM pg_class WHERE oid = 'public._prisma_migrations'::regclass",
    );
    expect(rls.rows[0].relrowsecurity).toBe(true);
    for (const role of ["anon", "authenticated", "service_role"]) {
      for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        const result = await db.query<{ granted: boolean }>(
          "SELECT has_table_privilege($1, 'public._prisma_migrations', $2) AS granted",
          [role, privilege],
        );
        expect(result.rows[0].granted, `${role} ${privilege}`).toBe(false);
      }
    }
  });

  it("still lets other new public tables inherit the emulated defaults (control)", async () => {
    await db.exec("CREATE TABLE public.control_table (id int)");
    const result = await db.query<{ granted: boolean }>(
      "SELECT has_table_privilege('anon', 'public.control_table', 'SELECT') AS granted",
    );
    expect(result.rows[0].granted).toBe(true);
    await db.exec("DROP TABLE public.control_table");
  });
});
