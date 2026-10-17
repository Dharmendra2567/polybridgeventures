# Polybridge Ventures — Trading Management CRM

## Master Implementation and Security Specification

### 1. Mission

Build a production-oriented Trading Management CRM for Polybridge Ventures using:

- Frontend: React, TypeScript, Vite.
- Backend: Node.js, TypeScript, Fastify.
- Database: PostgreSQL.
- ORM and migrations: Prisma.
- Repository structure: pnpm monorepo.
- Architecture: Domain-Driven Design (DDD), modular monolith, explicit module boundaries.
- API: versioned REST API under `/api/v1`.
- Testing: unit, integration, API contract, authorization, security, and end-to-end tests.
- Deployment: container-ready, initially deployable on a single application host, with the ability to separate web, API, database, and workers later.

Security is the highest priority. A feature is not complete merely because its UI works. Every feature must have server-side validation, authorization, persistence, automated tests, error handling, and appropriate audit logging.

Do not invent unconfirmed commercial requirements. Mark unresolved business decisions in `docs/requirements/OPEN_QUESTIONS.md`, choose safe configurable defaults only when appropriate, and document any assumption in an architecture decision record.

### 2. Business context

Polybridge Ventures operates a trading business. It sources products from suppliers and sells them to customers. The current operating model does not require the company to hold physical inventory for every transaction. Supplier-direct delivery may be used.

The system must support:

1. CRM and customer relationship management.
2. Leads, accounts, contacts, opportunities, and activities.
3. Product catalogue and supplier relationships.
4. Supplier offers and cost tracking.
5. Quotations, sales orders, and commercial approvals.
6. Procurement and purchase orders.
7. Fulfilment and delivery tracking.
8. Customer invoices, payment receipts, supplier bills, and supplier payments, subject to confirmed finance requirements.
9. Role-specific dashboards, reporting, and sales analytics.
10. Document management and notifications.
11. Audit trails and administrative configuration.
12. A future inventory module that can be enabled without redesigning the existing sales and procurement model.

Do not assume that the company is currently a warehouse operator, a regulated financial institution, or a multi-company SaaS provider. Design tenant boundaries explicitly, but enable multi-organization access only if the business confirms that it is required.

### 3. Required architecture

Use a modular monolith, not microservices at the initial stage.

Maintain independent frontend and backend applications inside a single repository. Keep shared packages limited to contracts, schemas that can safely be shared, and tooling configuration.

Backend modules:

- identity-access
- organizations
- crm
- catalogue
- pricing
- sales
- procurement
- fulfilment
- finance
- documents
- reporting
- notifications
- integrations
- audit
- inventory (future module)

Every module must own its business rules and persistence operations. Cross-module communication should use application services or explicit interfaces. Avoid arbitrary imports into another module's internal directories.

Follow the dependency direction:

- Domain: entities, value objects, business invariants, domain policies, domain errors.
- Application: commands, queries, use cases, DTOs, ports, transaction coordination.
- Infrastructure: Prisma implementations, external adapters, queues, storage adapters.
- Presentation: Fastify routes, request schemas, response schemas, serializers.

Never put business rules in React components, HTTP route handlers, or Prisma middleware. Never expose Prisma entities directly in API responses.

Document significant decisions in `docs/adr/`.

### 4. Frontend application

Implement a responsive business application with:

- Authentication and session management.
- Role-aware navigation and dashboards.
- Sidebar navigation with clear module grouping.
- Searchable, filterable, paginated data tables.
- Accessible forms with field-level errors.
- Detail pages, edit screens, create flows, status badges, timelines, and activity feeds.
- Loading, empty, validation-error, permission-denied, network-error, and not-found states.
- Confirmation dialogs for consequential actions.
- Responsive layouts for desktop, tablet, and mobile.
- Accessible keyboard navigation, labels, focus management, and sufficient contrast.

Organize frontend code by feature. Keep reusable design-system components separate from business-specific components.

Use strict TypeScript. Do not use `any` to bypass type safety. Validate API responses at the boundary. Do not treat hidden buttons or frontend route guards as security controls.

Use a typed API client with centralized handling for authentication expiry, safe error messages, request identifiers, and response validation.

Do not store access tokens, refresh tokens, session secrets, or sensitive business records in localStorage. Prefer a secure server-managed session using HttpOnly, Secure, SameSite cookies when feasible. If a different token architecture is selected, document the threat model and safeguards first.

### 5. Business modules and screens

#### A. Executive dashboard

Show authorized summaries such as:

