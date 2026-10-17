# ADR-005: Input Validation, Schema Enforcement, and Data Integrity Strategy

## Status: Approved

Date: 2026-10-14  
Deciders: Lead Architect, Backend Lead

---

## 1. Context and Problem Statement

A trading CRM manages commercial transactions where minor rounding errors, unvalidated input strings, or mass assignment vulnerabilities can cause direct financial losses, broken state machines, or database corruption.

Key challenges include:

1. **Input Tampering & Mass Assignment:** Malicious clients submitting unexpected JSON fields (e.g., `"status": "ACCEPTED"`, `"is_admin": true`, `"tax_amount": 0`).
2. **Floating-Point Inaccuracy:** JavaScript numbers use IEEE 754 double-precision floating-point arithmetic. Calculating `0.1 + 0.2` results in `0.30000000000000004`, leading to calculation drift, audit reconciliation failures, and currency discrepancies.
3. **Double-Submission & Race Conditions:** Concurrent network retries or duplicate button clicks on quote conversion or payment allocation.

---

## 2. Decision

We will implement a **Multi-Tiered Defense-in-Depth Validation and Data Integrity Architecture**.

### 2.1 Tier 1: Fastify JSON Schema Validation (Network Boundary)

- Every Fastify route must define an explicit `schema` covering:
  - `body`: Strict JSON schema compiled using `@sinclair/typebox` and Ajv.
  - `params`: Strict UUID validation for all route parameters.
  - `querystring`: Strict types, limits (`limit <= 100`), enum filters.
  - `response`: Explicit serialization schemas for `200`, `201`, `4xx`, `5xx` to prevent accidental data leakage (e.g., password hashes, internal costs).
- **Reject Unknown Properties:** Configured with `additionalProperties: false` on all write request bodies. Any payload containing unrecognized fields is rejected with `400 Bad Request`.

### 2.2 Tier 2: Domain Layer Invariant Validation (Application Core)

- Domain entities and use cases execute business invariant validation independent of the HTTP transport:
  - Quotation line totals and gross margins are calculated server-side; client-supplied line totals are discarded and recomputed.
  - State machine transitions enforce valid previous states (e.g., an `EXPIRED` quote cannot be accepted).
  - Separation of Duties (SoD) policies are evaluated.

### 2.3 Tier 3: High-Precision Decimal Financial Arithmetic

- **Strict Prohibition of JavaScript Floating-Point for Money:**
  - In TypeScript runtime: All monetary values, margins, discounts, and exchange rates must be processed using **`decimal.js`** (immutable decimal representation).
  - In Database: Stored as PostgreSQL **`NUMERIC(14, 4)`** (or `NUMERIC(12, 2)` for final ledger balances).
  - Rounding Mode: Explicitly documented bankers' rounding (`HALF_EVEN`) or commercial standard rounding (`HALF_UP`).

### 2.4 Tier 4: Database Constraints and Pessimistic Locking

- Database constraints represent the final integrity boundary:
  - Unique composite constraints (e.g., `(quote_number, version)`, `(supplier_id, product_id)`).
  - Check constraints (e.g., `balance_due >= 0 AND balance_due <= total_amount`).
  - Pessimistic Locking (`SELECT ... FOR UPDATE`) in PostgreSQL transactions for multi-record financial allocations and quote conversions.
  - Idempotency Keys (`Idempotency-Key` header) cached in an `idempotency_keys` table to guarantee that retried network requests return the original response without duplicating records.

---

## 3. Rationale and Comparison

| Integrity Mechanism            | Ad-hoc Handler Validation                | Multi-Tiered Strategy (Chosen)                  |
| :----------------------------- | :--------------------------------------- | :---------------------------------------------- |
| **Mass Assignment Protection** | Weak; easy for developers to miss fields | **Absolute**; schema rejects unknown fields     |
| **Financial Accuracy**         | Poor (prone to JS floating point drift)  | **Exact** (Decimal.js + PostgreSQL NUMERIC)     |
| **Race Condition Immunity**    | None                                     | **High** (DB Row Locking + Idempotency Keys)    |
| **API Documentation**          | Manual & frequently out of sync          | **Automated** (TypeBox generates OpenAPI specs) |

---

## 4. Consequences and Constraints

### Positive Consequences

- Guarantees zero floating-point corruption in quotes, orders, invoices, and margin reports.
- Fastify schemas compile into optimized JIT validation functions, providing high throughput.
- Eliminates mass-assignment vulnerabilities across the entire API surface.

### Trade-offs & Mitigations

- **Slightly More Verbose Code:**
  - _Trade-off:_ Developers cannot simply pass `req.body` directly to Prisma; they must define schemas and use `Decimal` instances.
  - _Mitigation:_ Provide reusable TypeBox schema primitives (`UUIDSchema`, `MoneySchema`, `PaginationQuerySchema`) in `packages/contracts`.
