# Polybridge Ventures — Open Business Questions and Requirements Log

## Status: Active (Phase 0 Discovery)

Last Updated: 2026-10-14

---

## 1. Purpose and Policy

This document serves as the authoritative register of all unresolved commercial, operational, and financial business requirements for the Polybridge Ventures Trading Management CRM.

> [!IMPORTANT]
> **Engineering Rule:** The engineering team must **never invent** unconfirmed commercial policies, statutory tax calculations, approval limits, multi-currency mechanics, external payment provider integrations, or multi-tenant architectures.
>
> Where the system requires an initial baseline to establish structural contracts, safe configurable defaults are isolated behind domain policies and marked explicitly as **Assumptions** awaiting business sign-off.

---

## 2. Requirements Status Summary

| Category                     | Confirmed Requirements                                                                                                                                                                                         | Unconfirmed / Open Questions                                                                                                                               |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operating Model**          | Sourcing from suppliers and selling to customers without mandatory company-held inventory; supplier-direct delivery supported.                                                                                 | Dropshipping delivery confirmation method; liability for in-transit transit damages; returns handling.                                                     |
| **Organization & Hierarchy** | Standard hierarchical user roles: department, subdepartment, designation, manager reporting line (`reporting_to`), data scopes (`OWN_ONLY`, `TEAM_AND_SUBORDINATES`, `DEPARTMENT`, `SUBDEPARTMENT`, `GLOBAL`). | Delegated authority during leave; matrix reporting (dual managers); cross-department temporary access.                                                     |
| **Multi-Tenancy**            | Single operational entity initially, but design database schema with explicit organization boundary isolation (`organization_id`).                                                                             | Whether Polybridge Ventures operates multiple legal entities, subsidiaries, or branches requiring true multi-tenant tenancy.                               |
| **Currency & FX**            | Monetary values must use decimal precision (`NUMERIC(14,4)`). No floating point arithmetic.                                                                                                                    | Base currency; whether multi-currency trading (e.g., buying in USD/EUR and selling in GBP/INR) is required; FX rate provider.                              |
| **Pricing & Margin**         | Server calculates line totals, costs, discounts, and margins. Low margin requires commercial approval.                                                                                                         | Minimum margin threshold percentage; formula for landing cost (freight, duties, customs tariffs); customer-specific price lists.                           |
| **Quotation & Sales**        | Explicit quote state machine: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`. Atomic quote-to-order conversion.                                               | Validity period before quote expiration; quotation approval threshold matrix (by discount % or order total); cancellation fee policy.                      |
| **Procurement**              | Purchase Orders require explicit authorized issue step. PO states: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ISSUED`, `ACKNOWLEDGED`, `PARTIALLY_DELIVERED`, `COMPLETED`, `CANCELLED`.                         | PO spend approval limits by designation/role; supplier payment terms (Net 30, advance, LC); RFQ necessity.                                                 |
| **Fulfilment**               | Supplier-direct delivery tracking (dispatch date, expected delivery, shipment reference, proof of delivery metadata, exceptions).                                                                              | Integration with 3rd-party logistics carriers; customer sign-off requirement for delivery acceptance.                                                      |
| **Finance & Accounting**     | CRM records invoices, receipts, bills, and payments. Immutable financial audit log. Corrections via reversal/credit note only.                                                                                 | Local tax engine (VAT / GST / Sales tax) rules; integration with external ERP/accounting software (Xero, QuickBooks, NetSuite) vs CRM-only book of record. |
| **Inventory**                | Future module, disabled by default. When enabled, requires double-entry stock movement ledger, not a simple `inStock` toggle.                                                                                  | Target launch timeline; warehouse locations; stock valuation method (FIFO, LIFO, Weighted Average).                                                        |

---

## 3. Detailed Unresolved Questions by Domain

### 3.1 Organization Hierarchy, Roles & Approval Authorities