- Open opportunities and pipeline value.
- Quotations awaiting action.
- Sales orders by status.
- Procurement commitments.
- Fulfilment exceptions and delayed deliveries.
- Outstanding customer receivables and supplier payables, if finance functionality is enabled.
- Sales performance, margins, and trends.
- Recent activities and approvals.

Apply the same authorization and organization scoping to dashboard aggregates as to individual records. Never leak restricted amounts through summary cards, charts, exports, or counts.

#### B. CRM

Screens:

- Lead list, create, edit, detail, and conversion.
- Accounts/customer companies.
- Contacts.
- Opportunities and pipeline board.
- Activity timeline, calls, meetings, tasks, notes, and follow-up dates.
- Assignment and ownership.
- Duplicate detection and merge workflow, subject to authorization.
- Search, filtering, sorting, pagination, and CSV export with permission checks.

Track lead source, owner, status, and timestamps. Prevent invalid transitions and duplicate conversion. Preserve the source record and audit history when a lead becomes an account or opportunity.

#### C. Product catalogue and pricing

Screens:

- Product list and detail.
- Categories and units of measure.
- Product specifications and document attachments.
- Supplier-product mappings.
- Supplier offers, quoted costs, validity dates, lead times, and availability notes.
- Customer-specific pricing or price lists only if confirmed by the business.

Represent monetary values with appropriate decimal precision and explicit currency. Never use JavaScript floating-point arithmetic for financial calculations. Use decimal-safe operations and database decimal types.

The server calculates line totals, discounts, tax where configured, cost, margin, and final totals. Revalidate all amounts when an order or quotation is created or updated.

#### D. Quotations and sales

Screens:

- Quote list, create, edit, detail, version history, and PDF generation.
- Sales order list, create, detail, status history, and order documents.
- Quote-to-order conversion.
- Customer communication history.
- Approval queue for discounts or low margins.
- Order cancellation and change requests.

Define an explicit state machine. Suggested quote states: draft, pending_approval, approved, sent, accepted, rejected, expired, cancelled. Final states must not be silently reopened.

Suggested order states: draft, confirmed, sourcing, partially_fulfilled, fulfilled, cancelled. Adjust these states to the confirmed workflow.

Record who performed each transition, when it occurred, and why where a reason is required. Enforce transition permissions and invariants on the server.

Use database transactions for multi-record operations such as quote conversion. Make conversions idempotent so repeated requests cannot create duplicate orders.

#### E. Procurement and suppliers

Screens:

- Supplier directory and contacts.
- Supplier-product relationships.
- Request for quotation, if required.
- Supplier offers and comparison.
- Purchase order create, approval, issue, and status history.
- Expected delivery dates and supplier confirmations.
- Supplier documents and notes.

Suggested purchase-order states: draft, pending_approval, approved, issued, acknowledged, partially_received_or_delivered, completed, cancelled. Finalize the actual states after business validation.

Do not automatically treat a supplier offer as a purchase commitment. A purchase order must have an explicit authorized issue/confirmation step.

#### F. Fulfilment

Support supplier-direct delivery and other confirmed delivery methods.

Track the source of fulfilment, supplier commitment, expected dispatch, expected delivery, shipment reference, delivery status, proof-of-delivery metadata, and exceptions where applicable.

For supplier-direct delivery, do not create a company inventory receipt or stock movement. Represent the commercial order, supplier purchase commitment, and delivery separately.

#### G. Finance

Provide a foundation for:

- Customer invoices and receivables.
- Customer payment receipts and allocations.
- Supplier bills and payables.
- Supplier payment records.
- Due dates, partial payments, balances, and overdue reports.
- Financial summaries and exportable reports.

Do not claim to provide a legally compliant accounting system without validating local tax, accounting, invoicing, and statutory requirements. Confirm whether the CRM records payments only or integrates with an external accounting platform.

Do not store card details, banking credentials, or payment-provider secrets. If a payment integration is later introduced, use its approved secure workflow.

Never hard-delete issued financial records. Corrections must use controlled amendments, voiding, or reversal records with audit history.

#### H. Reports and dashboards

Provide authorized, date-filtered reports for pipeline, sales, quote conversion, order status, supplier performance, fulfilment delays, gross margin, receivables, and payables.

Apply the same permission rules to exports as to screens. Escape spreadsheet-formula prefixes in CSV exports. Prevent formula injection, unbounded report queries, and data leakage through aggregates.

#### I. Future inventory

Create only the documented architecture and extension points initially unless inventory is explicitly approved for the first release.

