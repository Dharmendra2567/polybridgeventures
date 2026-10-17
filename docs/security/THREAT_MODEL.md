# Threat Model and Security Architecture

## Status: Approved Architecture Specification (Phase 0)

Last Updated: 2026-10-14

---

## 1. Scope, Methodology, and Objectives

This Threat Model assesses the Polybridge Ventures Trading Management CRM using the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) mapped against the **OWASP Top 10 (2021)** and **OWASP API Security Top 10 (2023)** standards.

> [!CAUTION]
> **Regulatory Disclaimer:** Implementation of the mitigations detailed in this document does not automatically confer formal regulatory compliance or third-party certification (e.g., SOC 2, ISO 27001, PCI-DSS). Security is an active operational practice requiring continuous testing, vulnerability management, and independent review.

---

## 2. Asset Identification and Classification

| Asset Category                                                | Classification | Impact of Compromise                                                         |
| :------------------------------------------------------------ | :------------- | :--------------------------------------------------------------------------- |
| **Authentication Credentials & Session Tokens**               | **CRITICAL**   | Total system takeover, impersonation of executives or administrators.        |
| **Financial Ledger (Invoices, Receipts, Allocations, Bills)** | **CRITICAL**   | Financial loss, fraudulent payment diversion, invoice tampering.             |
| **Pricing Models, Supplier Offers & Gross Margins**           | **CRITICAL**   | Severe commercial disadvantage; exposure of trade secrets to competitors.    |
| **Customer & Supplier Master Data (PII & Commercial Info)**   | **HIGH**       | Breach of privacy laws (GDPR/Data Protection), loss of partner trust.        |
| **Quotes and Sales Orders**                                   | **HIGH**       | Unauthorized commitments, discount abuse, unauthorized contract generation.  |
| **Audit Trails & Security Logs**                              | **CRITICAL**   | Loss of forensic accountability, regulatory non-compliance, concealed fraud. |
| **Commercial Documents (PDFs, Invoices, Signed PODs)**        | **MEDIUM**     | Information leakage, forgery of delivery receipts.                           |

---

## 3. Trust Boundaries and System Architecture

```mermaid
graph TD
    subgraph ZonePublic ["Zone 0: Untrusted Public Network"]
        ClientBrowser["Client Browser (React SPA)"]
        Attacker["Potential Adversary / Malicious Actor"]
    end

    subgraph ZoneDMZ ["Zone 1: Perimeter / DMZ"]
        ReverseProxy["Reverse Proxy / TLS Terminator<br/>(Nginx / Cloudflare)"]
    end

    subgraph ZoneApp ["Zone 2: Trusted Application Network"]
        subgraph FastifyRuntime ["Fastify Modular Monolith (apps/api)"]
            AuthnFilter["Session & Auth Filter"]
            AuthzPolicy["RBAC & Data Scoping Policy Engine"]
            DomainLogic["Domain & Application Modules"]
            OutboxWorker["Outbox Background Processor"]
        end
    end

    subgraph ZoneData ["Zone 3: Secure Data Network"]
        PostgresDB[("PostgreSQL 16 Database<br/>(Restricted to Application Subnet)")]
        DocStore[("Private S3 / Object Store<br/>(Encrypted at rest, Private Buckets)")]
    end

    subgraph ZoneExt ["Zone 4: External Services"]
        SmtpRelay["SMTP Mail Gateway"]
        Webhooks["Customer / Supplier Webhook Endpoints"]
    end

    %% Trust Boundaries
    ClientBrowser -->|TB-1: Public Internet (HTTPS / Encrypted Cookies)| ReverseProxy
    Attacker -.->|TB-1 Attack Surface| ReverseProxy
    ReverseProxy -->|TB-2: Internal Bridge (mTLS / VPC)| AuthnFilter
    AuthnFilter --> AuthzPolicy
    AuthzPolicy --> DomainLogic
    DomainLogic -->|TB-3: Database Wire (TLS, Parameterized)| PostgresDB
    DomainLogic -->|TB-4: Signed API Calls (AWS SDK)| DocStore
    OutboxWorker -->|TB-5: Outbound Integration (Egress Filter)| SmtpRelay
    OutboxWorker -->|TB-5: Outbound Integration (SSRF Guard)| Webhooks
```

