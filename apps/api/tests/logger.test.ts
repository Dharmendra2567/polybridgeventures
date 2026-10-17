import { describe, it, expect } from "vitest";
import { REDACTED_PATHS } from "../src/infrastructure/logging/logger.js";

describe("Logger Security & Redaction", () => {
  it("Includes critical credential paths in REDACTED_PATHS", () => {
    expect(REDACTED_PATHS).toContain("password");
    expect(REDACTED_PATHS).toContain("passwordHash");
    expect(REDACTED_PATHS).toContain("token");
    expect(REDACTED_PATHS).toContain("req.headers.cookie");
    expect(REDACTED_PATHS).toContain("req.headers.authorization");
  });
});
