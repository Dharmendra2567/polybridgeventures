# Domain Glossary and Core Business Workflows

## Status: Approved Architecture Specification (Phase 0)

Last Updated: 2026-10-14

---

## 1. Domain Glossary

This glossary defines ubiquitous language across Polybridge Ventures Trading Management CRM. All code symbols, database entities, UI labels, and documentation must adhere to these terms.

### 1.1 Identity, Organizational Hierarchy & Access Control

| Term                                | Definition                                                                                                                                                              | Invariants & Rules                                                                                                 |
| :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **Organization**                    | The top-level legal entity or business unit operating the CRM.                                                                                                          | Root container for all departments, users, and business data.                                                      |
| **Department**                      | A functional division within the organization (e.g., Sales, Procurement, Operations, Finance, Executive, IT).                                                           | Every user belongs to exactly one primary department.                                                              |
| **Subdepartment**                   | A specialized team or sub-unit within a department (e.g., Inside Sales, International Sourcing, Accounts Payable).                                                      | Must belong to a valid parent department.                                                                          |
| **Designation**                     | The official job title or seniority level assigned to an employee (e.g., Junior Trader, Senior Sourcing Lead, Finance Manager, VP Commercial).                          | Determines default approval limits and role assignments.                                                           |
| **User**                            | An authenticated human operator with a unique email, credentials, assigned designation, department, subdepartment, and supervisor.                                      | Must have active status to access APIs. Cannot be self-registered.                                                 |
| **Reporting Line (`reporting_to`)** | The hierarchical supervisor-subordinate relationship where a User points to their direct manager (`reporting_to_id`).                                                   | Forms a directed acyclic graph (DAG). Cyclic reporting relationships are strictly prohibited by domain validation. |
| **Role**                            | A named collection of operational permissions (e.g., `Sales Representative`, `Procurement Specialist`, `Finance Manager`, `System Administrator`).                      | Users can be assigned one or more roles.                                                                           |
| **Permission**                      | A fine-grained authorization capability formatted as `resource.action` (e.g., `sales.quote.read`, `sales.quote.create`, `sales.quote.approve`, `procurement.po.issue`). | Evaluated deny-by-default on every request.                                                                        |
| **Data Scope**                      | The record-level visibility boundary applied to read and write actions: `OWN_ONLY`, `TEAM_AND_SUBORDINATES`, `SUBDEPARTMENT`, `DEPARTMENT`, or `GLOBAL`.                | Applied dynamically to query filters and mutation guards based on user role and hierarchy.                         |
| **Can Read / Can Write**            | Explicit boolean capabilities attached to role-permission mappings defining whether the user has read-only or read-write access within their data scope.                | Prevents unintentional write escalation for auditing or monitoring roles.                                          |

### 1.2 CRM & Relationship Management

| Term            | Definition                                                                                                         | Invariants & Rules                                                                                   |
| :-------------- | :----------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Lead**        | An unqualified individual or company prospect showing potential interest in trading transactions.                  | Has statuses `NEW`, `CONTACTED`, `QUALIFIED`, `UNQUALIFIED`, `CONVERTED`. Cannot be converted twice. |
| **Account**     | A verified commercial trading partner (Customer or Client Company).                                                | Master record for contacts, opportunities, quotes, and orders.                                       |
| **Contact**     | An individual person associated with an Account (e.g., Buyer, Procurement Officer, Accounts Payable Clerk).        | Must reference a valid Account.                                                                      |
| **Opportunity** | A qualified commercial sales deal tracked through pipeline stages toward closed-won or closed-lost.                | Has estimated value, target close date, pipeline stage, and probability.                             |
| **Activity**    | A timestamped interaction record (phone call, meeting, email log, follow-up task, or note) linked to a CRM entity. | Immutable once logged, with audit trail of author and timestamps.                                    |

### 1.3 Product Catalogue & Pricing Engine

