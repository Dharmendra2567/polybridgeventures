# ADR-002: Modular Monolith Architecture with Domain-Driven Design

## Status: Approved

Date: 2026-10-14  
Deciders: Lead Architect, Core Engineering Team

---

## 1. Context and Problem Statement

Polybridge Ventures' trading platform encompasses multiple distinct functional domains: Identity & Access, Organization Hierarchy, CRM, Product Catalogue, Pricing Engine, Quotations & Sales, Procurement, Supplier-Direct Fulfilment, Finance, Document Generation, and Audit Trails.

We considered two primary architectural archetypes:

1. **Distributed Microservices:** Separate deployable services (API Gateways, Auth Service, CRM Service, Order Service, Finance Service) communicating via gRPC/REST and distributed message brokers (Kafka/RabbitMQ).
2. **Modular Monolith:** A single deployable backend runtime partitioned into strictly decoupled domain modules with explicit public interfaces, private persistence implementations, and domain-driven design layers.

Given the operational size, transaction volumes, and team size, premature distributed microservices introduce massive operational overhead, network latency, distributed transaction complexity (Sagas, 2PC), distributed tracing overhead, and substantial deployment hurdles. Conversely, an unstructured "spaghetti" monolith would lead to tangled dependencies and high regression risks.

---

## 2. Decision

We will implement a **Modular Monolith** adhering to **Domain-Driven Design (DDD)** and Clean Architecture principles within `apps/api`.

### 2.1 Layering Standard per Module

Every module (`apps/api/src/modules/<module-name>/`) is organized into four concentric layers:

1. **Domain Layer:** Pure business entities, value objects, domain invariants, domain events, domain exceptions. Zero dependencies on external frameworks, Fastify, or Prisma.
2. **Application Layer:** Use cases, command and query handlers, DTOs, interface ports (e.g., repository interfaces, external notification ports). Coordinates transactions.
3. **Infrastructure Layer:** Prisma client repositories, database queries, file storage adapters, external API clients. Implements ports defined in the application layer.
4. **Presentation Layer:** Fastify route definitions, request/response JSON schemas, controller handlers, serializers.

### 2.2 Interservice & Cross-Module Boundaries

1. **No Internal Directory Imports:** Module A is strictly prohibited from importing from `modules/B/domain`, `modules/B/infrastructure`, or `modules/B/presentation`.
2. **Public API Ports:** Cross-module queries and synchronous commands must invoke Module B's exposed Application Service interface in `modules/B/application/ports`.
3. **Transactional Outbox for Side Effects:** Asynchronous side effects (e.g., notifying procurement when a quote is converted, triggering PDF generation) use the Transactional Outbox pattern (`outbox_events` table) to ensure reliable at-least-once event publication without distributed message brokers.
4. **Future Inventory Isolation:** The future inventory module is kept decoupled; supplier-direct drop-shipment orders do not depend on internal stock receipts.

---

## 3. Rationale and Comparison

| Evaluation Attribute                 | Microservices                                       | Unstructured Monolith            | Modular Monolith (Chosen)                               |
| :----------------------------------- | :-------------------------------------------------- | :------------------------------- | :------------------------------------------------------ |
| **Operational Simplicity**           | Poor (Kubernetes, multiple DBs, network partitions) | Good (Single process)            | **Excellent** (Single process, single PostgreSQL DB)    |
| **Data Consistency & Transactions**  | Complex (Sagas, eventual consistency, split brain)  | High risk of unintended locks    | **Guaranteed** (ACID transactions across use cases)     |
| **Code Isolation & Maintainability** | High (enforced by network)                          | Very poor (tangled dependencies) | **High** (enforced by ESLint and strict folder ports)   |
| **Deployment Complexity**            | High                                                | Low                              | **Low** (Single Docker container or binary)             |
| **Evolution Path**                   | Premature optimization                              | Dead end (costly rewrite)        | **Optimal** (Can extract hot modules later if required) |

---

## 4. Consequences and Constraints

### Positive Consequences

- **Local ACID Transactions:** Workflows like Quote-to-Sales Order conversion execute within a single atomic PostgreSQL transaction, guaranteeing data integrity without distributed rollbacks.
- **Developer Velocity:** Debugging, end-to-end integration testing, and local development run seamlessly on a developer workstation with `docker compose up postgres`.
- **Clean Separation of Concerns:** Business logic is thoroughly isolated from database queries and HTTP transport concerns.

### Trade-offs & Mitigations

- **Discipline Required to Prevent Architectural Erosion:**
  - _Risk:_ Developers might bypass application ports and directly import another module's Prisma repository.
  - _Mitigation:_ Implement automated linting rules using `eslint-plugin-import` and dependency-cruiser to fail CI if cross-module boundaries are breached.