The future module should support warehouses, locations, receipts, dispatches, stock movement ledger, reservations, stock counts, adjustments, and availability calculations.

Do not implement inventory as a single `inStock` boolean or editable quantity on a product. Future stock changes must be represented by validated movements with traceable source documents.

Inventory must remain disabled by default until its business workflow is confirmed.

### 6. Identity, authentication, and authorization

Implement a secure authentication foundation before business modules.

Requirements:

- Secure password hashing using a current, reputable password-hashing library and suitable parameters.
- Generic login failure responses and rate limiting.
- Secure session or token lifecycle, expiry, revocation, and logout.
- Secure password reset with short-lived, single-use tokens.
- Email verification if email-based accounts are used.
- MFA for privileged accounts and a configurable path for broader MFA enforcement.
- Login and security-event audit logs.
- No default production credentials.
- No public self-registration unless explicitly approved.
- No password, token, or secret logging.

Use deny-by-default RBAC and a centralized authorization policy layer. Suggested roles include administrator, sales, procurement, operations, finance, and management/read-only. Roles must be configurable, and permissions must be checked server-side on every relevant operation.

Model permissions as actions on resources, such as `sales.quote.read`, `sales.quote.create`, `sales.quote.approve`, `sales.order.cancel`, and `finance.payment.record`.

Use separation of duties for sensitive actions. A user must not approve their own high-risk transaction where policy requires independent approval.

Enforce object-level authorization for every record identifier. Prevent insecure direct object reference attacks. Knowing or guessing an ID must never grant access.

If multiple organizations or tenants are supported, scope all reads, updates, deletes, relationships, background jobs, and exports by the authorized organization context. Never trust a tenant ID supplied only by the browser. Test cross-tenant access explicitly.

### 7. Strict validation and data integrity

All external inputs are untrusted, including JSON, query parameters, route parameters, headers, uploaded files, webhook payloads, and imported data.

Use Fastify's supported JSON Schema validation and response serialization approach, or an equally strict schema strategy compatible with Fastify's security guidance.

Requirements:

- Strict schemas for every request body, parameter, and query.
- Reject unknown fields for write operations.
- Explicit required, optional, nullable, and default semantics.
- Enforce maximum string lengths, numeric bounds, enum values, array limits, and pagination limits.
- Validate emails, phone formats, dates, currencies, identifiers, and file metadata appropriately.
- Normalize inputs where necessary, without destroying valid business data.
- Prevent mass assignment by mapping approved fields explicitly.
- Never accept role, approval state, ownership, price, cost, margin, payment status, or organization context from the client without authorization and business-rule validation.
- Use database constraints for unique identifiers, required relationships, valid references, and invariants that can be represented in SQL.
- Return consistent validation errors without exposing stack traces or internal details.
- Validate business rules in the application/domain layer as well as the HTTP boundary.
- Use transactions for multi-step financial, order, procurement, and approval workflows.
- Protect concurrent updates with optimistic concurrency or appropriate row locking where necessary.
- Use idempotency keys for retryable operations that create orders, record payments, or trigger external side effects.
- Never silently accept invalid or partially valid financial data.

### 8. Mandatory security baseline

Use OWASP ASVS 5.0 as the application security verification baseline, select an appropriate target assurance level, and document the selected controls. Map applicable controls from the OWASP API Security Top 10 and NIST Cybersecurity Framework 2.0.

Do not claim compliance or certification merely because controls were implemented. Record test evidence and unresolved risks.

Implement and test:

#### Transport and browser security

- HTTPS in production.
- Secure cookie settings and appropriate SameSite policy.
- Correct CORS allowlist; no wildcard origin with credentials.
- Content Security Policy and other suitable security headers.
- Clickjacking protection, MIME-sniffing protection, and safe referrer policy.
- CSRF protection for cookie-authenticated state-changing requests.
- Strict origin and host validation where appropriate.

#### API security

- Authentication and authorization on protected routes.
- Rate limiting, request-size limits, timeout limits, and bounded pagination.
- Safe handling of malformed JSON and unexpected content types.
- No arbitrary object binding or client-controlled query construction.
- Parameterized database queries through Prisma or safe SQL.
- Protection against SQL injection, XSS, CSRF, SSRF, IDOR/BOLA, privilege escalation, mass assignment, and resource exhaustion.
- Safe outbound HTTP integrations with destination allowlists and protections against private-network access where applicable.
- Safe webhook signature verification and replay protection.
- API versioning and a documented error contract.

#### Database and secrets

