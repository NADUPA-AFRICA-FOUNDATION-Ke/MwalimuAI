import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["tests/convex/**/*.test.ts", "tests/app/**/*.test.ts"],
    env: { ADMIN_MFA_ENC_KEY: "test-only-encryption-key-0123456789abcdef", EMAIL_SEND_SPACING_MS: "0", RESEND_API_KEY: "test-key", SITE_URL: "https://example.test" },
  },
});
