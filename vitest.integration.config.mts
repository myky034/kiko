import path from "node:path";
import { defineConfig } from "vitest/config";

// Integration tests against a real local PostgreSQL (DEC-014). Run with
// `npm run test:integration`; requires KIKO_TEST_DATABASE_URL on localhost.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve(import.meta.dirname, "tests/support/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    // One shared database: run files sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
