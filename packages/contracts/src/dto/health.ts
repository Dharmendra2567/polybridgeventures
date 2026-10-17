/**
 * Liveness and Readiness check contracts for Fastify API.
 */
export interface SystemHealthResponse {
  status: "ok" | "degraded" | "unhealthy";
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface SystemReadinessResponse {
  status: "ready" | "not_ready";
  checks: {
    database: "connected" | "disconnected" | "error";
    storage: "ready" | "degraded";
  };
  timestamp: string;
}