1. **Approval Authority Matrix:**
   - _Question:_ What are the exact monetary or margin discount thresholds that trigger approval escalation for Quotes and Purchase Orders?
   - _Current Phase 0 Assumption:_ Any Quote with a gross margin $< 15\%$ or discount $> 10\%$, and any Purchase Order exceeding a configurable threshold, transitions to `PENDING_APPROVAL` requiring review by a user with `can_approve` capability in the manager's reporting hierarchy.
   - _Required Decision:_ Business to provide the threshold matrix mapped to Designations (e.g., Trader, Senior Trader, Department Head, Director).

2. **Absence and Delegated Authority:**
   - _Question:_ When a manager in the `reporting_to` line is unavailable, can approvals be routed to a designated peer or escalated to the next level up?
   - _Current Phase 0 Assumption:_ Escalations route upward to the next non-null manager in the `reporting_to` hierarchy.
   - _Required Decision:_ Confirm if peer delegation or time-based auto-escalation is needed.

3. **Multi-Department / Matrix Reporting:**
   - _Question:_ Do users ever report to multiple managers (e.g., operational manager vs regional sales lead)?
   - _Current Phase 0 Assumption:_ Single direct supervisor model via self-referential `reporting_to_id` in the `users` table.

---

### 3.2 Currency, Multi-Currency, and Taxation

1. **Base Operating Currency:**
   - _Question:_ What is Polybridge Ventures' official base operating currency (e.g., USD, EUR, GBP, AED, SGD)?
   - _Current Phase 0 Assumption:_ Configurable system-wide default currency code (ISO 4217, 3 characters, e.g., `USD`), stored explicitly per transaction record.
   - _Required Decision:_ Confirm the primary accounting currency.

2. **Cross-Currency Sourcing and Selling:**
   - _Question:_ Does Polybridge Ventures purchase goods from international suppliers in one currency (e.g., EUR or CNY) and sell to customers in another (e.g., USD)?
   - _Current Phase 0 Assumption:_ Each Quote and Purchase Order records its transaction currency. Multi-currency exchange rate conversion is flagged as an open requirement; Phase 0 records the nominal currency code without automated live FX conversion.
   - _Required Decision:_ Confirm whether multi-currency transactions require fixed manual exchange rates per transaction, spot exchange rate feeds from an external API, or hedging contracts.

3. **Taxation & Statutory Compliance:**
   - _Question:_ Which jurisdictional tax regime applies (e.g., UK VAT, EU Reverse Charge VAT, US Sales Tax, UAE VAT)? Are prices quoted gross or net of tax?
   - _Current Phase 0 Assumption:_ The data model provides `tax_rate` and `tax_amount` fields as line-item and header attributes, but **no hardcoded statutory tax engine** is assumed. Tax calculation is marked as configurable.
   - _Required Decision:_ Provide applicable tax jurisdictions, exemption certificate rules, and customer tax registration requirements.

---

### 3.3 Customer Relationship Management (CRM)

1. **Lead Conversion Business Rules:**
   - _Question:_ What criteria must be satisfied before a Lead can be converted into an Account, Contact, and Opportunity?
   - _Current Phase 0 Assumption:_ Conversion requires valid business name, primary contact email/phone, and user confirmation. Lead status moves to `CONVERTED`, preserving source lead ID for auditability.
   - _Required Decision:_ Specify mandatory fields for conversion (e.g., credit check, tax ID, company registration number).

2. **Duplicate Detection & Merging:**
   - _Question:_ How should duplicate leads/accounts be detected and who has permission to merge them?
   - _Current Phase 0 Assumption:_ Duplicate detection flags matching email domains or normalized company names. Only users with `crm.account.merge` permission can merge records.

---

### 3.4 Quotations and Sales Workflow

1. **Quote Validity & Auto-Expiration:**
   - _Question:_ How long are supplier offers and customer quotations valid (e.g., 7 days, 14 days, 30 days)?
   - _Current Phase 0 Assumption:_ Quotes include an explicit `valid_until` timestamp. A background job transitions quotes to `EXPIRED` once this date passes, unless accepted.
   - _Required Decision:_ Confirm standard validity window and notification timeline before expiration.

2. **Quote Revision and Versioning:**
   - _Question:_ When an accepted or rejected quote needs modification, should the system increment a version number (e.g., Q-1001-v2) or create a fresh quote?
   - _Current Phase 0 Assumption:_ Quotes are versioned using a composite `quote_number` and `version` integer. Approving a new version supersedes the previous version.

