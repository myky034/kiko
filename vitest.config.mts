import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Needs a local PostgreSQL; run with `npm run test:integration`.
    exclude: ["tests/integration/**"],
    setupFiles: ["tests/setup.ts"],
  },
});
