import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["tests/convex/**/*.test.ts"],
    env: { ADMIN_MFA_ENC_KEY: "test-only-encryption-key-0123456789abcdef" },
  },
});