3. **Quote-to-Order Commitment:**
   - _Question:_ Does customer acceptance require an uploaded signed purchase order document, an electronic acceptance confirmation, or a manual status change by sales?
   - _Current Phase 0 Assumption:_ Sales Rep or Manager can record acceptance with an optional customer PO reference and supporting document upload.

---

### 3.5 Procurement and Fulfilment

1. **Supplier Direct Delivery (Drop-shipping) Verification:**
   - _Question:_ Because Polybridge Ventures does not hold stock in this model, how is physical delivery verified?
   - _Current Phase 0 Assumption:_ Supplier or carrier provides a tracking reference and delivery receipt. Operations updates the Fulfilment record with Proof-of-Delivery (POD) metadata, which triggers the order status transition to `DELIVERED`.
   - _Required Decision:_ Confirm if customer signature capture, bill of lading (BOL), or supplier ASN (Advanced Shipping Notice) is mandatory before closing an order.

2. **Back-to-Back Purchase Orders:**
   - _Question:_ Should generating a Sales Order automatically generate draft Purchase Orders for the respective mapped suppliers (back-to-back ordering)?
   - _Current Phase 0 Assumption:_ Sales Orders and Purchase Orders are linked via `sales_order_id` on the PO line, but PO generation requires explicit procurement review and issuance. No PO is issued automatically without human approval.

3. **Damaged / Defective Goods & Returns:**
   - _Question:_ How are supplier-direct delivery exceptions, transit damages, and customer returns processed commercially?
   - _Current Phase 0 Assumption:_ Delivery exceptions are recorded as audit notes and flags on the `fulfilment_shipments` entity without adjusting physical inventory.
   - _Required Decision:_ Specify whether credit notes, supplier chargebacks, or return merchandise authorizations (RMA) are required in Phase 5.

---

### 3.6 Finance, Invoicing, and Payment Workflows

1. **Accounting System Integration vs CRM Book of Record:**
   - _Question:_ Is Polybridge Ventures planning to use this system as its primary General Ledger (GL) and Accounts Receivable/Payable system, or will it synchronize with an external accounting package (e.g., Xero, QuickBooks, SAP, NetSuite)?
   - _Current Phase 0 Assumption:_ The system acts as a commercial CRM with financial tracking (Invoices, Receipts, Bills, Payments) for margin tracking and cashflow visibility, but **does not claim to be a general ledger or statutory accounting software**. All financial operations provide export and webhook hooks for external ERP integration.
   - _Required Decision:_ Clarify the roadmap for accounting software integration.

2. **Payment Processing:**
   - _Question:_ Will customer payments be collected online (e.g., Stripe, bank transfer / ACH / Wire, LC)?
   - _Current Phase 0 Assumption:_ Payment records represent manual logging of bank transfers, remittances, or offline payments with reference numbers. No payment gateway credentials or credit card PAN data are stored.

3. **Sequential Invoicing & Legal Regulations:**
   - _Question:_ Are there mandatory sequential invoice numbering regulations (e.g., no gaps allowed, immutable numbering per tax year)?
   - _Current Phase 0 Assumption:_ Invoice numbers use an atomic database sequence (`INV-YYYY-XXXXXX`). Voided invoices retain their sequence number with status `VOIDED`; no physical deletion is permitted.

---

### 3.7 Future Inventory Module

1. **Inventory Valuation & Costing:**
   - _Question:_ When physical inventory management is introduced, what inventory valuation method is required?
   - _Current Phase 0 Assumption:_ Inventory is disabled in initial releases. Data contracts and database architecture are designed with a stock movement ledger extension point that preserves the integrity of past supplier-direct transactions.
   - _Required Decision:_ Confirm valuation requirements (FIFO, Specific Identification, or Moving Weighted Average) prior to Phase Future.

---

## 4. Review and Sign-off Process

Any updates to the answers above must be:

1. Approved by Polybridge Ventures business stakeholders.
2. Transferred from this file into the relevant domain policy or Architecture Decision Record (`docs/adr/`).
3. Reflected in the corresponding database migration and automated test suite.
