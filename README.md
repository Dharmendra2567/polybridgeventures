# Polybridge Ventures — Trading Management CRM

Enterprise-grade Trading Management CRM engineered with Domain-Driven Design (DDD) as a Modular Monolith.

---

## 1. Project Overview

Polybridge Ventures operates an international trading business sourcing commodities and products from global suppliers and delivering them to commercial customers. The operating model utilizes both **supplier-direct delivery (drop-shipping)** and a foundation for future warehouse-based inventory.

### Key Technology Stack:

- **Backend:** Node.js 20+, TypeScript, Fastify, Prisma ORM, PostgreSQL 16
- **Frontend:** React 18, TypeScript, Vite SPA
- **Architecture:** Bounded Modular Monolith with Domain-Driven Design
- **Security Baseline:** OWASP ASVS 5.0 (Level 2), OWASP API Security Top 10 (2023), NIST CSF 2.0
- **Repository Structure:** pnpm Monorepo Workspaces

---

## 2. Implementation Status & Phase Gates

The implementation strictly follows the gated phases defined in the Master Specification:

- [x] **Phase 0 — Discovery and Architecture (COMPLETED)**
  - System context and module boundary diagrams
  - Domain glossary and core business workflows
  - Global entity-relationship model and database schemas
  - Threat model with STRIDE analysis and trust boundaries
  - Security control verification checklist (ASVS 5.0 & API Top 10)
  - Comprehensive Architecture Decision Records (ADR-001 through ADR-007)
  - Catalog of open business questions and requirements log
- [x] **Phase 1 — Secure Foundation (COMPLETED)**
  - pnpm monorepo workspaces initialized (`apps/api`, `apps/web`, `packages/*`)
  - Strict TypeScript configuration across workspaces
  - Unified ESLint flat config and Prettier code formatting
  - Environment configuration validation with Zod (fail-fast on missing secrets)
  - Fastify server bootstrap with `@fastify/helmet` (CSP), `@fastify/cors`, `@fastify/cookie`, and `@fastify/rate-limit`
  - Structured Pino JSON logging with automated credential and token redaction
  - Standardized `ApiErrorResponse` error envelope with trace correlation IDs (`X-Correlation-ID`)
  - Automated health check (`GET /api/v1/health`) and readiness check (`GET /api/v1/ready`)
  - Foundational Prisma schema for Organization, Department, Subdepartment, Designation, User (manager tree), Roles, Permissions, RolePermissions, UserSessions, and AuditLogs
  - React 18 + Vite SPA with vanilla CSS design system, dark/light theme, accessible Error Boundary, and typed `ApiClient`
  - Automated unit and integration test suites passing in Vitest
  - Docker Compose for PostgreSQL 16 development database
  - GitHub Actions CI workflow pipeline
- [ ] **Phase 2 — Identity & Access** (Argon2id, session cookies, RBAC, hierarchy, data scoping)
- [ ] **Phase 3 — CRM & Master Data** (Leads, accounts, contacts, opportunities, catalogue, suppliers)
- [ ] **Phase 4 — Commercial Workflows** (Pricing, quotes, approvals, sales orders, purchase orders)
- [ ] **Phase 5 — Fulfilment & Finance** (Supplier-direct shipments, POD, customer billing, supplier payments)
- [ ] **Phase 6 — Reporting & Documents** (Executive dashboards, PDF generation, CSV exports, outbox)
- [ ] **Phase 7 — Production Hardening** (Penetration testing rehearsal, backup/restore, monitoring)
- [ ] **Future Phase — Warehouse Inventory** (Disabled by default; activated upon business sign-off)

---

## 3. Local Development Quickstart

### Prerequisites

- Node.js 20+ (Node.js 22 tested)
- pnpm 12+ (or corepack / npm)
- Docker & Docker Compose (optional, for local PostgreSQL 16)

### Setup & Run Commands

```bash
# 1. Install all dependencies across monorepo packages
pnpm install

# 2. Generate Prisma ORM client
pnpm --filter @polybridge/api prisma:generate

# 3. Start local PostgreSQL 16 via Docker (optional if using external Postgres)
docker compose up -d

# 4. Run automated test suites (API + Web)
pnpm run test

# 5. Run typecheck and linting
pnpm run typecheck
pnpm run lint

# 6. Start development servers concurrently (API: 4000, Web: 5173)
pnpm run dev
```