- Least-privilege database credentials.
- Separate development, testing, and production secrets.
- No secrets committed to Git or exposed through Vite environment variables.
- Production secrets supplied through an appropriate secret manager or deployment environment.
- Encryption in transit and managed encryption at rest where supported.
- Restrict database network access to authorized application components.
- Secure backup encryption, access controls, retention, and restoration tests.
- Safe migration procedures and reviewed schema changes.

#### Documents and file uploads

- Allowlisted file extensions and verified content types.
- File-size limits and safe generated filenames.
- Malware scanning or a documented scanning integration for untrusted files.
- Private storage by default.
- Authorization on every download.
- Short-lived signed download links where object storage is used.
- No executable uploads or public directory storage for private documents.
- Safe PDF generation and protection against HTML/script injection in templates.

#### Logging, auditing, and monitoring

- Structured application logs with request/correlation IDs.
- Redaction of passwords, tokens, cookies, secrets, and sensitive payloads.
- Separate audit events for login/security events and business changes.
- Record actor, action, target, timestamp, outcome, and relevant before/after metadata, minimizing sensitive data.
- Append-only or tamper-evident audit storage appropriate to the deployment's threat model.
- Do not let ordinary users edit or delete audit records.
- Monitoring for repeated login failures, authorization denials, unusual exports, and operational errors.
- Alerting and documented incident-response steps.

#### Dependencies and software supply chain

- Lockfile and reproducible dependency installation.
- Automated dependency and vulnerability scanning.
- Static analysis and linting.
- Secret scanning.
- Container/image scanning if containers are used.
- Review dependencies before adding them.
- Keep supported runtime and libraries patched.
- Never suppress security findings merely to make CI pass.

### 9. Audit and business-event rules

Audit sensitive actions, including:

- Authentication and access-control changes.
- User, role, and permission changes.
- Customer and supplier record changes.
- Price, cost, discount, and margin changes.
- Quote approvals, quote sending, and quote conversion.
- Purchase-order approval and issue.
- Sales-order confirmation, amendment, and cancellation.
- Invoice, payment, receipt, and reversal events.
- Document access where sensitivity warrants it.
- Data exports and bulk operations.
- Inventory movements when that module is activated.

Use explicit application services to write audit records within the same transaction as the business operation where feasible. Do not claim an audit event succeeded if the related critical transaction rolled back.

### 10. Database design requirements

Use PostgreSQL with Prisma migrations committed to source control.

Use UUIDs or another documented non-guessable identifier strategy for public resource identifiers. IDs are not authorization controls.

Use database-level unique constraints, foreign keys, indexes, and checks where appropriate. Define deletion and retention rules explicitly. Use soft deletion only where it has a clear business purpose; it must not replace authorization or retention policy.

Use decimal database fields for monetary values. Define currency explicitly. Never use floating-point storage for money.

Use UTC for stored timestamps and render local time consistently in the UI.

Create indexes based on actual query patterns. Add pagination to list endpoints and limits to reports. Avoid N+1 query patterns and unbounded relation loading.

Review migrations for destructive operations. Use expand-and-contract migrations for changes that must not interrupt production. Do not run destructive database reset commands in production.

### 11. API conventions

Use `/api/v1` routes and document them with OpenAPI.

Adopt consistent response shapes, validation errors, authorization errors, not-found errors, conflict responses, and server-error handling. Never expose raw database exceptions or stack traces to clients.

Use response schemas and explicit serializers to prevent leakage of password hashes, internal secrets, hidden cost fields, or unauthorized fields.

Use idempotency and concurrency protection for consequential operations. Do not rely on client retries being delivered exactly once.

Add request correlation IDs, health checks, readiness checks, and graceful shutdown.

### 12. Background work and integrations

Keep email delivery, document generation, scheduled reminders, imports, exports, and integration retries out of latency-sensitive request handlers when appropriate.

Design jobs for retries, idempotency, timeouts, and dead-letter handling. Do not log sensitive payloads.

Use a transactional outbox pattern when a committed business transaction must reliably trigger asynchronous work or integration events. Do not publish an event before its database transaction commits.

Build provider integrations behind explicit interfaces. Do not hard-code credentials or assume an external CRM, accounting service, messaging provider, or inventory provider has been selected.

### 13. Testing requirements

Every module must include appropriate tests.