| Term                      | Definition                                                                                                                  | Invariants & Rules                                                                        |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **Product**               | A standard trading commodity or item that Polybridge Ventures quotes, sells, or procures.                                   | Has a unique SKU, name, description, unit of measure, and active flag.                    |
| **Category**              | Hierarchical taxonomy grouping products (e.g., Chemicals, Industrial Materials, Consumer Goods).                            | Cannot be deleted if products are associated.                                             |
| **Unit of Measure (UOM)** | Standard physical measurement unit (e.g., MT, KG, Liter, Box, Piece).                                                       | Invariant: All quote lines and PO lines must explicitly declare their UOM.                |
| **Supplier Product**      | The mapping associating a specific Supplier with a Product, including the supplier's external part number and lead time.    | Must link valid Supplier and Product records.                                             |
| **Supplier Offer**        | A quoted price/cost for a product provided by a supplier, with effective validity dates and minimum order quantities (MOQ). | Provides the baseline cost for quote margin calculations.                                 |
| **Landed Cost**           | The total cost of sourcing a product, including base supplier offer price, freight, customs duties, and handling costs.     | Must be computed with decimal precision.                                                  |
| **Gross Margin**          | Commercial margin calculated as: $\frac{\text{Selling Price} - \text{Landed Cost}}{\text{Selling Price}} \times 100\%$.     | If below the company threshold (e.g., $< 15\%$), triggers commercial approval escalation. |

### 1.4 Quotations & Sales Lifecycle

| Term                 | Definition                                                                                                                              | Invariants & Rules                                                                                   |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Quote**            | A formal commercial offer presented to a customer specifying items, quantities, prices, currency, terms, and validity.                  | Governed by an explicit state machine. Cannot be edited once approved or sent.                       |
| **Quote Line**       | An individual line item on a Quote referencing a Product, quantity, unit cost, unit selling price, discount, and calculated line total. | Line total and margins revalidated server-side on creation/edit.                                     |
| **Quote Version**    | Revision increment for quotes. When modifications are requested on an issued quote, a new version is created.                           | Retains historical trail. Previous versions are marked `SUPERSEDED`.                                 |
| **Approval Request** | An escalation workflow generated when a Quote or PO breaches margin or discount rules.                                                  | Requires authorization by a manager in the user's `reporting_to` line with `can_approve` capability. |
| **Sales Order**      | A binding commercial order confirmed with the customer, typically converted from an accepted Quote.                                     | Immutable pricing; initiates procurement and fulfilment workflows.                                   |
| **Sales Order Line** | Line item of a confirmed Sales Order specifying confirmed product quantities and delivery schedules.                                    | Linked to subsequent PO lines and fulfilment shipments.                                              |

### 1.5 Procurement & Fulfilment

| Term                         | Definition                                                                                                               | Invariants & Rules                                                                         |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **Supplier**                 | A vendor or manufacturer from whom Polybridge Ventures procures trading commodities.                                     | Verified commercial profile with payment terms, currency, and tax credentials.             |
| **Purchase Order (PO)**      | A binding commercial contract issued to a Supplier to purchase goods for customer sales orders or trade operations.      | Explicit authorization required before issuance; cannot be edited once issued.             |
| **Purchase Order Line**      | Specific product, quantity, unit cost, and scheduled ship date agreed with the supplier.                                 | Linked to the originating Sales Order line when back-to-back trading applies.              |
| **Supplier-Direct Delivery** | Fulfilment mechanism where the supplier ships products directly to the customer's delivery address (Drop-shipping).      | **Does not create company warehouse inventory receipts or internal stock ledger entries.** |
| **Fulfilment Shipment**      | A tracked physical movement of goods from supplier to customer or warehouse.                                             | Records carrier name, tracking number, dispatch date, and delivery status.                 |
| **Proof of Delivery (POD)**  | Formal verification (signed consignment note, delivery receipt metadata, or electronic stamp) confirming client receipt. | Mandatory milestone before transitioning Fulfilment to `DELIVERED`.                        |
| **Delivery Exception**       | An incident report logged during transit (damage, delay, customs hold, discrepancy).                                     | Triggers notification to operations and account manager.                                   |

### 1.6 Finance & Financial Tracking

| Term                   | Definition                                                                                        | Invariants & Rules                                                                                     |
| :--------------------- | :------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| **Customer Invoice**   | A receivable billing document issued to a customer based on fulfilled or confirmed Sales Orders.  | Strictly sequential numbering; immutable once issued; corrections require Credit Notes or Void status. |
| **Payment Receipt**    | Record of funds received from a customer into Polybridge bank accounts.                           | Records bank reference, payment method, amount, currency, and unallocated balance.                     |
| **Payment Allocation** | Association linking a Payment Receipt to one or more Customer Invoices.                           | Total allocations cannot exceed total receipt amount. Invoices update to `PAID` or `PARTIALLY_PAID`.   |
| **Supplier Bill**      | An accounts payable liability document received from a supplier against an issued Purchase Order. | Matched against PO line prices and received quantities.                                                |
| **Supplier Payment**   | Disbursement record confirming payment to a supplier against one or more approved Supplier Bills. | Records payment authorization, wire/bank reference, and payment date.                                  |

