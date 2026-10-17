# ADR-007: User Roles, Organizational Hierarchy, and Data Scoping Architecture

## Status: Approved

Date: 2026-10-14  
Deciders: Lead Architect, Core Engineering Team

---

## 1. Context and Problem Statement

Polybridge Ventures' trading operations require an enterprise-grade authorization and organizational structure that reflects commercial reality. Different employees possess distinct responsibilities, seniority levels, managerial oversight duties, and record-level data visibility.

Specifically, the system must support:

1. **Organizational Hierarchy:** Departments (e.g., Sales, Procurement, Finance, Operations), Subdepartments (e.g., Inside Sales, International Sourcing), and Designations (e.g., Junior Trader, Senior Sourcing Lead, Commercial Director).
2. **Managerial Oversight (`reporting_to`):** Employees report to designated supervisors, creating a hierarchical tree where managers oversee deals, quotes, and orders managed by their direct and indirect subordinates.
3. **Role-Based Access Control (RBAC):** Fine-grained permissions modeled as `resource.action` (e.g., `sales.quote.read`, `sales.quote.create`, `sales.quote.approve`).
4. **Data Scopes and Read/Write Capabilities:** Explicit scoping rules that dynamically determine whether a user can read or write records:
   - `OWN_ONLY`: Only records owned by or assigned to the user.
   - `TEAM_AND_SUBORDINATES`: Records belonging to the user and any member whose `reporting_to` line traces back to the user.
   - `SUBDEPARTMENT`: Records belonging to members of the user's subdepartment.
   - `DEPARTMENT`: Records belonging to members of the user's department.
   - `GLOBAL`: Organization-wide visibility (reserved for executives, finance officers, and administrators).
   - `can_read` / `can_write` / `can_approve` / `can_delete`: Explicit boolean capabilities attached to permissions.

---

## 2. Decision

We will implement a **Unified Organizational Hierarchy and Dynamic Data Scoping Architecture**.

### 2.1 Entity Schema Structure

```
[organizations]
       │
       ├──> [departments]
       │           │
       │           ├──> [subdepartments]
       │           └──> [designations]
       │
       └──> [users]
               │ (self-referential: reporting_to_id)
               │
               ├──> [user_roles] <── [roles]
                                       │
                                       └──> [role_permissions] <── [permissions]
```

1. **Organizational Entities:**
   - `departments`: Functional operational divisions (`id`, `organization_id`, `name`, `code`).
   - `subdepartments`: Team desks within a department (`id`, `department_id`, `name`, `code`).
   - `designations`: Job titles and seniority rankings (`id`, `department_id`, `title`, `seniority_level`, `default_approval_limit`).
2. **User Record & Hierarchy:**
   - Every `User` has `department_id`, optional `subdepartment_id`, `designation_id`, and a self-referential `reporting_to_id UUID REFERENCES users(id)`.
   - **Invariants:**
     - A user cannot report to themselves (`reporting_to_id != id`).
     - The reporting hierarchy must be a Directed Acyclic Graph (DAG). Cycle detection runs on user create/update.
3. **Roles and Permissions:**
   - `permissions`: Declares resource-action pairs (`resource`, `action`, `description`).
   - `role_permissions`: Maps permissions to roles, establishing:
     - `can_read`: Boolean capability.
     - `can_write`: Boolean capability.
     - `can_approve`: Boolean capability (enabling authorization sign-offs).
     - `can_delete`: Boolean capability (enabling soft-deletion / withdrawal).
     - `data_scope`: Enum (`OWN_ONLY`, `TEAM_AND_SUBORDINATES`, `SUBDEPARTMENT`, `DEPARTMENT`, `GLOBAL`).

---

### 2.2 Data Scope Resolution Algorithm

When an authenticated user requests a resource (e.g., `GET /api/v1/sales/quotes` or `GET /api/v1/crm/opportunities`):

1. **Permission Check:**
   - Verify the user possesses a role granting `resource.action` where `can_read == true` (for reads) or `can_write == true` (for mutations). If not, immediately return `403 Forbidden`.
2. **Resolve Active Data Scope:**
   - Select the most permissive `data_scope` among the user's assigned roles for that permission:
     $$\text{GLOBAL} > \text{DEPARTMENT} > \text{SUBDEPARTMENT} > \text{TEAM\_AND\_SUBORDINATES} > \text{OWN\_ONLY}$$
3. **Query Filter Generation:**
   - If `GLOBAL`: No scope filter applied (tenant isolation `organization_id == user.organization_id` remains enforced).
   - If `DEPARTMENT`: Filter `WHERE assigned_to.department_id = user.department_id`.
   - If `SUBDEPARTMENT`: Filter `WHERE assigned_to.subdepartment_id = user.subdepartment_id`.
   - If `TEAM_AND_SUBORDINATES`:
     - Resolve the user's subordinate tree (the user's ID plus all direct and indirect reports via recursive CTE on `reporting_to_id`):
       ```sql
       WITH RECURSIVE subordinates AS (
           SELECT id FROM users WHERE id = :currentUserId
           UNION ALL
           SELECT u.id FROM users u
           INNER JOIN subordinates s ON u.reporting_to_id = s.id
       )
       SELECT id FROM subordinates;
       ```
     - Apply filter `WHERE assigned_to_id IN (SELECT id FROM subordinates)`.
   - If `OWN_ONLY`: Filter `WHERE (assigned_to_id = :currentUserId OR created_by_id = :currentUserId)`.

---

### 2.3 Managerial Approval Escalation Flow

When an operation requires approval (e.g., Quote discount or low gross margin):

1. The system creates a `QuoteApprovalRequest`.
2. The request routes to the immediate supervisor (`user.reporting_to_id`).
3. If the supervisor possesses `can_approve == true` and their designation's approval limit accommodates the quote, they can approve.
4. If the supervisor is absent or their limit is exceeded, the request escalates up the `reporting_to` tree to the next senior manager.
5. **Separation of Duties (SoD):** The submitter cannot approve their own request under any circumstance.

---

## 3. Rationale and Comparison

| Evaluation Attribute           | Flat RBAC (Roles Only)                                 | Organizational Hierarchy + Data Scoping (Chosen)                |
| :----------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------- |
| **Organizational Alignment**   | Poor; cannot model managers seeing subordinate deals   | **Exact**; mirrors company hierarchy and reporting desks        |
| **Separation of Duties**       | Difficult to enforce without ad-hoc code               | **Built-in**; evaluated against reporting line and capabilities |
| **Horizontal Data Isolation**  | High risk of sales reps seeing competitor reps' quotes | **Strict**; prevented by `OWN_ONLY` / `TEAM` scopes             |
| **Administrative Flexibility** | Roles must be duplicated per department                | **High**; reusable roles applied across distinct departments    |

---

## 4. Consequences and Constraints

### Positive Consequences

- Realizes commercial privacy: traders focus on their own deals, while managers gain automated visibility into their team's pipeline.
- Flexible role assignments without code changes.
- Eliminates hardcoded role names in route handlers.

### Trade-offs & Mitigations

- **Recursive CTE Query Overhead:**
  - _Risk:_ Evaluating the subordinate hierarchy tree on every list query could degrade performance if the employee tree is deep.
  - _Mitigation:_ Subordinate user ID lists are cached in the user's session context and invalidated only when user reporting relationships change.
