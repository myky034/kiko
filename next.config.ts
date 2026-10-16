import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // `next dev` otherwise appends a managed block to the repository's own
  // AGENTS.md, which is project-owned guidance (AGENTS.md §15, §19).
  agentRules: false,
};

export default nextConfig;
