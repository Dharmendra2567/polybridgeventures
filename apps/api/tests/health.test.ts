import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { loadConfig } from "../src/config/env.js";

describe("Health and System Routes", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock_db",
      COOKIE_SECRET: "test-secret-at-least-32-characters-long-key",
    });
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("GET /api/v1/health returns 200 OK with system status", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.version).toBe("0.1.0");
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });

  it("Propagates or generates x-correlation-id header", async () => {
    const customCorrelationId = "custom-test-correlation-uuid-12345";
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/health",
      headers: {
        "x-correlation-id": customCorrelationId,
      },
    });

    expect(response.headers["x-correlation-id"]).toBe(customCorrelationId);
  });
});