### Trust Boundary Definitions:

- **TB-1 (Browser to DMZ/Proxy):** Completely untrusted network. All inputs are hostile. Attacks include XSS, CSRF, credential stuffing, man-in-the-middle (MitM), and packet snooping.
- **TB-2 (Proxy to Node.js / Fastify Core):** Boundary between perimeter and application server. Enforces TLS termination, HTTP header normalization, request size caps, and DDoS/rate limiting.
- **TB-3 (Fastify Core to PostgreSQL Database):** Boundary between compute and data storage. Database must accept connections solely from authenticated application backend IPs using TLS. Parameterized queries enforce separation between code and data.
- **TB-4 (Fastify Core to Object Storage):** Private document buckets. Direct client access is denied. All access uses short-lived, presigned URLs generated server-side following authorization checks.
- **TB-5 (Fastify Core to External Services):** Outbound communication boundary. Risk of SSRF (Server-Side Request Forgery) attacking internal metadata endpoints or private subnets.
- **TB-6 (Intra-Application User Scopes):** Logical trust boundary between distinct users, departments, and hierarchical levels (`reporting_to` tree). Prevents horizontal and vertical privilege escalation.

---

## 4. Threat Analysis and Attack Scenarios (STRIDE)

### 4.1 Threat 1: Broken Object Level Authorization (BOLA / IDOR) [STRIDE: Elevation of Privilege / Info Disclosure]

- **Scenario:** A Sales Representative assigned to Region A modifies the URL or API request payload from `GET /api/v1/sales/quotes/uuid-1` to `uuid-2` (a high-value quote belonging to another sales desk or department) to view confidential pricing or update line items.
- **Root Cause:** Relying solely on record existence without validating the requesting user's identity, role, and data scope against the target record's owner and department.
- **Mitigation:**
  - Implement a centralized authorization policy handler (`AuthzGuard`) executed before every command/query.
  - Apply database-level WHERE clauses injected from the user's active session:
    ```sql
    -- If user has data_scope = 'TEAM_AND_SUBORDINATES':
    WHERE quotes.id = :quoteId
      AND quotes.created_by_id IN (:subordinateUserIds)
    ```
  - Return `404 Not Found` (rather than `403 Forbidden`) when accessing non-permitted records to prevent ID enumeration.

---

### 4.2 Threat 2: Privilege Escalation via Organizational Hierarchy Manipulation [STRIDE: Elevation of Privilege]

- **Scenario:** An unauthorized user sends a `PATCH /api/v1/users/me` or manipulates user admin endpoints to set their `reporting_to_id` to `NULL` or to an executive, or changes their assigned `role_id` or `designation_id` to grant themselves high-value approval rights.
- **Root Cause:** Mass assignment vulnerabilities allowing sensitive fields in update payloads; lack of authorization guards on organizational structure endpoints.
- **Mitigation:**
  - Strict Fastify JSON Schema validation (`additionalProperties: false`) stripping and rejecting unapproved fields.
  - Organizational updates (designation, department, reporting manager) require `org.user.administer` permission.
  - Self-reporting cycle prevention: Enforce database constraint `reporting_to_id != id` and execute cycle-detection domain validation (DFS traversal) ensuring the hierarchy remains an acyclic tree.

---

### 4.3 Threat 3: Self-Approval of Low Margins or High Spend [STRIDE: Tampering / Repudiation]

- **Scenario:** A sales rep creates a Quote with an aggressive 35% discount (resulting in negative or below-threshold gross margin) and attempts to submit an approval request and approve it themselves via `POST /api/v1/sales/quotes/:id/approve`.
- **Root Cause:** Missing Separation of Duties (SoD) check.
- **Mitigation:**
  - Invariant in `QuoteApprovalUseCase`:
    ```typescript
    if (quote.createdById === currentUser.id) {
      throw new DomainError(
        "SeparationOfDutiesError: Users cannot approve their own quotations.",
      );
    }
    if (!currentUser.hasPermission("sales.quote.approve")) {
      throw new DomainError(
        "UnauthorizedApprovalError: User lacks quote approval authority.",
      );
    }
    if (
      !subordinateUserIds.includes(quote.createdById) &&
      currentUser.dataScope !== "GLOBAL"
    ) {
      throw new DomainError(
        "HierarchyScopeError: Approver must be in the direct supervisor hierarchy.",
      );
    }
    ```

