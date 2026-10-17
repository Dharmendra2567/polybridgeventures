import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient, ApiError } from "../src/services/api-client.js";

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient("/api/v1");
    vi.restoreAllMocks();
  });

  it("Sends GET requests with headers and credentials", async () => {
    const mockData = { status: "ok", version: "0.1.0" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      headers: new Headers(),
    } as Response);

    const result = await client.get("/health");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/health");
    expect(init.credentials).toBe("include");
    expect(
      (init.headers as Record<string, string>)["X-Correlation-ID"],
    ).toBeDefined();
    expect(result).toEqual(mockData);
  });

  it("Throws ApiError when HTTP response is not ok", async () => {
    const errorPayload = {
      error: {
        code: "NOT_FOUND",
        message: "Record not found",
        correlationId: "test-trace-id",
        timestamp: "2026-10-14T00:00:00.000Z",
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => errorPayload,
      headers: new Headers(),
    } as Response);

    await expect(client.get("/missing")).rejects.toThrow(ApiError);
  });
});
