/**
 * Authoritative International & Back-to-Back Trading Document Taxonomy
 * Aligned with ICC Incoterms 2020, UCP 600 Letter of Credit standards, and
 * cross-border commodity export/import compliance.
 */

export interface DocumentTaxonomyItem {
  code: string;
  name: string;
  phase: 'PRE_SALES' | 'SALES_ORDER' | 'PROCUREMENT' | 'FULFILMENT' | 'FINANCE';
  entityType: 'QUOTE' | 'SALES_ORDER' | 'PURCHASE_ORDER' | 'FULFILMENT_SHIPMENT' | 'CUSTOMER_INVOICE' | 'SUPPLIER_BILL' | 'ACCOUNT' | 'SUPPLIER';
  description: string;
  isComplianceCritical: boolean;
  acceptedFormats: string[];
}

export const TRADE_DOCUMENT_TAXONOMY: DocumentTaxonomyItem[] = [
  // -------------------------------------------------------------
  // PHASE 1: PRE-SALES & QUOTATION
  // -------------------------------------------------------------
  {
    code: 'BUYER_RFQ',
    name: 'Buyer Request for Quotation (RFQ)',
    phase: 'PRE_SALES',
    entityType: 'QUOTE',
    description: 'Initial customer inquiry detailing requested volumes (MT), specs, target Incoterm, and destination port.',
    isComplianceCritical: false,
    acceptedFormats: ['pdf', 'docx', 'xlsx', 'png'],
  },
  {
    code: 'TECHNICAL_SPEC',
    name: 'Technical Data Sheet (TDS) / Certificate of Analysis (CoA)',
    phase: 'PRE_SALES',
    entityType: 'QUOTE',
    description: 'Manufacturer chemical assay, purity, moisture, and mesh specifications verifying product grade.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png', 'jpg'],
  },
  {
    code: 'SUPPLIER_PROFORMA_QUOTE',
    name: 'Supplier Offer Sheet / Cost Quotation',
    phase: 'PRE_SALES',
    entityType: 'QUOTE',
    description: 'Vendor cost quotation and lead-time guarantee used to lock trader pricing margins.',
    isComplianceCritical: false,
    acceptedFormats: ['pdf', 'xlsx', 'docx'],
  },
  {
    code: 'PROFORMA_INVOICE',
    name: 'Proforma Invoice (PI)',
    phase: 'PRE_SALES',
    entityType: 'QUOTE',
    description: 'Formal commercial proposal issued to buyer with validity period and payment terms.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf'],
  },
  {
    code: 'SIGNED_QUOTE_ACCEPTANCE',
    name: 'Signed Quote Acceptance',
    phase: 'PRE_SALES',
    entityType: 'QUOTE',
    description: 'Customer signature or countersigned quote authorizing conversion to formal Sales Order.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png', 'jpg'],
  },

  // -------------------------------------------------------------
  // PHASE 2: SALES ORDER & CUSTOMER CONTRACT
  // -------------------------------------------------------------
  {
    code: 'CUSTOMER_PO',
    name: 'Customer Official Purchase Order (Buyer PO)',
    phase: 'SALES_ORDER',
    entityType: 'SALES_ORDER',
    description: 'Mandatory legally-binding order document issued by buyer with billing/shipping address and line quantities.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png'],
  },
  {
    code: 'SALES_CONTRACT',
    name: 'International Sales Contract / Trade Agreement',
    phase: 'SALES_ORDER',
    entityType: 'SALES_ORDER',
    description: 'Bilingual or international contract defining Incoterms 2020 rules, jurisdiction, and force majeure.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'docx'],
  },
  {
    code: 'LETTER_OF_CREDIT',
    name: 'Letter of Credit (L/C) / Bank Guarantee Copy',
    phase: 'SALES_ORDER',
    entityType: 'SALES_ORDER',
    description: 'Irrevocable documentary letter of credit (UCP 600) opened by buyer bank guaranteeing payment upon presentation.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png'],
  },
  {
    code: 'PAYMENT_SWIFT_ADVANCE',
    name: 'Buyer Advance SWIFT MT103 / Payment Receipt',
    phase: 'SALES_ORDER',
    entityType: 'SALES_ORDER',
    description: 'Bank wire transfer confirmation showing buyer advance deposit (e.g. 20-30% deposit) cleared into trade account.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png', 'jpg'],
  },

  // -------------------------------------------------------------
  // PHASE 3: PROCUREMENT & PURCHASE ORDERS (TO SUPPLIERS)
  // -------------------------------------------------------------
  {
    code: 'COUNTERSIGNED_PO',
    name: 'Countersigned Supplier Purchase Order',
    phase: 'PROCUREMENT',
    entityType: 'PURCHASE_ORDER',
    description: 'PO issued by Polybridge signed and stamped by supplier acknowledging agreed costs, quantity, and dispatch date.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png'],
  },
  {
    code: 'SUPPLIER_ORDER_CONFIRMATION',
    name: 'Supplier Order Confirmation / Proforma Invoice',
    phase: 'PROCUREMENT',
    entityType: 'PURCHASE_ORDER',
    description: 'Manufacturer formal order confirmation with production batch number and factory bank coordinates.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'docx'],
  },
  {
    code: 'QUALITY_SCHEDULE',
    name: 'Production & Quality Assurance Commitment',
    phase: 'PROCUREMENT',
    entityType: 'PURCHASE_ORDER',
    description: 'Factory manufacturing timeline and in-process testing schedule for bulk commodities.',
    isComplianceCritical: false,
    acceptedFormats: ['pdf', 'xlsx'],
  },
  {
    code: 'SUPPLIER_PAYMENT_SWIFT',
    name: 'Supplier Advance Wire Remittance Advice',
    phase: 'PROCUREMENT',
    entityType: 'PURCHASE_ORDER',
    description: 'Bank payment remittance slip confirming advance transfer to supplier to commence batch packaging.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png', 'jpg'],
  },

  // -------------------------------------------------------------
  // PHASE 4: FULFILMENT, LOGISTICS & SUPPLIER-DIRECT DISPATCH
  // -------------------------------------------------------------
  {
    code: 'BILL_OF_LADING',
    name: 'Ocean Bill of Lading (B/L) / Sea Waybill / Air Waybill (AWB)',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Official document of title, receipt of cargo, and contract of carriage issued by carrier/freight forwarder.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png'],
  },
  {
    code: 'COMMERCIAL_INVOICE',
    name: 'Certified Export Commercial Invoice',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Definitive commercial invoice used by destination port customs to assess duties, VAT, and tariffs.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf'],
  },
  {
    code: 'PACKING_LIST',
    name: 'Packing List & Weight Certificate',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Detailed breakdown of containers, pallets, net weight, gross weight, tare weight, and container seal numbers.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'xlsx'],
  },
  {
    code: 'CERTIFICATE_OF_ORIGIN',
    name: 'Certificate of Origin (COO)',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Chamber of Commerce attestation proving manufacturing country for bilateral trade agreements and tariff reductions.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png'],
  },
  {
    code: 'INSPECTION_CERTIFICATE',
    name: 'Pre-Shipment Quality Inspection Certificate (SGS/Intertek)',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Independent inspection certifying cargo quality, weight, grade, and container sealing before vessel departure.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png'],
  },
  {
    code: 'INSURANCE_CERTIFICATE',
    name: 'Marine Cargo Insurance Policy',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Underwriter certificate insuring container cargo against sea loss, water damage, or general average.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf'],
  },
  {
    code: 'CUSTOMS_SHIPPING_BILL',
    name: 'Export Customs Shipping Bill / Clearance',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Customs port clearance documentation validating legal export and duty clearance.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png'],
  },
  {
    code: 'PROOF_OF_DELIVERY',
    name: 'Proof of Delivery (POD) / Signed Delivery Receipt',
    phase: 'FULFILMENT',
    entityType: 'FULFILMENT_SHIPMENT',
    description: 'Signed and stamped consignee receipt confirming safe physical cargo delivery. Triggers invoice balance release.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png', 'jpg'],
  },

  // -------------------------------------------------------------
  // PHASE 5: FINANCE, BILLING & SETTLEMENT
  // -------------------------------------------------------------
  {
    code: 'FINAL_CUSTOMER_INVOICE',
    name: 'Final Customer Commercial Tax Invoice',
    phase: 'FINANCE',
    entityType: 'CUSTOMER_INVOICE',
    description: 'Definitive invoice issued to buyer reflecting delivered quantities, adjustments, and final balance due.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf'],
  },
  {
    code: 'BUYER_PAYMENT_REMITTANCE',
    name: 'Customer Final Remittance / Wire Confirmation',
    phase: 'FINANCE',
    entityType: 'CUSTOMER_INVOICE',
    description: 'Buyer bank transfer confirmation clearing invoice balance.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png', 'jpg'],
  },
  {
    code: 'SUPPLIER_BILL',
    name: 'Supplier Commercial Bill / Factory Tax Invoice',
    phase: 'FINANCE',
    entityType: 'SUPPLIER_BILL',
    description: 'Accounts payable invoice received from manufacturer against PO delivery.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf'],
  },
  {
    code: 'SUPPLIER_DISBURSEMENT_SLIP',
    name: 'Supplier Outward Wire Remittance Advice (SWIFT)',
    phase: 'FINANCE',
    entityType: 'SUPPLIER_BILL',
    description: 'Proof of settlement payment wired to supplier bank account.',
    isComplianceCritical: true,
    acceptedFormats: ['pdf', 'png', 'jpg'],
  },
  {
    code: 'OTHER',
    name: 'Other Supporting Trade Document',
    phase: 'PRE_SALES',
    entityType: 'QUOTE',
    description: 'Any general supporting contract, amendment, email confirmation, or laboratory test report.',
    isComplianceCritical: false,
    acceptedFormats: ['pdf', 'docx', 'xlsx', 'png', 'jpg'],
  },
];

export function getCategoriesForEntity(entityType: string): DocumentTaxonomyItem[] {
  const norm = entityType.toUpperCase();
  return TRADE_DOCUMENT_TAXONOMY.filter(
    (item) => item.entityType === norm || item.code === 'OTHER'
  );
}

export function getCategoryDetails(categoryCode: string): DocumentTaxonomyItem | undefined {
  return TRADE_DOCUMENT_TAXONOMY.find((item) => item.code === categoryCode);
}
