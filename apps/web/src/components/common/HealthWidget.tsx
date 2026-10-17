import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client.js";
import {
  SystemHealthResponse,
  SystemReadinessResponse,
} from "@polybridge/contracts";
import { Badge } from "./Badge.js";
import { Activity, RefreshCw } from "lucide-react";

export const HealthWidget: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [readiness, setReadiness] = useState<SystemReadinessResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, readyData] = await Promise.all([
        apiClient.get<SystemHealthResponse>("/health"),
        apiClient.get<SystemReadinessResponse>("/ready").catch(() => null),
      ]);
      setHealth(healthData);
      setReadiness(readyData);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "API offline or unreachable";
      setError(msg);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="card health-widget-card"
      style={{ padding: "1rem 1.25rem" }}
    >
      <div className="health-widget-bar">
        <div className="health-widget-title">
          <Activity size={18} color="var(--primary-light)" />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            API Engine & DB Status
          </span>
        </div>

        <div className="health-widget-badges">
          {loading && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Checking...
            </span>
          )}

          {health?.status === "ok" ? (
            <Badge variant="success">API v{health.version} Online</Badge>
          ) : error ? (
            <Badge variant="danger">API Offline</Badge>
          ) : (
            <Badge variant="warning">Initializing</Badge>
          )}

          {readiness?.checks?.database === "connected" ? (
            <Badge variant="success">PostgreSQL 16 Active</Badge>
          ) : readiness?.checks?.database === "error" ? (
            <Badge variant="danger">DB Error</Badge>
          ) : (
            <Badge variant="warning">DB Connecting</Badge>
          )}

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="btn btn-outline"
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
            title="Refresh API Status"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};
