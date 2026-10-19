// @vitest-environment node
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { describeTarget, operatorConnectionConfig } from "../../scripts/lib/db.mjs";
import { SCRAM_VERIFIER_PATTERN, scramKeys, scramVerifier } from "../../scripts/lib/scram.mjs";

describe("SCRAM-SHA-256 verifier", () => {
  // RFC 7677 §3 test vector: user "user", password "pencil".
  const salt = Buffer.from("W22ZaJ0SNY7soEsUEjb6gQ==", "base64");
  const authMessage =
    "n=user,r=rOprNGfwEbeRWgbNEkqO,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096,c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0";

  it("derives keys that reproduce the RFC 7677 client proof and server signature", () => {
    const { clientKey, storedKey, serverKey } = scramKeys("pencil", salt, 4096);
    const clientSignature = createHmac("sha256", storedKey).update(authMessage).digest();
    const clientProof = Buffer.from(clientKey.map((byte: number, i: number) => byte ^ clientSignature[i]));
    expect(clientProof.toString("base64")).toBe("dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=");
    const serverSignature = createHmac("sha256", serverKey).update(authMessage).digest("base64");
    expect(serverSignature).toBe("6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=");
  });

  it("formats the verifier as PostgreSQL stores it, without the plaintext", () => {
    const verifier = scramVerifier("pencil", salt, 4096);
    expect(verifier).toMatch(SCRAM_VERIFIER_PATTERN);
    expect(verifier.startsWith("SCRAM-SHA-256$4096:W22ZaJ0SNY7soEsUEjb6gQ==$")).toBe(true);
    expect(verifier).not.toContain("pencil");
    expect(verifier).not.toContain("'");
  });

  it("uses a fresh random salt by default", () => {
    expect(scramVerifier("same")).not.toBe(scramVerifier("same"));
  });
});

describe("operator connection config", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "kiko-ca-"));
  const ca = path.join(dir, "ca.crt");
  writeFileSync(ca, "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n");
  const remote = "postgresql://postgres.ref:pw@aws-0-x.pooler.supabase.com:5432/postgres";

  it.each([
    remote,
    `${remote}?sslmode=require`,
    `${remote}?sslmode=require&sslaccept=strict`,
    `${remote}?sslmode=require&sslcert=${ca}`,
    `${remote}?sslmode=prefer&sslaccept=strict&sslcert=${ca}`,
  ])("refuses a remote URL without verified TLS (%#)", (url) => {
    expect(() => operatorConnectionConfig(url)).toThrow(/verified TLS/);
  });

  it("builds a verifying TLS config for a remote URL with a CA certificate", () => {
    const config = operatorConnectionConfig(`${remote}?sslmode=require&sslaccept=strict&sslcert=${ca}`);
    expect(config).toMatchObject({
      host: "aws-0-x.pooler.supabase.com",
      port: 5432,
      user: "postgres.ref",
      database: "postgres",
      ssl: { rejectUnauthorized: true, servername: "aws-0-x.pooler.supabase.com" },
    });
    expect(typeof config.ssl === "object" ? config.ssl.ca : "").toContain("BEGIN CERTIFICATE");
  });

  it("allows plain connections to loopback only", () => {
    expect(operatorConnectionConfig("postgresql://me@localhost:5432/kiko_flashcard").ssl).toBe(false);
  });

  it("fails clearly when the CA file is missing", () => {
    expect(() =>
      operatorConnectionConfig(`${remote}?sslmode=require&sslaccept=strict&sslcert=/nonexistent/ca.crt`),
    ).toThrow(/cannot be read/);
  });

  it("describes the target without credentials", () => {
    const text = describeTarget(`${remote}?sslmode=require&sslaccept=strict&sslcert=${ca}`);
    expect(text).toBe("aws-0-x.pooler.supabase.com:5432/postgres as postgres (verified TLS)");
    expect(text).not.toContain("pw");
  });
});
