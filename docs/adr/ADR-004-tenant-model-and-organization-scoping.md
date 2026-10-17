# ADR-004: Tenant Model and Organization Scoping

## Status: Approved

Date: 2026-10-14  
Deciders: Lead Architect, Core Engineering Team

---

## 1. Context and Problem Statement

The specification requires that we design tenant boundaries explicitly without inventing unconfirmed multi-tenant behavior. Polybridge Ventures currently operates as an independent international trading firm. There is no confirmed requirement to provide a multi-tenant Software-as-a-Service (SaaS) platform for external third-party companies. However, Polybridge may in the future operate multiple trading subsidiaries, international branches, or distinct legal entities.

We evaluated three potential data tenancy strategies:

1. **Unscoped Flat Schema (No Organization Column):** Assume a single company globally; tables have no organization identifier.
2. **Multi-Database / Schema-per-Tenant Isolation:** Dynamic PostgreSQL schemas or separate database clusters per organization.
3. **Single Database with Discriminator Column (`organization_id`) Boundary Isolation:** All operational tables include a non-nullable `organization_id` foreign key referencing the `organizations` table. The application context enforces boundary isolation.

---

## 2. Decision

We will implement a **Single-Database Architecture with Explicit `organization_id` Scoping**.

### 2.1 Architectural Rules

1. **Explicit Foreign Key on All Domain Records:**
   - Every domain table (`users`, `departments`, `leads`, `accounts`, `products`, `quotes`, `sales_orders`, `suppliers`, `purchase_orders`, `customer_invoices`, `audit_logs`) includes a non-nullable `organization_id UUID REFERENCES organizations(id)`.
2. **Context-Derived Scoping (Zero Trust of Client Input):**
   - The active `organization_id` is resolved exclusively from the authenticated user's verified session context on the server.
   - **Under no circumstances will the server trust an `organization_id` supplied in request headers, query parameters, or JSON payloads.**
3. **Repository Scope Enforcement:**
   - Every database query executed through Prisma or repository classes must include `where: { organizationId: session.organizationId, ... }`.
4. **Single-Tenant Operational Mode Initially:**
   - Initial seeding creates the primary organization record (`Polybridge Ventures`). Multi-tenant switching is disabled by default until business requirements demand multi-entity operations.

---

## 3. Rationale and Comparison

| Tenancy Model                     | Database Migration Risk                       | Operational Complexity                            | Isolation Security                        | Future-Proofing                     |
| :-------------------------------- | :-------------------------------------------- | :------------------------------------------------ | :---------------------------------------- | :---------------------------------- |
| **No Organization Column**        | Extreme (requires rewiring every table later) | Lowest                                            | None                                      | Very Poor                           |
| **Schema/DB-per-Tenant**          | High (complex multi-schema migrations)        | Very High (connection pooling, migration runners) | Maximum                                   | Overkill for single trading company |
| **Discriminator Column (Chosen)** | **Zero** (already structured for isolation)   | **Low** (standard Prisma queries)                 | **High** (when enforced by server policy) | **Optimal**                         |

---

## 4. Consequences and Constraints

### Positive Consequences

- **Zero Schema Redesign:** If Polybridge expands to operate multiple trading subsidiaries (e.g., Polybridge UK, Polybridge Asia, Polybridge Americas), the database schema is already prepared without needing disruptive data migration.
- **Accidental Cross-Tenant Leakage Prevention:** Integration tests will verify that queries with a mismatched `organization_id` return empty result sets (`404 Not Found`).

### Trade-offs & Mitigations

- **Developer Oversight Risk (Missing Filter):**
  - _Risk:_ A developer might write a raw Prisma query forgetting to include `organizationId`.
  - _Mitigation:_ Implement Prisma Client extension middleware or repository base classes that automatically inject the ambient `organizationId` into all `findMany`, `findFirst`, `update`, and `delete` operations.
