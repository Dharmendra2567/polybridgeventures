import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config/env.js";

describe("Environment Configuration Validation", () => {
  it("Fails fast if COOKIE_SECRET is shorter than 32 characters", () => {
    expect(() => {
      loadConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://localhost:5432/db",
        COOKIE_SECRET: "short-secret",
      });
    }).toThrow(/COOKIE_SECRET must be at least 32 characters/);
  });

  it("Succeeds with valid configuration overrides", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://localhost:5432/valid_db",
      COOKIE_SECRET: "this-is-a-valid-cryptographic-32-character-secret-key",
    });

    expect(config.NODE_ENV).toBe("test");
    expect(config.DATABASE_URL).toBe("postgresql://localhost:5432/valid_db");
  });
});