---

## 2. Core Business Workflows

### 2.1 Workflow 1: User Organization Hierarchy & Data Scoping Resolution

Every authenticated API request resolves the user's identity, designation, department, subdepartment, and `reporting_to` manager tree to compute active data boundaries.

```mermaid
sequenceDiagram
    autonumber
    actor Client as User / Browser
    participant Gateway as Security & Fastify Layer
    participant Authz as Authorization Policy Guard
    participant OrgService as Organization Hierarchy Service
    participant Repo as Module Repository (PostgreSQL)

    Client->>Gateway: API Request with Session Cookie (e.g., GET /api/v1/crm/opportunities)
    Gateway->>Gateway: Validate Session & Extract userId
    Gateway->>Authz: Evaluate Request (userId, Resource: "crm.opportunity", Action: "read")
    Authz->>OrgService: Get User Context (userId)
    OrgService-->>Authz: UserContext {<br/>  role: "Sales Representative",<br/>  departmentId: "DEPT_SALES",<br/>  subdepartmentId: "SUBDEPT_INSIDE_SALES",<br/>  reportingToId: "USER_MGR_01",<br/>  dataScope: "TEAM_AND_SUBORDINATES",<br/>  canRead: true, canWrite: true<br/>}

    alt User lacks permission or canRead == false
        Authz-->>Gateway: 403 Forbidden (Insufficient Privileges)
        Gateway-->>Client: Error Response
    else Permission Granted with Data Scope
        Authz->>OrgService: Resolve Subordinate Tree (userId)
        OrgService-->>Authz: Subordinate User IDs: [userId, userSub1, userSub2]
        Authz->>Repo: Execute Query with Scope Filter:<br/>WHERE assigned_to_id IN (userId, userSub1, userSub2)
        Repo-->>Gateway: Scoped Records
        Gateway-->>Client: 200 OK (Data strictly bounded)
    end
```

---

### 2.2 Workflow 2: Lead Qualification and Conversion Flow

```mermaid
stateDiagram-v2
    [*] --> NEW: Lead Created (Manual or Import)
    NEW --> CONTACTED: Outreach Initiated (Call / Email)
    CONTACTED --> QUALIFIED: Commercial Need Verified
    CONTACTED --> UNQUALIFIED: Invalid Prospect / Disqualified

    state QUALIFIED {
        [*] --> PendingConversionCheck
        PendingConversionCheck --> AtomicConversion: Validate Required Fields
        note right of AtomicConversion
            Inside single DB Transaction:
            1. Create Account
            2. Create primary Contact
            3. Create Opportunity
            4. Update Lead status to CONVERTED
            5. Retain converted_account_id on Lead
            6. Write Audit Log
        end note
    }

    QUALIFIED --> CONVERTED: Conversion Successful
    CONVERTED --> [*]: Read-only Archived Record
    UNQUALIFIED --> [*]
```

---

### 2.3 Workflow 3: Opportunity to Quote Creation & Pricing/Margin Calculation

```mermaid
sequenceDiagram
    autonumber
    actor SalesRep as Sales Representative
    participant SalesMod as Sales Module
    participant PricingMod as Pricing Module
    participant CatalogueMod as Catalogue Module
    participant AuditMod as Audit Module
    participant DB as PostgreSQL

    SalesRep->>SalesMod: Create Quote (opportunityId, currency, customerId)
    SalesMod->>SalesMod: Initialize Quote in DRAFT state
    SalesRep->>SalesMod: Add Quote Lines (productId, quantity, requestedPrice)

    loop For each Line Item
        SalesMod->>CatalogueMod: Validate Product (productId)
        CatalogueMod-->>SalesMod: Product Active, UOM details
        SalesMod->>PricingMod: Get Landed Cost (productId, quantity, currency)
        PricingMod-->>SalesMod: Landed Cost { baseCost: 100.00, estimatedFreight: 10.00, totalCost: 110.00 }
        SalesMod->>SalesMod: Compute Line Margin:<br/>margin% = (requestedPrice - totalCost) / requestedPrice
        SalesMod->>SalesMod: Calculate Line Total with Decimal Math
    end

    SalesMod->>SalesMod: Calculate Quote Subtotal, Tax, and Overall Gross Margin
    SalesMod->>DB: Persist Quote & QuoteLines inside Transaction
    SalesMod->>AuditMod: Record Quote Created Event
    SalesMod-->>SalesRep: Quote Created (Status: DRAFT, Summary: Total & Margin)
```

---

