# ADR-006: Audit Architecture, Event Logging, and Tamper Resistance

## Status: Approved

Date: 2026-10-14  
Deciders: Lead Architect, Security Engineer

---

## 1. Context and Problem Statement

Polybridge Ventures' trading CRM governs binding commercial commitments, pricing modifications, customer billing, and supplier disbursements. Accurate forensic accountability requires that all consequential business and security actions be reliably audited.

Key requirements:

1. **Non-Repudiation:** Actions must clearly record who performed them, when, from what IP address, and what changed.
2. **Transactional Consistency:** If a business transaction rolls back, the system must not falsely claim the audit succeeded. Conversely, an entity state mutation must never commit without its corresponding audit entry.
3. **Tamper Resistance:** Ordinary administrators, users, and compromised application processes must not be capable of modifying or deleting historical audit entries.
4. **Data Privacy & Redaction:** Sensitive credentials (passwords, MFA secrets, session tokens) must never leak into log files.

---

## 2. Decision

We will implement a **Two-Tiered Audit and Logging Architecture**.

### 2.1 Tier 1: Synchronous In-Transaction Business Audit Trail (`audit_logs`)

- For all sensitive domain state mutations (Quote Approval, Quote-to-Order Conversion, PO Issuance, Invoice Creation, Payment Allocation, User Role & Hierarchy Changes):
  - An `AuditLog` entry is inserted **within the same PostgreSQL transaction** (`prisma.$transaction`) as the domain entity update.
  - If the domain update fails, the audit record rolls back. If the audit insert fails, the domain transaction aborts.
- **Audit Record Schema:**
  - `id`: UUIDv7
  - `organization_id`: Tenant context
  - `actor_id`: User ID (or NULL for system background tasks)
  - `action`: Canonical action string (e.g., `sales.quote.approved`, `finance.invoice.issued`)
  - `target_entity_type`: Target entity name (e.g., `Quote`, `CustomerInvoice`)
  - `target_entity_id`: Target entity primary key UUID
  - `ip_address`: Client IP address
  - `correlation_id`: Request trace UUID
  - `changes_diff`: Sanitized JSON diff showing previous and new values of changed attributes.
  - `timestamp`: UTC timestamp.

### 2.2 Tier 2: Structured Operational and Security Logging (Pino)

- Fastify uses **Pino** for high-throughput, structured JSON streaming logs (stdout/stderr).
- Every log line includes a unique `correlation_id` (propagated from the incoming `X-Correlation-ID` header or generated as a UUIDv7).
- Operational events include:
  - Authentication successes and failures (with client IP and email).
  - Authorization denials (HTTP 403 / BOLA attempts).
  - Rate limit breaches.
  - System exceptions and external integration timeouts.

### 2.3 Redaction and Data Minimization

- The Pino logger is configured with strict redaction paths:
  - `req.headers.cookie`, `req.headers.authorization`, `password`, `password_hash`, `mfa_secret`, `session_token`, `token`, `secret`.
- Passwords, credentials, and PAN details are never logged under any circumstances.

### 2.4 Tamper Resistance and Immutability

- **Database Grants Enforcement:**
  - The PostgreSQL application user role (`polybridge_app`) is granted `INSERT` and `SELECT` on `audit_logs`.
  - `UPDATE` and `DELETE` privileges are explicitly **REVOKED**.
  - No application API endpoint or UI screen allows editing or deleting audit logs.

---

## 3. Rationale and Comparison

| Audit Approach                   | Asynchronous Fire-and-Forget               | Synchronous In-Transaction (Chosen)         |
| :------------------------------- | :----------------------------------------- | :------------------------------------------ |
| **Audit Completeness Guarantee** | Poor; network failures can drop audit logs | **100% Guaranteed** by PostgreSQL ACID      |
| **Rollback Consistency**         | Poor; logs phantom events on DB rollback   | **Exact**; rolls back with the transaction  |
| **Forensic Evidentiary Value**   | Questionable in legal disputes             | **High**; tamper-evident, append-only store |

---

## 4. Consequences and Constraints

### Positive Consequences

- Guarantees forensic accountability for all commercial and administrative actions.
- Satisfies OWASP ASVS 7.3 and enables transparent operational visibility for executives and compliance auditors.

### Trade-offs & Mitigations

- **Transaction Overhead:**
  - _Trade-off:_ Each audited mutation writes an additional row to PostgreSQL.
  - _Mitigation:_ Audit inserts are simple sequential appends indexed by UUIDv7, adding negligible overhead (< 2ms) to transaction duration.
