#!/usr/bin/env node
// Kiko operator CLI: account admission and suspension (ACCESS_CONTROL.md §9).
//
// Runs with the migration/operator identity (DIRECT_URL), never the web runtime
// role, and is the only way to grant access until an Owner admin UI exists.
// Every write prints the target host and requires --yes. Never prints secrets.
//
//   npm run kiko:admin -- status     --email <email>
//   npm run kiko:admin -- admit      --email <email> --roles OWNER,LEARNER --yes
//   npm run kiko:admin -- revoke     --email <email> --yes   (blocks future admission)
//   npm run kiko:admin -- suspend    --email <email> --yes   (blocks an admitted account)
//   npm run kiko:admin -- reactivate --email <email> --yes

import { parseArgs } from "node:util";
import pg from "pg";

const PROVIDER = "supabase";
const ROLE_CODES = new Set(["OWNER", "LEARNER"]);
const COMMANDS = new Set(["status", "admit", "revoke", "suspend", "reactivate"]);

function fail(message) {
  console.error(`kiko-admin: ${message}`);
  process.exit(1);
}

try {
  process.loadEnvFile(".env.local");
} catch {
  // Use the process environment.
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    roles: { type: "string" },
    yes: { type: "boolean", default: false },
  },
});

const command = positionals[0];
if (!COMMANDS.has(command)) fail(`unknown command. Use one of: ${[...COMMANDS].join(", ")}`);

const email = (values.email ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 320) fail("a valid --email is required");

const connectionString = process.env.DIRECT_URL;
if (!connectionString) fail("DIRECT_URL is not set");

let target;
try {
  const url = new URL(connectionString);
  target = `${url.hostname}:${url.port || "5432"}${url.pathname} as ${decodeURIComponent(url.username).split(".")[0]}`;
} catch {
  fail("DIRECT_URL is not a valid URL");
}

const writes = command !== "status";
console.log(`Target: ${target}`);
if (writes && !values.yes) fail(`'${command}' changes access. Re-run with --yes after checking the target above.`);

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 10_000 });

async function findAccount() {
  const { rows } = await client.query(
    `SELECT a.id, a.status, a.bound_user_id, p.state, p.authorization_revision,
            coalesce(array_agg(r.role_code ORDER BY r.role_code) FILTER (WHERE r.role_code IS NOT NULL), '{}') AS admitted_roles
     FROM kiko.allowed_account a
     LEFT JOIN kiko.user_profile p ON p.id = a.bound_user_id
     LEFT JOIN kiko.allowed_account_role r ON r.allowed_account_id = a.id
     WHERE a.auth_provider = $1 AND a.email = $2
     GROUP BY a.id, p.state, p.authorization_revision`,
    [PROVIDER, email],
  );
  return rows[0] ?? null;
}

async function audit(action, targetType, targetId, result = "success") {
  await client.query(
    "INSERT INTO kiko.audit_event (action, target_type, target_id, result) VALUES ($1, $2, $3, $4)",
    [action, targetType, targetId, result],
  );
}

async function setProfileState(account, state) {
  if (!account?.bound_user_id) fail("this email has not signed in yet; use 'revoke' to block admission");
  // Revision bump invalidates in-flight writes guarded on the old revision.
  await client.query(
    `UPDATE kiko.user_profile
     SET state = $2, authorization_revision = authorization_revision + 1, updated_at = now()
     WHERE id = $1`,
    [account.bound_user_id, state],
  );
  await audit(`operator.account.${state === "active" ? "reactivate" : "suspend"}`, "user_profile", account.bound_user_id);
}

try {
  await client.connect();
  await client.query("BEGIN");
  const account = await findAccount();

  switch (command) {
    case "status":
      console.log(
        account
          ? {
              admission: account.status,
              admittedRoles: account.admitted_roles,
              signedIn: Boolean(account.bound_user_id),
              accountState: account.state ?? null,
            }
          : "No admission record for this email.",
      );
      break;

    case "admit": {
      const roles = [...new Set((values.roles ?? "").split(",").map((role) => role.trim()).filter(Boolean))];
      if (roles.length === 0 || roles.some((role) => !ROLE_CODES.has(role))) {
        fail("--roles must list OWNER and/or LEARNER, e.g. --roles LEARNER");
      }
      if (account?.bound_user_id) {
        fail("this email already has a Kiko account; role changes are not supported by this script yet");
      }
      const { rows } = await client.query(
        `INSERT INTO kiko.allowed_account (auth_provider, email, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (auth_provider, email) DO UPDATE SET status = 'active', updated_at = now()
         RETURNING id`,
        [PROVIDER, email],
      );
      const accountId = rows[0].id;
      await client.query("DELETE FROM kiko.allowed_account_role WHERE allowed_account_id = $1", [accountId]);
      for (const role of roles) {
        await client.query(
          "INSERT INTO kiko.allowed_account_role (allowed_account_id, role_code) VALUES ($1, $2)",
          [accountId, role],
        );
      }
      await audit("operator.admission.grant", "allowed_account", accountId);
      console.log(`Admitted with roles ${roles.join(", ")}. The account is created at first sign-in.`);
      break;
    }

    case "revoke":
      if (!account) fail("no admission record for this email");
      await client.query(
        "UPDATE kiko.allowed_account SET status = 'revoked', updated_at = now() WHERE id = $1",
        [account.id],
      );
      await audit("operator.admission.revoke", "allowed_account", account.id);
      console.log(
        account.bound_user_id
          ? "Admission revoked. The existing account is still active; run 'suspend' to block it."
          : "Admission revoked.",
      );
      break;

    case "suspend":
      await setProfileState(account, "suspended");
      console.log("Account suspended. Its next request is denied.");
      break;

    case "reactivate":
      await setProfileState(account, "active");
      console.log("Account reactivated.");
      break;
  }

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  // pg errors can echo SQL but not credentials; keep only code and message.
  fail(`failed (${error?.code ?? "error"}): ${error?.message ?? error}`);
} finally {
  await client.end().catch(() => {});
}
