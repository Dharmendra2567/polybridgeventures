import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { loadConfig } from "../src/config/env.js";

describe("Global Error Handler", () => {
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

  it("Returns standard ApiErrorResponse on 404 Not Found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/non-existent-route-for-testing",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);

    expect(body).toHaveProperty("error");
    expect(body.error.code).toBe("NOT_FOUND");
    expect(typeof body.error.message).toBe("string");
    expect(typeof body.error.correlationId).toBe("string");
    expect(typeof body.error.timestamp).toBe("string");
  });
});