### 2.4 Workflow 4: Quotation Lifecycle & Approval State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Quote Created
    DRAFT --> DRAFT: Edit Lines & Pricing

    DRAFT --> PENDING_APPROVAL: Submit Quote (Gross Margin < Threshold OR Discount > Limit)
    DRAFT --> APPROVED: Submit Quote (Margin & Discount within Policy)

    state PENDING_APPROVAL {
        [*] --> EscalatedToManager
        note right of EscalatedToManager
            Assigned to supervisor in user's
            reporting_to tree with can_approve capability.
            Separation of duties: User cannot approve own quote.
        end note
        EscalatedToManager --> ApprovedByManager: Manager Approves
        EscalatedToManager --> RejectedByManager: Manager Rejects with Reason
    }

    PENDING_APPROVAL --> APPROVED: Approved by Authorized Manager
    PENDING_APPROVAL --> DRAFT: Rejected (Returned for Revision)

    APPROVED --> SENT: Transmitted to Customer (PDF Generated)

    SENT --> ACCEPTED: Customer Confirms Order
    SENT --> REJECTED: Customer Declines
    SENT --> EXPIRED: Valid Until Date Elapsed
    SENT --> DRAFT: Superseded by New Version (Quote Revision)

    ACCEPTED --> [*]: Eligible for Conversion to Sales Order
    REJECTED --> [*]: Terminal State
    EXPIRED --> [*]: Terminal State
    DRAFT --> CANCELLED: Manually Withdrawn
    CANCELLED --> [*]: Terminal State
```

---

### 2.5 Workflow 5: Atomic Quote-to-Sales Order Conversion

```mermaid
sequenceDiagram
    autonumber
    actor SalesRep as Sales Representative
    participant SalesMod as Sales Module
    participant DB as PostgreSQL
    participant Outbox as Outbox Dispatcher
    participant NotifyMod as Notification Module

    SalesRep->>SalesMod: Convert Quote (quoteId, customerPoRef, idempotencyKey)
    SalesMod->>DB: Begin Database Transaction
    SalesMod->>DB: SELECT * FROM quotes WHERE id = quoteId FOR UPDATE

    alt Quote is not in ACCEPTED state OR already converted
        SalesMod->>DB: Rollback Transaction
        SalesMod-->>SalesRep: 409 Conflict: Quote already converted or invalid status
    else Valid for Conversion
        SalesMod->>DB: Insert into sales_orders (order_number, account_id, currency, total_amount, status='CONFIRMED')
        SalesMod->>DB: Insert into sales_order_lines (copying quote_lines with locked pricing)
        SalesMod->>DB: UPDATE quotes SET status = 'CONVERTED', converted_order_id = order.id WHERE id = quoteId
        SalesMod->>DB: Insert into audit_logs (action='sales.quote.converted', orderId, quoteId)
        SalesMod->>DB: Insert into outbox_events (event_type='SalesOrderConfirmed', payload)
        SalesMod->>DB: Commit Database Transaction

        SalesMod-->>SalesRep: 201 Created (Sales Order ID & Summary)

        Outbox->>DB: Poll unprocessed outbox_events
        Outbox->>NotifyMod: Dispatch Notification to Procurement & Finance Teams
        Outbox->>DB: Mark outbox_event PROCESSED
    end
```

---

### 2.6 Workflow 6: Procurement & Purchase Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: PO Created (Manually or from Sales Order)
    DRAFT --> DRAFT: Modify Lines, Quantities, Agreed Costs

    DRAFT --> PENDING_APPROVAL: Submit PO (Spend > User Approval Limit)
    DRAFT --> APPROVED: Submit PO (Spend <= User Approval Limit)

    state PENDING_APPROVAL {
        [*] --> RoutedToProcurementManager
        RoutedToProcurementManager --> POApproved: Manager Reviews & Signs Off
        RoutedToProcurementManager --> PORejected: Rejected with Note
    }

    PENDING_APPROVAL --> APPROVED: Approved by Authorized Manager
    PENDING_APPROVAL --> DRAFT: Rejected (Returned for Correction)

    APPROVED --> ISSUED: Formally Sent to Supplier (PDF / EDI)
    ISSUED --> ACKNOWLEDGED: Supplier Confirms Order & Delivery Dates

    ACKNOWLEDGED --> PARTIALLY_DELIVERED: Supplier Dispatches Partial Shipment
    PARTIALLY_DELIVERED --> COMPLETED: Final Shipment Delivered & POD Verified
    ACKNOWLEDGED --> COMPLETED: Full Shipment Delivered & POD Verified

    ISSUED --> CANCELLED: Cancelled with Supplier Consent
    DRAFT --> CANCELLED: Withdrawn before Issue
    COMPLETED --> [*]: Ready for Supplier Bill Matching
    CANCELLED --> [*]: Terminal State
```

