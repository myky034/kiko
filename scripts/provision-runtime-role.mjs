#!/usr/bin/env node
// Enables (or rotates) the kiko_app runtime login and writes DATABASE_URL to
// .env.local (DEC-006, DEC-015). Creates a credential: run only with approval.
//
//   npm run db:provision-runtime -- --yes
//
// - Connects with the operator identity (DIRECT_URL) over verified TLS.
// - Generates a random password locally and sends only its SCRAM-SHA-256
//   verifier; the plaintext never leaves this machine and is never printed.
// - Verifies the new login through the Supavisor transaction pooler (6543)
//   with verified TLS, then replaces DATABASE_URL in .env.local (mode 600).
// Re-running rotates the password; the previous DATABASE_URL stops working.

import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import pg from "pg";
import { describeTarget, isLoopbackHost, operatorConnectionConfig } from "./lib/db.mjs";
import { SCRAM_VERIFIER_PATTERN, scramVerifier } from "./lib/scram.mjs";

const ENV_FILE = ".env.local";
const RUNTIME_ROLE = "kiko_app";
const POOLER_TRANSACTION_PORT = "6543";

function fail(message) {
  console.error(`provision-runtime-role: ${message}`);
  process.exit(1);
}

try {
  process.loadEnvFile(ENV_FILE);
} catch {
  fail(`${ENV_FILE} not found`);
}

const { values } = parseArgs({ options: { yes: { type: "boolean", default: false } } });

const directUrl = process.env.DIRECT_URL;
let operatorConfig;
try {
  operatorConfig = operatorConnectionConfig(directUrl);
} catch (error) {
  fail(error.message);
}

const direct = new URL(directUrl);
// The runtime URL is derived from the session-pooler DIRECT_URL:
// user postgres.<project-ref> on <region>.pooler.supabase.com.
const [operatorRole, projectRef] = decodeURIComponent(direct.username).split(".");
const remote = !isLoopbackHost(direct.hostname);
if (remote && (!projectRef || !direct.hostname.endsWith(".pooler.supabase.com"))) {
  fail("DIRECT_URL must be the Supavisor session pooler URL (user postgres.<project-ref>, host *.pooler.supabase.com)");
}

console.log(`Target: ${describeTarget(directUrl)}`);
console.log(`Action: enable LOGIN for ${RUNTIME_ROLE} with a new generated password and update DATABASE_URL in ${ENV_FILE}.`);
if (!values.yes) fail("this creates a database credential. Re-run with --yes after checking the target above.");
if (operatorRole !== "postgres" && remote) fail("DIRECT_URL must use the postgres operator role");

const password = randomBytes(32).toString("base64url");
const verifier = scramVerifier(password);
if (!SCRAM_VERIFIER_PATTERN.test(verifier)) fail("internal error: unexpected verifier format");

const operator = new pg.Client(operatorConfig);
try {
  await operator.connect();
  await operator.query("BEGIN");
  const role = await operator.query(
    "SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = $1",
    [RUNTIME_ROLE],
  );
  if (role.rowCount !== 1) fail(`${RUNTIME_ROLE} does not exist; apply migrations first (npm run db:migrate:deploy)`);
  const attributes = role.rows[0];
  if (attributes.rolsuper || attributes.rolbypassrls || attributes.rolcreaterole || attributes.rolcreatedb) {
    fail(`${RUNTIME_ROLE} has unexpected privileges; refusing to enable its login`);
  }
  // Verifier charset is [A-Za-z0-9+/=$:-]; no quoting issues (checked above).
  await operator.query(`ALTER ROLE ${RUNTIME_ROLE} WITH LOGIN PASSWORD '${verifier}'`);
  await operator.query(
    "INSERT INTO kiko.audit_event (action, target_type, target_id, result) VALUES ('operator.runtime_role.credential_set', 'role', $1, 'success')",
    [RUNTIME_ROLE],
  );
  await operator.query("COMMIT");
} catch (error) {
  await operator.query("ROLLBACK").catch(() => {});
  fail(`failed to set the credential (${error?.code ?? "error"}): ${error?.message ?? error}`);
} finally {
  await operator.end().catch(() => {});
}

// Runtime URL in pg's dialect (used by @prisma/adapter-pg): verify-full TLS.
const runtime = new URL(direct.href);
runtime.search = "";
runtime.username = remote ? `${RUNTIME_ROLE}.${projectRef}` : RUNTIME_ROLE;
runtime.password = password;
if (remote) {
  runtime.port = POOLER_TRANSACTION_PORT;
  runtime.searchParams.set("sslmode", "verify-full");
  runtime.searchParams.set("sslrootcert", direct.searchParams.get("sslcert"));
}

// Confirm the login works before touching .env.local. Supavisor may take a few
// seconds to accept a new password.
let verified = false;
for (let attempt = 1; attempt <= 6 && !verified; attempt += 1) {
  const probe = new pg.Client({ connectionString: runtime.href, connectionTimeoutMillis: 10_000 });
  try {
    await probe.connect();
    const { rows } = await probe.query("SELECT current_user AS role");
    verified = rows[0].role === RUNTIME_ROLE;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  } finally {
    await probe.end().catch(() => {});
  }
}
if (!verified) {
  fail(`${RUNTIME_ROLE} login could not be verified through the pooler; ${ENV_FILE} was not changed. Re-run to rotate again.`);
}

// Replace (or add) DATABASE_URL atomically, keeping every other line as is.
const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split("\n") : [];
const entry = `DATABASE_URL=${runtime.href}`;
const index = lines.findIndex((line) => /^\s*DATABASE_URL\s*=/.test(line));
if (index >= 0) lines[index] = entry;
else lines.splice(lines.length && lines.at(-1) === "" ? lines.length - 1 : lines.length, 0, entry);
const temporary = `${ENV_FILE}.tmp-${process.pid}`;
writeFileSync(temporary, lines.join("\n"), { mode: 0o600 });
renameSync(temporary, ENV_FILE);
chmodSync(ENV_FILE, 0o600);

console.log(
  `Done: ${RUNTIME_ROLE} can log in; DATABASE_URL in ${ENV_FILE} now uses ${runtime.hostname}:${runtime.port || "5432"}` +
    `${remote ? " with verify-full TLS" : ""}. The password was not displayed.`,
);