- Unit tests: domain invariants, calculations, state transitions, and policies.
- Integration tests: Prisma repositories, database constraints, transactions, and rollback.
- API tests: request schemas, response schemas, authentication, authorization, and errors.
- Security tests: IDOR/BOLA, privilege escalation, tenant isolation if enabled, mass assignment, injection attempts, rate limits, and unauthorized exports.
- End-to-end tests: critical workflows across frontend and backend.
- Regression tests: every discovered security or business-logic defect.
- Concurrency tests: duplicate conversion, repeated payment submission, and conflicting updates.
- Migration tests: migrate a clean database and upgrade a representative previous schema.

Never use production data in tests. Use synthetic fixtures and isolated test databases.

Critical tests must fail CI when broken. Do not skip or weaken tests to get a passing build.

### 14. Required project documentation

Maintain:

- `README.md`: prerequisites, setup, scripts, architecture summary.
- `docs/architecture/`: system context, module boundaries, data flow, deployment topology.
- `docs/adr/`: decisions and alternatives considered.
- `docs/security/THREAT_MODEL.md`: assets, trust boundaries, attack scenarios, mitigations.
- `docs/security/SECURITY_CONTROLS.md`: controls, verification method, evidence, and status.
- `docs/security/INCIDENT_RESPONSE.md`: containment, investigation, recovery, and notification steps.
- `docs/runbooks/BACKUP_RESTORE.md`: backup and restoration procedures.
- `docs/runbooks/DEPLOYMENT.md`: deployment, rollback, and migration steps.
- `docs/requirements/OPEN_QUESTIONS.md`: unresolved business decisions.
- `docs/api/`: generated or maintained OpenAPI documentation.
- `.env.example`: names and safe placeholders only, never real secrets.
- `SECURITY.md`: vulnerability reporting and supported versions.

### 15. Implementation phases and gates

Phase 0 — Discovery and architecture:
Inspect the empty repository. Record assumptions and open business questions. Write the domain glossary, context map, threat model, module boundaries, ER model, and initial ADRs. Do not generate every module at once.

Phase 1 — Secure foundation:
Initialize the pnpm monorepo, strict TypeScript, linting, formatting, test runners, environment validation, Fastify bootstrap, React bootstrap, PostgreSQL, Prisma, structured logging, error handling, health checks, and CI. Add no business module until the foundation passes all checks.

Phase 2 — Identity and access:
Implement authentication, secure sessions, user administration, RBAC, authorization policies, audit foundations, rate limits, and negative authorization tests. Do not expose business endpoints before access control is verified.

Phase 3 — CRM and master data:
Implement customers/accounts, contacts, leads, opportunities, activities, product catalogue, suppliers, and safe list/detail/create/update flows.

Phase 4 — Commercial workflows:
Implement pricing, quotation lifecycle, approval policies, quote-to-order conversion, sales orders, supplier offers, purchase orders, and transaction/idempotency tests.

Phase 5 — Fulfilment and finance:
Implement supplier-direct fulfilment, shipment status, customer invoices, receipts, supplier bills and payments if confirmed, and authorized finance reports.

Phase 6 — Reporting and documents:
Implement dashboards, bounded reporting, export protection, document storage, secure downloads, and background jobs.

Phase 7 — Production hardening:
Complete threat-model review, security test suite, dependency scanning, deployment review, backup restoration test, monitoring, runbooks, performance tests, and rollback rehearsal.

Future phase — Inventory:
Only after the inventory operating model is approved. Implement stock ledger, warehouse locations, receipts, dispatches, reservations, counts, and reconciliation without changing the meaning of existing supplier-direct transactions.

### 16. Agent operating rules

Before changing code:

1. Inspect the current repository and identify what already exists.
2. Read this specification and the relevant architecture documents.
3. State the bounded phase/task being implemented.
4. List affected modules, data changes, security implications, and tests.
5. Implement only that task and its dependencies.

After changing code:

1. Run type checking, linting, unit tests, integration tests where available, and production builds.
2. Review authorization and validation paths.
3. Review logs and responses for accidental secret or data leakage.
4. Update documentation and migration notes.
5. Report files changed, commands run, results, remaining risks, and unimplemented requirements.

Never claim tests passed without running them. Never claim security certification. Never silently invent business rules. Never disable security controls to make a feature work. Never use destructive database commands without explicit confirmation and a verified backup in environments containing valuable data.

If a task is too large for one pass, break it into reviewable changes and stop at the phase gate. Do not proceed to the next phase while critical security checks are failing.

### Definition of done

A feature is complete only when its business behavior, data integrity, server-side validation, authorization, audit requirements, tests, error handling, documentation, and operational behavior have been reviewed. A visually complete screen backed by insecure or missing APIs is not complete.