---

### 4.4 Threat 4: Formula Injection (CSV Injection) in Financial and Sales Exports [STRIDE: Tampering / Remote Code Execution on Client]

- **Scenario:** An attacker inputs a malicious payload into a Lead Name, Account Name, or Product Description (e.g., `=cmd|' /C calc'!A0` or `@SUM(1+1)*cmd|' ...'`). When an executive or accountant exports a pipeline report to CSV and opens it in Microsoft Excel, the spreadsheet executes arbitrary commands or transmits data to an external server.
- **Root Cause:** Exporting raw text strings directly into CSV files without escaping formula trigger characters.
- **Mitigation:**
  - Implement a mandatory CSV sanitization filter:
    Any cell whose value begins with `=`, `+`, `-`, `@`, `\t`, or `\r` must be prefixed with a single quote (`'`) or tab-escaped so spreadsheet engines treat it strictly as literal text.
  - Set `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="report.csv"`.

---

### 4.5 Threat 5: Mass Assignment on Commercial State Transitions [STRIDE: Tampering]

- **Scenario:** When updating a draft Quote or Purchase Order via `PUT /api/v1/sales/quotes/:id`, the client injects `"status": "ACCEPTED"` or `"status": "APPROVED"` into the JSON payload, bypassing the approval workflow.
- **Root Cause:** Directly binding request body to database entities.
- **Mitigation:**
  - Status fields are completely excluded from create/update DTO schemas.
  - State transitions are strictly exposed as dedicated, atomic RPC-style endpoints:
    `POST /api/v1/sales/quotes/:id/submit-approval`
    `POST /api/v1/sales/quotes/:id/approve`
    `POST /api/v1/sales/quotes/:id/accept`
  - Each transition enforces preconditions defined in the domain state machine.

---

### 4.6 Threat 6: Concurrency Race Conditions / Double-Conversion [STRIDE: Tampering / Financial Loss]

- **Scenario:** A user double-clicks the "Convert to Sales Order" button or fires two concurrent requests. Two distinct Sales Orders and duplicate back-to-back Purchase Orders are generated for a single Quote, resulting in duplicate procurement and financial commitment.
- **Root Cause:** Non-atomic checks and missing database locks.
- **Mitigation:**
  - Implement Idempotency Keys: Client submits `Idempotency-Key: <UUID>` in headers. The server verifies and caches idempotency results in a dedicated table.
  - Use PostgreSQL Pessimistic Locking inside a transaction:
    ```sql
    SELECT * FROM quotes WHERE id = :quoteId FOR UPDATE;
    ```
    If `quote.status != 'ACCEPTED'` or `converted_order_id IS NOT NULL`, immediately abort and rollback.

---

### 4.7 Threat 7: Malicious File Uploads & PDF Injection [STRIDE: Tampering / Info Disclosure]

- **Scenario:** An attacker uploads an executable `.exe`, PHP file, or an SVG file containing malicious `<script>` tags disguised as a "Proof of Delivery" or "Supplier Quote". When an administrator views the attachment in the browser, the script executes in the admin's session context.
- **Root Cause:** Unrestricted file uploads, trusting client `Content-Type` headers, storing uploads in publicly accessible web directories.
- **Mitigation:**
  - Strict extension and magic byte allowlist: Only `application/pdf`, `image/jpeg`, `image/png` permitted. SVGs and executables are blocked.
  - Uploaded files are stored in private S3 buckets with randomized UUID keys (never user-supplied filenames).
  - Downloads are served via short-lived (e.g., 5-minute expiry) presigned URLs with `Content-Disposition: attachment` to force download rather than in-browser rendering.
  - PDF Generation (Quotes, POs, Invoices) uses server-side headless templates (e.g., Puppeteer/PDFKit) with strict HTML escaping on all injected strings to prevent HTML/XSS injection.

