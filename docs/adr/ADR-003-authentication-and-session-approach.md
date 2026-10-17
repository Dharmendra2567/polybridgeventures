# ADR-003: Authentication, Session Management, and Credential Storage

## Status: Approved

Date: 2026-10-14  
Deciders: Lead Architect, Security Engineer

---

## 1. Context and Problem Statement

Polybridge Ventures' CRM handles highly sensitive trade contracts, supplier cost bases, customer pricing, and financial ledgers. Authentication and session management represent the primary gatekeeper to all system assets.

We evaluated two standard authentication architectures:

1. **Stateless JWTs in Browser LocalStorage:** Client stores a signed JWT in `localStorage` or `sessionStorage` and attaches it via `Authorization: Bearer <token>` on every request.
2. **Server-Side Managed Sessions with HttpOnly Cookies:** Server creates an opaque session token, hashes it in PostgreSQL, and issues it via an encrypted, `HttpOnly`, `Secure`, `SameSite=Lax` cookie.

### Vulnerability Analysis of JWT in LocalStorage:

- **XSS Exposure:** Any Cross-Site Scripting vulnerability (e.g., from a compromised npm dependency or unsanitized DOM rendering) allows an attacker to read `localStorage.getItem('token')` and exfiltrate credentials instantly.
- **Revocation Inability:** Stateless JWTs cannot be revoked in real-time when an employee is terminated, permissions are downgraded, or a session is compromised, unless a stateful revocation blocklist is introduced (which defeats the purpose of "stateless" JWTs).

---

## 2. Decision

We will implement **Stateful, Server-Managed Sessions using HttpOnly, Secure Cookies**.

### 2.1 Credential Hashing

- Passwords are encrypted using **Argon2id** (the OWASP recommended password hashing algorithm) with baseline parameters:
  - Memory cost: $64 \text{ MB}$ (`m=65536`)
  - Iterations: $3$ (`t=3`)
  - Parallelism: $1$ thread (`p=1`)
- Password reset tokens use cryptographically random 32-byte buffers (`crypto.randomBytes(32)`), stored as SHA-256 hashes with a 15-minute expiration window.

### 2.2 Session Architecture

- Upon successful authentication, the server generates a 256-bit cryptographically secure random session token.
- The token is hashed with SHA-256 and stored in the `user_sessions` table with user ID, IP address, user agent, expiration timestamp, and revocation status.
- The raw session token is transmitted to the client in a cookie with strict attributes:
  - `HttpOnly: true` (prevents JavaScript access, mitigating XSS token theft)
  - `Secure: true` (enforced in production; cookies transmitted strictly over HTTPS)
  - `SameSite: Lax` (mitigates Cross-Site Request Forgery for top-level navigations)
  - `Path: /api/v1`
- **Timeouts:**
  - Idle timeout: 60 minutes of inactivity.
  - Absolute session expiration: 8 hours.
- **Revocation:**
  - Logout clears the cookie and sets `revoked_at = NOW()` on the session record.
  - Password change or administrative account deactivation immediately revokes all active sessions for that user.

### 2.3 CSRF Protection

- For all state-changing HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`):
  - Fastify verifies the `Origin` and `Referer` headers match the authorized frontend host allowlist.
  - Implement CSRF token validation via `@fastify/csrf-protection` (Double-Submit Cookie pattern or custom request header verification).

### 2.4 Multi-Factor Authentication (MFA)

- Support for Time-based One-Time Passwords (TOTP / RFC 6238) via standard authenticator apps (Google Authenticator, Microsoft Authenticator).
- Mandatory for users assigned administrative, finance, or executive designations.

---

## 3. Rationale and Comparison

| Evaluation Metric                | JWT in LocalStorage                             | Server-Managed Session Cookies (Chosen)      |
| :------------------------------- | :---------------------------------------------- | :------------------------------------------- |
| **XSS Token Exfiltration**       | Completely vulnerable (trivial JS read)         | **Immune** (`HttpOnly` blocks JS reading)    |
| **Immediate Session Revocation** | Impossible without distributed blocklist        | **Instantaneous** (Database session lookup)  |
| **CSRF Surface**                 | Low (if headers used), but XSS risk is critical | Manageable via `SameSite=Lax` & CSRF headers |
| **Regulatory & Security Review** | Disfavored by OWASP ASVS 3.2.1                  | **Directly aligns with OWASP ASVS Level 2**  |

---

## 4. Consequences and Constraints

### Positive Consequences

- Guarantees immediate revocation capability upon employee offboarding or suspected compromise.
- Eliminates client-side token storage vulnerabilities.
- Session activity can be actively audited and inspected by administrators in the UI.

### Trade-offs & Mitigations

- **Database Lookup Overhead on Each Request:**
  - _Mitigation:_ The `user_sessions` table is indexed on `session_token_hash`. Session reads are lightweight and can be cached in Redis if read throughput becomes a bottleneck in future phases.
- **CORS Configuration Strictness:**
  - _Constraint:_ Requires exact frontend origin configuration (`credentials: true` in Fastify CORS plugin). Wildcard origins (`*`) with credentials are completely rejected.
