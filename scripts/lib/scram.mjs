// SCRAM-SHA-256 password verifier in PostgreSQL's stored format (RFC 5802 /
// RFC 7677). Lets an operator set a role password without the plaintext ever
// leaving this machine: only the verifier is sent to the server.
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";

export const SCRAM_ITERATIONS = 4096;

function hmac(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

/** Keys derived from a password; exported for RFC test vectors. */
export function scramKeys(password, salt, iterations = SCRAM_ITERATIONS) {
  const saltedPassword = pbkdf2Sync(password.normalize("NFKC"), salt, iterations, 32, "sha256");
  const clientKey = hmac(saltedPassword, "Client Key");
  return {
    clientKey,
    storedKey: createHash("sha256").update(clientKey).digest(),
    serverKey: hmac(saltedPassword, "Server Key"),
  };
}

/** `SCRAM-SHA-256$<iterations>:<salt>$<StoredKey>:<ServerKey>` (base64). */
export function scramVerifier(password, salt = randomBytes(16), iterations = SCRAM_ITERATIONS) {
  const { storedKey, serverKey } = scramKeys(password, salt, iterations);
  return `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
}

export const SCRAM_VERIFIER_PATTERN = /^SCRAM-SHA-256\$\d+:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;
