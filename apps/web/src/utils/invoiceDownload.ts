export interface InvoiceDownloadData {
  invoiceNumber: string;
  orderNumber?: string;
  customerName?: string;
  supplierName?: string;
  type?: "SALES_INVOICE" | "SUPPLIER_BILL";
  destinationPort?: string;
  deliveryTerm?: string;
  customerPo?: string;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  status?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    uom?: string;
    unitPrice?: number;
    total: number;
  }>;
}

export function downloadCommercialInvoice(data: InvoiceDownloadData): void {
  const isSupplierBill =
    data.type === "SUPPLIER_BILL" ||
    data.invoiceNumber.startsWith("BILL-") ||
    !!data.supplierName;
  const currency = data.currency || "USD";
  const issueDate = data.issueDate || new Date().toISOString().split("T")[0];
  const dueDate =
    data.dueDate ||
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const paid = data.paidAmount ?? 0;
  const balance = data.balanceDue ?? data.totalAmount - paid;
  const status = data.status || (isSupplierBill ? "PENDING" : "ISSUED");
  const orderRef =
    data.orderNumber ||
    (isSupplierBill ? "PO-2026-CONFIRMED" : "SO-2026-CONFIRMED");
  const poRef =
    data.customerPo ||
    (isSupplierBill ? "SUPPLIER-DELIVERY-DISPATCH" : "PO-CLIENT-VERIFIED");
  const port = data.destinationPort || "Mundra / Pipavav Port, Gujarat";
  const incoterm = data.deliveryTerm || "FOB Origin Port / CIF Destination";

  const formattedTotal = `$${data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const formattedPaid = `$${paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const formattedBalance = `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const docTitle = isSupplierBill
    ? "Supplier Purchase Invoice / Commercial Bill"
    : "Commercial Export Invoice";
  const issuerName = isSupplierBill
    ? data.supplierName || "Gujarat Agro & Spice Processors Ltd"
    : "POLYBRIDGE VENTURES LLP";
  const issuerSubtitle = isSupplierBill
    ? "Approved Agricultural Commodity Producer & Sourcing Partner"
    : "International Agro-Commodities & Export Desk";
  const recipientTitle = isSupplierBill
    ? "Billed To (Trading House):"
    : "Buyer & Consignee:";
  const recipientName = isSupplierBill
    ? "Polybridge Ventures LLP"
    : data.customerName || "Verified International Buyer LLC";

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${data.invoiceNumber} - Polybridge Ventures</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-wrapper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .no-print-bar {
      max-width: 820px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
    }
    .btn-action {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }
    .btn-action:hover {
      background: #2563eb;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .company-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .company-subtitle {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-top: 2px;
    }
    .company-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 6px;
      line-height: 1.4;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-badge h1 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-num {
      font-size: 15px;
      font-family: monospace;
      color: #3b82f6;
      font-weight: 700;
      margin-top: 4px;
    }
    .status-tag {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .info-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .info-val-strong {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    .meta-table td {
      padding: 3px 0;
      font-size: 12px;
    }
    .meta-label {
      color: #64748b;
      width: 130px;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 600;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      padding: 10px 12px;
    }
    .items-table th.tar, .items-table td.tar {
      text-align: right;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    .items-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .bank-box {
      background: #f1f5f9;
      padding: 14px 18px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }
    .bank-title {
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .bank-item {
      font-size: 11.5px;
      color: #334155;
      line-height: 1.6;
    }
    .totals-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      justify-content: flex-start;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12.5px;
      color: #475569;
    }
    .total-row.grand {
      border-top: 2px solid #0f172a;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .footer-stamp {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px dashed #cbd5e1;
      padding-top: 20px;
      margin-top: 20px;
    }
    .sign-box {
      text-align: center;
      width: 220px;
    }
    .sign-line {
      border-top: 1px solid #475569;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
      .invoice-wrapper {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div>
      <strong>${docTitle}: ${data.invoiceNumber}</strong>
      <span style="font-size: 12px; opacity: 0.8; margin-left: 8px;">Polybridge Ventures LLP Trading & Sourcing Engine</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-action" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
  </div>

  <div class="invoice-wrapper">
    <div class="header-row">
      <div>
        <div class="company-title">${issuerName}</div>
        <div class="company-subtitle">${issuerSubtitle}</div>
        <div class="company-meta">
          ${
            isSupplierBill
              ? `
            Sourcing Facility & Procurement Operations<br>
            State: Gujarat, India | Quality Grade: Export Certified<br>
            Bank Settlement: Verified RTGS / SWIFT Remittance Partner
          `
              : `
            Corporate Reg: LLPIN-AAC-8921 | IEC No: PBV-EXP-99201<br>
            Ahmedabad Trade Center, Gujarat 380015, India<br>
            Desk: +91 (0) 79 4829 1000 | exports@polybridgeventures.com
          `
          }
        </div>
      </div>
      <div class="doc-badge">
        <h1>${docTitle}</h1>
        <div class="doc-num">${data.invoiceNumber}</div>
        <div class="status-tag">${status}</div>
      </div>
    </div>

    <div class="grid-info">
      <div>
        <div class="info-title">${recipientTitle}</div>
        <div class="info-val-strong">${recipientName}</div>
        <table class="meta-table">
          <tr><td class="meta-label">Port / Station:</td><td class="meta-val">${port}</td></tr>
          <tr><td class="meta-label">Delivery Terms:</td><td class="meta-val">${incoterm}</td></tr>
          <tr><td class="meta-label">${isSupplierBill ? "Purchase Order Ref:" : "Sales Order Ref:"}</td><td class="meta-val">${orderRef}</td></tr>
          <tr><td class="meta-label">${isSupplierBill ? "Delivery / Dispatch Ref:" : "Buyer PO Ref:"}</td><td class="meta-val">${poRef}</td></tr>
        </table>
      </div>
      <div>
        <div class="info-title">Settlement & Commercial Terms:</div>
        <table class="meta-table">
          <tr><td class="meta-label">Document Date:</td><td class="meta-val">${issueDate}</td></tr>
          <tr><td class="meta-label">Due / Settlement Date:</td><td class="meta-val">${dueDate}</td></tr>
          <tr><td class="meta-label">Contract Currency:</td><td class="meta-val">${currency} (United States Dollar)</td></tr>
          <tr><td class="meta-label">Payment Terms:</td><td class="meta-val">${isSupplierBill ? "15 Days Credit Wire" : "30 Days Net SWIFT Wire"}</td></tr>
        </table>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Commodity Specification & Trade Description</th>
          <th class="tar">Quantity</th>
          <th class="tar">Unit Price</th>
          <th class="tar">Total Amount (${currency})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>${isSupplierBill ? "Supplier Procurement Consignment Delivery" : "Export Consignment Fulfillment"} (${orderRef})</strong><br>
            <span style="font-size: 11px; color: #64748b;">${isSupplierBill ? "Batch Quality Inspected • Certified Moisture & Purity Standard" : "Premium Export Grade Standard • Pre-shipment Tested • CIF Incoterms 2020"}</span>
          </td>
          <td class="tar">1 Lot</td>
          <td class="tar">${formattedTotal}</td>
          <td class="tar" style="font-weight: 700;">${formattedTotal}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="bank-box">
        <div class="bank-title">${isSupplierBill ? "Supplier Bank Remittance Routing Details:" : "Inward SWIFT Wire Remittance Instructions:"}</div>
        <div class="bank-item"><strong>Beneficiary:</strong> ${isSupplierBill ? issuerName : "Polybridge Ventures LLP"}</div>
        <div class="bank-item"><strong>Bank Name:</strong> Emirates NBD / State Bank of India Commercial</div>
        <div class="bank-item"><strong>SWIFT / BIC Code:</strong> ENBDINBBXXX</div>
        <div class="bank-item"><strong>IBAN / Account Number:</strong> 9948201948201</div>
        <div class="bank-item"><strong>Purpose Code:</strong> P0102 (${isSupplierBill ? "Procurement & Supply Settlement" : "Export of Commodities & Goods"})</div>
        <div class="bank-item" style="margin-top: 4px; font-size: 11px; color: #64748b;">
          * Quoting Document Ref <strong>${data.invoiceNumber}</strong> ensures automated reconciliation in Finance.
        </div>
      </div>

      <div class="totals-box">
        <div class="total-row">
          <span>Subtotal Commercial Value:</span>
          <span>${formattedTotal}</span>
        </div>
        <div class="total-row">
          <span>Cargo & Handling:</span>
          <span>Included</span>
        </div>
        <div class="total-row">
          <span>Duties & Taxes:</span>
          <span>$0.00 ${currency}</span>
        </div>
        <div class="total-row grand">
          <span>Total Declared Value:</span>
          <span>${formattedTotal}</span>
        </div>
        <div class="total-row" style="color: #059669; font-weight: 600; margin-top: 4px;">
          <span>${isSupplierBill ? "Disbursed to Date:" : "Remitted to Date:"}</span>
          <span>${formattedPaid}</span>
        </div>
        <div class="total-row" style="color: #d97706; font-weight: 700;">
          <span>Outstanding Balance Due:</span>
          <span>${formattedBalance}</span>
        </div>
      </div>
    </div>

    <div class="footer-stamp">
      <div style="font-size: 11px; color: #64748b; line-height: 1.4; max-width: 440px;">
        ${isSupplierBill ? "Certified that the commodities invoiced above have been received or dispatched in full conformance with Purchase Order terms." : "Certified that this invoice represents the true value of the goods shipped and that all particulars are correct in accordance with ICC Incoterms 2020 international trade regulations."}
      </div>
      <div class="sign-box">
        <div style="font-weight: 700; font-size: 11px; color: #0f172a;">${isSupplierBill ? "Authorized Supplier Officer" : "For POLYBRIDGE VENTURES LLP"}</div>
        <div class="sign-line">${isSupplierBill ? "Commercial Dispatch Desk" : "Authorized Signatory / Finance Controller"}</div>
      </div>
    </div>
  </div>

</body>
</html>`;

  // 1. Trigger file download
  const filename = isSupplierBill
    ? `Supplier-Bill-${data.invoiceNumber}.html`
    : `Commercial-Invoice-${data.invoiceNumber}.html`;
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // 2. Open printable invoice in a new tab with print trigger
  try {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  } catch (err) {
    console.warn("Could not open print window preview:", err);
  }

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
