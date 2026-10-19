#!/usr/bin/env node
// Runs a Prisma CLI command against DIRECT_URL with verified TLS (DEC-019).
//
//   node scripts/prisma-remote.mjs migrate status
//   node scripts/prisma-remote.mjs migrate deploy
//
// Remote DIRECT_URL (Prisma dialect, sslaccept=strict + sslcert=<CA>) is
// reached through a loopback tunnel whose upstream TLS is verified by Node's
// OpenSSL; Prisma itself connects to 127.0.0.1 without TLS. Loopback targets
// (local development databases) run Prisma directly. Never prints secrets.
import { spawn } from "node:child_process";
import path from "node:path";
import { describeTarget, isLoopbackHost, operatorConnectionConfig } from "./lib/db.mjs";
import { startTlsTunnel } from "./lib/tls-tunnel.mjs";

const PRISMA_BIN = path.join(process.cwd(), "node_modules", ".bin", "prisma");

function fail(message) {
  console.error(`prisma-remote: ${message}`);
  process.exit(1);
}

try {
  process.loadEnvFile(".env.local");
} catch {
  // Use the process environment.
}

const args = process.argv.slice(2);
if (args.length === 0) fail("usage: node scripts/prisma-remote.mjs <prisma command…>");

const directUrl = process.env.DIRECT_URL;
let config;
try {
  config = operatorConnectionConfig(directUrl); // enforces verified TLS for remote hosts
} catch (error) {
  fail(error.message);
}

function runPrisma(databaseUrl) {
  return new Promise((resolve) => {
    const child = spawn(PRISMA_BIN, args, {
      stdio: "inherit",
      env: { ...process.env, DIRECT_URL: databaseUrl },
    });
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

const original = new URL(directUrl);
if (isLoopbackHost(original.hostname)) {
  process.exit(await runPrisma(directUrl));
}

const tunnel = await startTlsTunnel({ host: config.host, port: config.port, ca: config.ssl.ca });
const local = new URL(original.href);
local.hostname = "127.0.0.1";
local.port = String(tunnel.port);
local.search = "";
local.searchParams.set("sslmode", "disable");

console.log(`Target: ${describeTarget(directUrl)} via loopback tunnel 127.0.0.1:${tunnel.port}`);
const exitCode = await runPrisma(local.href);
await tunnel.close();
if (tunnel.failures.length > 0) {
  console.error(`prisma-remote: upstream TLS failed (${[...new Set(tunnel.failures)].join(", ")}); nothing was sent unencrypted.`);
  process.exit(exitCode || 1);
}
process.exit(exitCode);
