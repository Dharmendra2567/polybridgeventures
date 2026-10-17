# ADR-001: Monorepo Architecture using pnpm Workspaces

## Status: Approved

Date: 2026-10-14  
Deciders: Lead Architect, Core Engineering Team

---

## 1. Context and Problem Statement

Polybridge Ventures requires a full-stack Trading Management CRM comprising a React single-page frontend application, a Fastify Node.js backend application, and shared TypeScript contracts, schemas, and tooling configurations.

We evaluated three potential repository layouts:

1. **Separate Repositories:** Independent Git repositories for frontend, backend, and shared libraries.
2. **Polyrepo / Git Submodules:** Loosely coupled repositories linked via Git submodules.
3. **Monorepo:** A unified repository managed using `pnpm` workspaces.

The project demands strict type safety across the network boundary, single-commit atomic feature additions, coordinated CI/CD pipelines, and prevention of schema drift between API endpoints and client DTOs.

---

## 2. Decision

We will adopt a **Monorepo managed with pnpm Workspaces**.

The repository directory layout is structured as follows:

```
polybridge-ventures/
├── apps/
│   ├── api/                  # Fastify + Node.js + Prisma backend modular monolith
│   └── web/                  # React 18 + Vite + TypeScript frontend SPA
├── packages/
│   ├── contracts/            # Shared DTOs, API route constants, error schemas
│   ├── tsconfig/             # Shared strict TypeScript configuration bases
│   └── eslint-config/        # Shared linting and security rules
├── docs/                     # Architectural, security, and operational documentation
├── package.json              # Workspace root configuration
├── pnpm-workspace.yaml       # pnpm workspace definition
└── pnpm-lock.yaml            # Deterministic, tamper-evident lockfile
```

---

## 3. Rationale and Comparison

| Evaluation Criteria                | Separate Repositories                                                                       | pnpm Monorepo (Chosen)                                                                      |
| :--------------------------------- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------ |
| **Type Safety & Contract Sharing** | High friction; requires publishing and versioning private npm packages on every API change. | Instantaneous; `packages/contracts` referenced directly as a workspace dependency.          |
| **Atomic Changes**                 | Multi-PR synchronization required; high risk of breaking changes in staging.                | Single pull request updates backend routes, frontend clients, and tests atomically.         |
| **Dependency Efficiency**          | Duplicate copies of common packages (TypeScript, ESLint, React types).                      | pnpm content-addressable storage minimizes disk usage and enables ultra-fast installations. |
| **CI/CD Complexity**               | Coordinated triggers across multiple CI pipelines.                                          | Single deterministic CI pipeline with change detection filtering.                           |

---

## 4. Consequences and Constraints

### Positive Consequences

- **Zero Schema Drift:** Frontend and backend compile against the exact same contract definitions in `packages/contracts`.
- **Reproducible Builds:** A single `pnpm-lock.yaml` file pins every direct and transitive dependency across all applications.
- **Simplified Tooling:** Single centralized configuration for Prettier, ESLint, TypeScript, and Git hooks.

### Negative / Trade-offs & Mitigations

- **Risk of Leaking Backend Dependencies into Frontend:**
  - _Risk:_ Developers might import Prisma, backend utilities, or server-side libraries into `apps/web`.
  - _Mitigation:_ `packages/contracts` contains zero runtime dependencies and zero Prisma code. ESLint rules enforce import boundaries and fail CI if `apps/web` attempts to import from `apps/api`.
- **Repository Size Growth:**
  - _Mitigation:_ Binary files and generated assets (PDFs, test artifacts) are excluded via `.gitignore`. pnpm's deduplicating store ensures efficient disk utilization.