---

### 2.7 Workflow 7: Supplier-Direct Fulfilment (Drop-shipping)

```mermaid
sequenceDiagram
    autonumber
    actor OpsUser as Operations Specialist
    participant FulfilmentMod as Fulfilment Module
    participant ProcurementMod as Procurement Module
    participant SalesMod as Sales Module
    participant AuditMod as Audit Module
    participant DB as PostgreSQL

    OpsUser->>FulfilmentMod: Create Shipment (purchaseOrderId, salesOrderId, carrier, trackingNumber)
    FulfilmentMod->>FulfilmentMod: Verify Supplier-Direct flag == TRUE
    note over FulfilmentMod: Invariant: No internal warehouse stock movements<br/>or inventory ledger entries are created.
    FulfilmentMod->>DB: Insert into fulfilment_shipments (status='DISPATCHED', carrier, trackingNumber)
    FulfilmentMod->>ProcurementMod: Update PO status to PARTIALLY_DELIVERED or DISPATCHED
    FulfilmentMod->>SalesMod: Update Sales Order status to SOURCING / IN_TRANSIT

    alt In-Transit Exception Occurs
        OpsUser->>FulfilmentMod: Log Delivery Exception (shipmentId, reason="Customs Inspection Delay")
        FulfilmentMod->>DB: Insert delivery_exceptions record & trigger alert
    else Normal Delivery
        OpsUser->>FulfilmentMod: Confirm Delivery (shipmentId, proofOfDeliveryMetadata, signedBy, deliveredAt)
        FulfilmentMod->>DB: Begin Transaction
        FulfilmentMod->>DB: UPDATE fulfilment_shipments SET status='DELIVERED', pod_metadata=...
        FulfilmentMod->>SalesMod: Mark Sales Order as FULFILLED
        FulfilmentMod->>ProcurementMod: Mark Purchase Order as COMPLETED
        FulfilmentMod->>AuditMod: Log Fulfilment Delivery Verification
        FulfilmentMod->>DB: Commit Transaction
        FulfilmentMod-->>OpsUser: Shipment Marked Delivered (Triggers Customer Invoice Eligibility)
    end
```

---

### 2.8 Workflow 8: Finance Billing, Payment Matching & Invariant Enforcement

```mermaid
sequenceDiagram
    autonumber
    actor FinUser as Finance Officer
    participant FinMod as Finance Module
    participant SalesMod as Sales Module
    participant AuditMod as Audit Module
    participant DB as PostgreSQL

    FinUser->>FinMod: Generate Customer Invoice (salesOrderId)
    FinMod->>SalesMod: Verify Sales Order is FULFILLED or Eligible for Billing
    SalesMod-->>FinMod: Confirmed Lines & Quantities
    FinMod->>DB: Insert into customer_invoices (invoice_number, sales_order_id, total, balance_due, status='ISSUED')

    FinUser->>FinMod: Record Customer Payment Receipt (accountId, amount, currency, bankRef)
    FinMod->>DB: Insert into payment_receipts (amount, unallocated_amount = amount)

    FinUser->>FinMod: Allocate Payment (paymentReceiptId, invoiceId, allocatedAmount)
    FinMod->>DB: Begin Database Transaction
    FinMod->>DB: SELECT * FROM payment_receipts WHERE id = receiptId FOR UPDATE
    FinMod->>DB: SELECT * FROM customer_invoices WHERE id = invoiceId FOR UPDATE

    alt allocatedAmount > unallocated_amount OR allocatedAmount > balance_due
        FinMod->>DB: Rollback Transaction
        FinMod-->>FinUser: 422 Unprocessable Entity (Allocation exceeds available balance)
    else Valid Allocation
        FinMod->>DB: Insert into payment_allocations (receipt_id, invoice_id, amount)
        FinMod->>DB: UPDATE payment_receipts SET unallocated_amount = unallocated_amount - allocatedAmount
        FinMod->>DB: UPDATE customer_invoices SET balance_due = balance_due - allocatedAmount,<br/>status = CASE WHEN balance_due == 0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END
        FinMod->>AuditMod: Log Financial Payment Allocation (Immutable Record)
        FinMod->>DB: Commit Transaction
        FinMod-->>FinUser: Allocation Successful (Invoice Status Updated)
    end
```
