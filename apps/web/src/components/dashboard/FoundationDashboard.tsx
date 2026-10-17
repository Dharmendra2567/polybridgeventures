import React from "react";
import { Card } from "../common/Card.js";
import { Badge } from "../common/Badge.js";
import { HealthWidget } from "../common/HealthWidget.js";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Database,
  GitBranch,
  Network,
  Users2,
  Terminal,
} from "lucide-react";

export const FoundationDashboard: React.FC = () => {
  const phaseGates = [
    {
      id: 0,
      title: "Phase 0: Discovery & Architecture",
      status: "Completed",
      date: "2026-10-14",
      badge: "success",
    },
    {
      id: 1,
      title: "Phase 1: Secure Foundation",
      status: "In Progress (Active)",
      date: "Current",
      badge: "primary",
    },
    {
      id: 2,
      title: "Phase 2: Identity, Access & RBAC",
      status: "Queued",
      date: "Next Gate",
      badge: "warning",
    },
    {
      id: 3,
      title: "Phase 3: CRM & Master Data",
      status: "Planned",
      date: "Sprint 2",
      badge: "warning",
    },
    {
      id: 4,
      title: "Phase 4: Commercial Workflows",
      status: "Planned",
      date: "Sprint 3",
      badge: "warning",
    },
    {
      id: 5,
      title: "Phase 5: Fulfilment & Finance",
      status: "Planned",
      date: "Sprint 4",
      badge: "warning",
    },
    {
      id: 6,
      title: "Phase 6: Reporting & Documents",
      status: "Planned",
      date: "Sprint 5",
      badge: "warning",
    },
    {
      id: 7,
      title: "Phase 7: Production Hardening",
      status: "Planned",
      date: "Final Gate",
      badge: "warning",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Real-time Health and System Connectivity Bar */}
      <HealthWidget />

      {/* Top Metric Highlights */}
      <div className="grid-4">
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <Layers size={18} color="var(--primary-light)" />
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              Architecture
            </span>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
            Modular Monolith
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
            }}
          >
            Domain-Driven Design (DDD) with 15 bounded modules
          </p>
        </Card>

        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <Database size={18} color="var(--success)" />
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              Persistence
            </span>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
            PostgreSQL 16
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
            }}
          >
            Prisma ORM with UUIDv7 and Decimal(14,4) precision
          </p>
        </Card>

        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <ShieldCheck size={18} color="var(--info)" />
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              Security Target
            </span>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
            OWASP ASVS L2
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
            }}
          >
            API Security Top 10 + STRIDE Threat Model
          </p>
        </Card>

        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <Users2 size={18} color="var(--warning)" />
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              User Hierarchy
            </span>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
            Dynamic Scoping
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
            }}
          >
            Department, Designation, Manager Tree & RBAC
          </p>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid-2">
        {/* Left Column: Architectural Foundations Verified in Phase 1 */}
        <Card
          title={
            <>
              <CheckCircle2 size={18} color="var(--success)" />
              <span>Phase 1 Verified Foundation Controls</span>
            </>
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.75rem",
                background: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <GitBranch
                size={20}
                color="var(--primary-light)"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  pnpm Monorepo Workspaces
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Separation of <code>apps/api</code>, <code>apps/web</code>,
                  and shared <code>packages/contracts</code>. Zero schema drift
                  across API network boundaries.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.75rem",
                background: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Lock
                size={20}
                color="var(--info)"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  Fastify Security Suite
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Integrated <code>@fastify/helmet</code> (Content Security
                  Policy), <code>@fastify/cors</code> (strict origin checking),
                  and <code>@fastify/rate-limit</code>.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.75rem",
                background: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Network
                size={20}
                color="var(--warning)"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  Correlation Tracking & Structured Logs
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Automatic <code>X-Correlation-ID</code> propagation and
                  structured Pino JSON logging with built-in redaction for
                  passwords, session tokens, and cookies.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.75rem",
                background: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Terminal
                size={20}
                color="var(--success)"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  Standardized Error & Health Envelope
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Uniform <code>ApiErrorResponse</code> contract masks internal
                  database stack traces in production while retaining full
                  forensic trace IDs.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column: Implementation Phase Gates */}
        <Card
          title={
            <>
              <Layers size={18} color="var(--primary-light)" />
              <span>Implementation Roadmap & Phase Gates</span>
            </>
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
          >
            {phaseGates.map((gate) => (
              <div
                key={gate.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background:
                    gate.id === 1
                      ? "var(--primary-subtle)"
                      : "var(--bg-surface-elevated)",
                  border:
                    gate.id === 1
                      ? "1px solid var(--border-glow)"
                      : "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color:
                        gate.id === 1
                          ? "var(--primary-light)"
                          : "var(--text-primary)",
                    }}
                  >
                    {gate.title}
                  </div>
                  <div
                    style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                  >
                    {gate.date}
                  </div>
                </div>

                <Badge
                  variant={gate.badge as "primary" | "success" | "warning"}
                >
                  {gate.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* User Role Architecture Showcase (ADR-007) */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users2 size={18} color="var(--primary-light)" />
            <span>
              Standard User Role Architecture & Hierarchical Scopes (ADR-007)
            </span>
          </div>
        }
      >
        <div className="grid-3">
          <div
            style={{
              padding: "1rem",
              background: "var(--bg-surface-elevated)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <h4
              style={{
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
                color: "var(--primary-light)",
              }}
            >
              1. Organizational Hierarchy
            </h4>
            <ul
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                paddingLeft: "1.2rem",
                lineHeight: "1.7",
              }}
            >
              <li>
                <strong>Department:</strong> Sales, Procurement, Operations,
                Finance, IT
              </li>
              <li>
                <strong>Subdepartment:</strong> Inside Sales, Sourcing Desk,
                Accounts Payable
              </li>
              <li>
                <strong>Designation:</strong> Junior Trader, Senior Sourcing
                Lead, Finance Director
              </li>
            </ul>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "var(--bg-surface-elevated)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <h4
              style={{
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
                color: "var(--primary-light)",
              }}
            >
              2. Manager Tree & Approvals
            </h4>
            <ul
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                paddingLeft: "1.2rem",
                lineHeight: "1.7",
              }}
            >
              <li>
                <strong>reporting_to:</strong> Self-referential supervisor tree
                in database
              </li>
              <li>
                <strong>Escalations:</strong> Quotes & POs route to authorized
                supervisor
              </li>
              <li>
                <strong>Separation of Duties:</strong> Self-approval strictly
                forbidden
              </li>
            </ul>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "var(--bg-surface-elevated)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <h4
              style={{
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
                color: "var(--primary-light)",
              }}
            >
              3. Dynamic Data Scopes
            </h4>
            <ul
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                paddingLeft: "1.2rem",
                lineHeight: "1.7",
              }}
            >
              <li>
                <code>OWN_ONLY</code>: Direct creator/assignee
              </li>
              <li>
                <code>TEAM_AND_SUBORDINATES</code>: Recursive supervisor tree
              </li>
              <li>
                <code>DEPARTMENT</code> / <code>GLOBAL</code>: Branch &
                executive scope
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