---

## 3. Architecture & Security Documentation Directory

All architectural, security, and requirement artifacts for Phase 0 are maintained under `/docs`:

### Requirements & Business Logic

- [`docs/requirements/MASTER_IMPLEMENTATION_PROMPT.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/requirements/MASTER_IMPLEMENTATION_PROMPT.md) — Canonical Master Specification
- [`docs/requirements/OPEN_QUESTIONS.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/requirements/OPEN_QUESTIONS.md) — Open Business Questions & Unresolved Commercial Decisions

### System Architecture

- [`docs/architecture/SYSTEM_CONTEXT_AND_MODULES.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/architecture/SYSTEM_CONTEXT_AND_MODULES.md) — C4 Level 1 Context & C4 Level 2 Modular Monolith Breakdown
- [`docs/architecture/DOMAIN_GLOSSARY_AND_WORKFLOWS.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/architecture/DOMAIN_GLOSSARY_AND_WORKFLOWS.md) — Domain Glossary & Core Business State Machines
- [`docs/architecture/ENTITY_RELATIONSHIP_MODEL.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/architecture/ENTITY_RELATIONSHIP_MODEL.md) — Global ERD & Exhaustive Database Table Specifications

### Security & Governance

- [`docs/security/THREAT_MODEL.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/security/THREAT_MODEL.md) — STRIDE Threat Analysis, Trust Boundaries & Attack Scenarios
- [`docs/security/SECURITY_CONTROLS.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/security/SECURITY_CONTROLS.md) — OWASP ASVS 5.0 & API Security Top 10 Verification Checklist

### Architecture Decision Records (ADRs)

- [`docs/adr/ADR-001-monorepo-structure.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-001-monorepo-structure.md) — Monorepo Architecture using pnpm Workspaces
- [`docs/adr/ADR-002-modular-monolith-architecture.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-002-modular-monolith-architecture.md) — Modular Monolith Architecture with DDD Layering
- [`docs/adr/ADR-003-authentication-and-session-approach.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-003-authentication-and-session-approach.md) — Stateful Session Cookies & Argon2id Password Security
- [`docs/adr/ADR-004-tenant-model-and-organization-scoping.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-004-tenant-model-and-organization-scoping.md) — Tenant Model and Organization Scoping Strategy
- [`docs/adr/ADR-005-validation-and-data-integrity-strategy.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-005-validation-and-data-integrity-strategy.md) — Input Validation, Schema Enforcement & Decimal Precision
- [`docs/adr/ADR-006-audit-architecture-and-tamper-resistance.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-006-audit-architecture-and-tamper-resistance.md) — In-Transaction Audit Logging and Tamper Resistance
- [`docs/adr/ADR-007-user-roles-hierarchy-and-data-scoping.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-007-user-roles-hierarchy-and-data-scoping.md) — User Roles, Organizational Hierarchy & Dynamic Data Scoping

---

## 4. Organizational Hierarchy and Data Scoping Design

As detailed in [`docs/adr/ADR-007-user-roles-hierarchy-and-data-scoping.md`](file:///d:/My_Universe/freelancing/polybride-ventures/docs/adr/ADR-007-user-roles-hierarchy-and-data-scoping.md), the system models:

- **Hierarchy:** `Department` $\rightarrow$ `Subdepartment` $\rightarrow$ `Designation` $\rightarrow$ `User`
- **Supervisor Tree:** Self-referential `reporting_to_id` forming an acyclic managerial tree
- **RBAC:** Fine-grained `resource.action` permissions mapped to `Roles`
- **Capabilities & Scopes:** Explicit `can_read`, `can_write`, `can_approve`, and `data_scope` (`OWN_ONLY`, `TEAM_AND_SUBORDINATES`, `SUBDEPARTMENT`, `DEPARTMENT`, `GLOBAL`)

---

## 5. Security & Verification Policy

> **Important Notice:** The architecture is designed to meet OWASP ASVS 5.0 Level 2 controls and mitigate the OWASP API Security Top 10 risks. However, no claim of legal compliance or official security certification is made. Security verification is an ongoing practice backed by automated testing and independent review.