---

### 4.8 Threat 8: Server-Side Request Forgery (SSRF) in Outbound Integrations [STRIDE: Info Disclosure / Elevation of Privilege]

- **Scenario:** The webhook or carrier tracking configuration allows users to input arbitrary URLs. An attacker configures a webhook URL targeting `http://169.254.169.254/latest/meta-data/` (cloud metadata service) or `http://localhost:5432` to exfiltrate infrastructure credentials or probe the internal network.
- **Root Cause:** Unvalidated outbound HTTP requests.
- **Mitigation:**
  - Outbound HTTP requests pass through an egress proxy / URL validator that resolves DNS and blocks RFC 1918 private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), link-local (`169.254.0.0/16`), and AWS metadata endpoints.
  - Outbound webhooks require explicit destination domain allowlisting by administrators.

---

### 4.9 Threat 9: Session Hijacking, CSRF & Credential Stuffing [STRIDE: Spoofing]

- **Scenario:** An attacker intercepts or steals session identifiers via XSS or network eavesdropping, or executes cross-site state-changing requests while the user is logged in.
- **Mitigation:**
  - Store session tokens strictly in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Never store tokens in browser `localStorage` or `sessionStorage`.
  - Enforce CSRF protection using the Double Submit Cookie pattern or custom request header verification (`X-Requested-With` / custom header check) for state-changing endpoints.
  - Password Hashing: Argon2id (memory cost: 64MB, iterations: 3, parallelism: 1).
  - Rate limiting on `/api/v1/auth/login`: Maximum 5 failed attempts per IP / email per 15-minute window, returning generic "Invalid credentials" errors to prevent username enumeration.

---

### 4.10 Threat 10: Audit Log Tampering or Incomplete Auditing [STRIDE: Repudiation]

- **Scenario:** A rogue employee tampers with high-value financial records and then deletes the audit entries to conceal their actions.
- **Mitigation:**
  - The `audit_logs` table has database grants restricted to `INSERT` and `SELECT` for the application user. `UPDATE` and `DELETE` grants are completely revoked at the PostgreSQL role level.
  - Business mutations and audit log insertions occur **in the same database transaction**. If the business change commits, the audit record is guaranteed to exist.
  - Application logs stream to a secure, write-once logging sink with correlation IDs.

---

## 5. Security Architecture Summary Matrix

| Threat Category          | Primary Risk                            | Architectural Control                                    | Verification Method                    |
| :----------------------- | :-------------------------------------- | :------------------------------------------------------- | :------------------------------------- |
| **BOLA / IDOR**          | Unauthorized record access across desks | Fastify `AuthzGuard` + SQL Scope Filters                 | Automated Security Integration Tests   |
| **Privilege Escalation** | Self-assigning roles / changing manager | Acyclic tree validation, strict DTO schemas              | Unit & Mutation Policy Tests           |
| **Separation of Duties** | Self-approving quotes/POs               | Invariant in Approval Use Case                           | Negative Authorization Tests           |
| **CSV Injection**        | Spreadsheet command execution           | CSV formula prefix escaping (`'`)                        | Unit tests on export serializers       |
| **Mass Assignment**      | Bypassing state machine                 | Strict Fastify JSON Schema, separate RPC routes          | Schema integration test suite          |
| **Race Conditions**      | Duplicate orders / over-allocation      | DB pessimistic locking (`FOR UPDATE`) & Idempotency Keys | Concurrency stress tests               |
| **Malicious Uploads**    | Web shell / SVG XSS                     | Magic-byte validation, private S3, presigned URLs        | Negative file upload tests             |
| **SSRF**                 | Internal network scanning via webhooks  | IP/DNS resolution check, private IP blocklist            | Outbound adapter integration tests     |
| **Credential Attacks**   | Brute force / credential stuffing       | Fastify rate limiter, Argon2id, generic errors           | Rate limit automated tests             |
| **Repudiation**          | Denying commercial actions              | Synchronous in-transaction audit logs, append-only DB    | DB permission tests & audit assertions |
