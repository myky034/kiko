// Loopback → verified-TLS tunnel for PostgreSQL (DEC-019).
//
// The Prisma CLI's TLS stack on macOS uses Apple's Security framework, which
// rejects Supabase's pooler certificate (validity > 825 days, no serverAuth
// EKU) even with Supabase's CA. Node's OpenSSL verifies the same chain. The
// tunnel lets Prisma speak plain PostgreSQL to 127.0.0.1 while every byte to
// the remote server travels over TLS verified against the given CA and host
// name. It listens only on loopback, on an ephemeral port, for one command.
import net from "node:net";
import tls from "node:tls";

const SSL_REQUEST = 80877103;
const GSSENC_REQUEST = 80877104;

function isNegotiationRequest(chunk) {
  if (chunk.length < 8 || chunk.readInt32BE(0) !== 8) return false;
  const code = chunk.readInt32BE(4);
  return code === SSL_REQUEST || code === GSSENC_REQUEST;
}

/** Opens a verified TLS session to a PostgreSQL server (SSLRequest first). */
export function connectVerifiedTls({ host, port, ca, timeoutMs = 10_000 }) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, host);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("timeout connecting to the database"));
    }, timeoutMs);
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.once("connect", () => {
      const request = Buffer.alloc(8);
      request.writeInt32BE(8, 0);
      request.writeInt32BE(SSL_REQUEST, 4);
      socket.write(request);
    });
    socket.once("data", (answer) => {
      if (answer.toString("latin1", 0, 1) !== "S") {
        clearTimeout(timer);
        socket.destroy();
        reject(new Error("the database server refused TLS"));
        return;
      }
      const secure = tls.connect({ socket, servername: host, ca, rejectUnauthorized: true });
      secure.once("secureConnect", () => {
        clearTimeout(timer);
        resolve(secure);
      });
      secure.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  });
}

/**
 * Starts the tunnel; resolves to { port, close, failures }. `failures` counts
 * upstream TLS errors (e.g. certificate not trusted) without logging secrets.
 */
export function startTlsTunnel({ host, port, ca }) {
  const failures = [];
  const server = net.createServer((client) => {
    client.pause();
    connectVerifiedTls({ host, port, ca })
      .then((upstream) => {
        const relay = (chunk) => {
          // A client may still try SSL/GSS negotiation; decline locally.
          if (isNegotiationRequest(chunk)) {
            client.write("N");
            client.once("data", relay);
            return;
          }
          upstream.write(chunk);
          client.pipe(upstream);
          upstream.pipe(client);
        };
        client.once("data", relay);
        client.resume();
        const closeBoth = () => {
          client.destroy();
          upstream.destroy();
        };
        client.on("error", closeBoth);
        upstream.on("error", closeBoth);
        client.on("close", () => upstream.destroy());
        upstream.on("close", () => client.destroy());
      })
      .catch((error) => {
        failures.push(error.code ?? error.message);
        client.destroy();
      });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        port: server.address().port,
        failures,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}
