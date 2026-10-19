// Shared database helpers for operator scripts (DEC-015). Never prints secrets.
import { readFileSync } from "node:fs";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLoopbackHost(hostname) {
  return LOOPBACK_HOSTS.has(hostname);
}

/**
 * pg connection config from a Prisma-style DIRECT_URL. Remote hosts require
 * verified TLS, expressed in Prisma's dialect so the same URL works for the
 * Prisma CLI: ?sslmode=require&sslaccept=strict&sslcert=<CA certificate path>.
 */
export function operatorConnectionConfig(rawUrl) {
  if (!rawUrl) throw new Error("DIRECT_URL is not set");
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("DIRECT_URL is not a valid URL");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DIRECT_URL is not a PostgreSQL URL");
  }

  const caPath = url.searchParams.get("sslcert");
  const strict =
    url.searchParams.get("sslmode") === "require" && url.searchParams.get("sslaccept") === "strict";
  const loopback = isLoopbackHost(url.hostname);
  if (!loopback && !(strict && caPath)) {
    throw new Error(
      "DIRECT_URL must use verified TLS for a remote database: append " +
        "?sslmode=require&sslaccept=strict&sslcert=<absolute path to the Supabase CA certificate>",
    );
  }

  let ca;
  if (caPath) {
    try {
      ca = readFileSync(caPath, "utf8");
    } catch {
      throw new Error("the CA certificate referenced by sslcert in DIRECT_URL cannot be read");
    }
  }

  return {
    host: url.hostname.replace(/^\[|\]$/g, ""),
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)) || "postgres",
    ssl: ca ? { ca, rejectUnauthorized: true, servername: url.hostname } : false,
    connectionTimeoutMillis: 10_000,
  };
}

/** host:port/db as role — for confirmation prompts; no credentials. */
export function describeTarget(rawUrl) {
  const url = new URL(rawUrl);
  const role = decodeURIComponent(url.username).split(".")[0];
  const tls = url.searchParams.get("sslaccept") === "strict" ? "verified TLS" : "no verified TLS";
  return `${url.hostname}:${url.port || "5432"}${url.pathname} as ${role} (${tls})`;
}
