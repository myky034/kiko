import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest globals are disabled, so Testing Library cannot register cleanup itself.
afterEach(() => {
  cleanup();
});
