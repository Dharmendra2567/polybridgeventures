import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock_db",
      COOKIE_SECRET: "test-secret-at-least-32-characters-long-key",
      CORS_ORIGIN: "http://localhost:5173",
    },
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
