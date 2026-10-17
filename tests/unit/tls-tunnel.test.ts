// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import tls from "node:tls";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTlsTunnel } from "../../scripts/lib/tls-tunnel.mjs";

/** Synthetic certificate for "localhost", generated per run (no network). */
function makeCertificate(): { key: string; cert: string } | null {
  try {
    const dir = mkdtempSync(path.join(tmpdir(), "kiko-tunnel-"));
    execFileSync("openssl", [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-keyout", path.join(dir, "key.pem"), "-out", path.join(dir, "cert.pem"),
      "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
    ], { stdio: "ignore" });
    return {
      key: readFileSync(path.join(dir, "key.pem"), "utf8"),
      cert: readFileSync(path.join(dir, "cert.pem"), "utf8"),
    };
  } catch {
    return null;
  }
}

const SSL_REQUEST = Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]);
const material = makeCertificate();

/** Minimal PostgreSQL-like server: answers SSLRequest with 'S', then echoes over TLS. */
function fakePostgres(acceptTls: boolean): Promise<{ port: number; close: () => void; received: string[] }> {
  const received: string[] = [];
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      if (!acceptTls) {
        socket.end("N");
        return;
      }
      socket.write("S");
      const secure = new tls.TLSSocket(socket, { isServer: true, key: material!.key, cert: material!.cert });
      secure.on("data", (chunk) => {
        received.push(chunk.toString());
        secure.write(`echo:${chunk.toString()}`);
      });
      secure.on("error", () => socket.destroy());
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({ port: (server.address() as net.AddressInfo).port, close: () => server.close(), received }),
    ),
  );
}

function roundTrip(port: number, payloads: Buffer[]): Promise<string> {
  return new Promise((resolve) => {
    const client = net.connect(port, "127.0.0.1");
    let output = "";
    client.on("data", (chunk) => {
      output += chunk.toString();
      if (payloads.length > 0) client.write(payloads.shift()!);
      else if (output.includes("echo:")) client.end();
    });
    client.on("close", () => resolve(output));
    client.on("connect", () => client.write(payloads.shift()!));
  });
}

describe.skipIf(!material)("loopback TLS tunnel", () => {
  const servers: { close: () => void }[] = [];
  afterAll(() => servers.forEach((server) => server.close()));

  let trusted: Awaited<ReturnType<typeof fakePostgres>>;
  beforeAll(async () => {
    trusted = await fakePostgres(true);
    servers.push(trusted);
  });

  it("relays bytes over TLS verified against the given CA and declines client SSL negotiation", async () => {
    const tunnel = await startTlsTunnel({ host: "localhost", port: trusted.port, ca: material!.cert });
    const output = await roundTrip(tunnel.port, [SSL_REQUEST, Buffer.from("startup")]);
    await tunnel.close();
    expect(output).toBe("Necho:startup");
    expect(trusted.received).toEqual(["startup"]);
    expect(tunnel.failures).toEqual([]);
  });

  it("refuses to relay when the server certificate is not signed by the CA", async () => {
    const other = makeCertificate()!;
    const tunnel = await startTlsTunnel({ host: "localhost", port: trusted.port, ca: other.cert });
    const before = trusted.received.length;
    const output = await roundTrip(tunnel.port, [Buffer.from("secret-startup")]);
    await tunnel.close();
    expect(output).toBe("");
    expect(tunnel.failures.length).toBe(1);
    expect(trusted.received.length).toBe(before);
  });

  it("refuses when the server declines TLS", async () => {
    const plain = await fakePostgres(false);
    servers.push(plain);
    const tunnel = await startTlsTunnel({ host: "localhost", port: plain.port, ca: material!.cert });
    const output = await roundTrip(tunnel.port, [Buffer.from("secret-startup")]);
    await tunnel.close();
    expect(output).toBe("");
    expect(tunnel.failures).toEqual(["the database server refused TLS"]);
  });

  it("checks the host name, not only the CA", async () => {
    const tunnel = await startTlsTunnel({ host: "127.0.0.1", port: trusted.port, ca: material!.cert });
    const output = await roundTrip(tunnel.port, [Buffer.from("secret-startup")]);
    await tunnel.close();
    expect(output).toBe("");
    expect(tunnel.failures).toEqual(["ERR_TLS_CERT_ALTNAME_INVALID"]);
  });
});
