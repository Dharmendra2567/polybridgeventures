import React, { useState, useEffect, useMemo } from "react";
import {
  FileCheck,
  Upload,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  FolderOpen,
  FileText,
  ShoppingBag,
  ShoppingCart,
  Truck,
  AlertCircle,
} from "lucide-react";
import { TableToolbar } from "../common/TableToolbar.js";
import {
  TradeDocument,
  DocumentTaxonomyItem,
} from "../common/TradeDocumentVault.js";
import { API_BASE } from "../../utils/apiConfig.js";

export const TradeDocumentsModule: React.FC = () => {
  const [documents, setDocuments] = useState<TradeDocument[]>([]);
  const [taxonomy, setTaxonomy] = useState<DocumentTaxonomyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [phaseFilter, setPhaseFilter] = useState<string>("ALL");

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadEntityType, setUploadEntityType] = useState<
    | "SALES_ORDER"
    | "PURCHASE_ORDER"
    | "QUOTE"
    | "FULFILMENT_SHIPMENT"
    | "GENERAL"
  >("SALES_ORDER");
  const [uploadEntityRef, setUploadEntityRef] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState<string>("CUSTOMER_PO");
  const [uploadNotes, setUploadNotes] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch all documents across system
  const fetchAllDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("[TradeDocs] Failed to load documents", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch taxonomy
  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const res = await fetch(`${API_BASE}/documents/taxonomy`);
        if (res.ok) {
          const data = await res.json();
          setTaxonomy(data.taxonomy || []);
        }
      } catch (err) {
        console.error("[TradeDocs] Failed to load taxonomy", err);
      }
    };
    fetchTaxonomy();
    fetchAllDocuments();
  }, []);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesPhase =
        phaseFilter === "ALL" || doc.tradePhase === phaseFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.fileOriginalName.toLowerCase().includes(q) ||
        doc.documentCategory.toLowerCase().includes(q) ||
        (doc.entityReference &&
          doc.entityReference.toLowerCase().includes(q)) ||
        (doc.notes && doc.notes.toLowerCase().includes(q));
      return matchesPhase && matchesSearch;
    });
  }, [documents, phaseFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: documents.length,
      preSales: documents.filter((d) => d.tradePhase === "PRE_SALES").length,
      salesOrders: documents.filter((d) => d.tradePhase === "SALES_ORDER")
        .length,
      procurement: documents.filter((d) => d.tradePhase === "PROCUREMENT")
        .length,
      fulfilment: documents.filter((d) => d.tradePhase === "FULFILMENT").length,
    };
  }, [documents]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStagedFiles((prev) => [...prev, ...Array.from(files)]);
    setUploadError(null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedFiles.length === 0) {
      setUploadError("Please select at least one document to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("entityType", uploadEntityType);
      formData.append("entityId", `ID-${Date.now()}`);
      formData.append(
        "entityReference",
        uploadEntityRef || `${uploadEntityType}-REF`,
      );
      formData.append("documentCategory", uploadCategory);
      if (uploadNotes) {
        formData.append("notes", uploadNotes);
      }

      for (const file of stagedFiles) {
        formData.append("files", file);
      }

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      setStagedFiles([]);
      setUploadNotes("");
      setUploadEntityRef("");
      setShowUploadModal(false);
      await fetchAllDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Error occurred while uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete document "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAllDocuments();
      }
    } catch (err) {
      console.error("[TradeDocs] Delete failed", err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getCategoryBadgeColor = (
    catCode: string,
  ): { bg: string; text: string; border: string } => {
    if (catCode.includes("PO") || catCode.includes("ORDER")) {
      return {
        bg: "rgba(16, 185, 129, 0.15)",
        text: "#34d399",
        border: "rgba(16, 185, 129, 0.35)",
      };
    }
    if (
      catCode.includes("BILL_OF_LADING") ||
      catCode.includes("PACKING") ||
      catCode.includes("DELIVERY")
    ) {
      return {
        bg: "rgba(59, 130, 246, 0.15)",
        text: "#60a5fa",
        border: "rgba(59, 130, 246, 0.35)",
      };
    }
    if (
      catCode.includes("LETTER_OF_CREDIT") ||
      catCode.includes("SWIFT") ||
      catCode.includes("INVOICE")
    ) {
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        text: "#fbbf24",
        border: "rgba(245, 158, 11, 0.35)",
      };
    }
    if (
      catCode.includes("INSPECTION") ||
      catCode.includes("CERTIFICATE") ||
      catCode.includes("SPEC")
    ) {
      return {
        bg: "rgba(168, 85, 247, 0.15)",
        text: "#c084fc",
        border: "rgba(168, 85, 247, 0.35)",
      };
    }
    return {
      bg: "rgba(99, 102, 241, 0.15)",
      text: "#818cf8",
      border: "rgba(99, 102, 241, 0.35)",
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header & Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            Trade Documents & Compliance Repository
          </h2>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            Authoritative vault for Customer POs, Sales Contracts, Bills of
            Lading, SGS Inspections, and Wire Remittances.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={fetchAllDocuments}
            className="btn btn-outline"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.82rem",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.82rem",
            }}
          >
            <Upload size={14} />
            <span>Upload Trade Document</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          className="card"
          style={{
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              padding: "0.65rem",
              borderRadius: "10px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--primary-light)",
            }}
          >
            <FileCheck size={22} />
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Total Trade Vault
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                marginTop: "2px",
              }}
            >
              {stats.total}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              padding: "0.65rem",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
            }}
          >
            <ShoppingBag size={22} />
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Sales Orders & Contracts
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#34d399",
                marginTop: "2px",
              }}
            >
              {stats.salesOrders}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              padding: "0.65rem",
              borderRadius: "10px",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#fbbf24",
            }}
          >
            <ShoppingCart size={22} />
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Procurement & POs
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#fbbf24",
                marginTop: "2px",
              }}
            >
              {stats.procurement}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              padding: "0.65rem",
              borderRadius: "10px",
              background: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
            }}
          >
            <Truck size={22} />
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Shipping, B/Ls & POD
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#60a5fa",
                marginTop: "2px",
              }}
            >
              {stats.fulfilment}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        {/* Phase Filter Tabs */}
        <div
          style={{
            padding: "1rem 1.25rem 0.5rem",
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          {[
            { id: "ALL", label: "All Documents", count: documents.length },
            {
              id: "PRE_SALES",
              label: "1. Pre-Sales / RFQs",
              count: stats.preSales,
            },
            {
              id: "SALES_ORDER",
              label: "2. Customer POs & Contracts",
              count: stats.salesOrders,
            },
            {
              id: "PROCUREMENT",
              label: "3. Procurement POs",
              count: stats.procurement,
            },
            {
              id: "FULFILMENT",
              label: "4. Shipping & B/Ls / POD",
              count: stats.fulfilment,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPhaseFilter(tab.id)}
              className={`segmented-btn ${phaseFilter === tab.id ? "active" : ""}`}
              style={{
                fontSize: "0.82rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
              }}
            >
              <span>{tab.label}</span>
              <span className="segmented-btn-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search Toolbar */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by document name, category, or order ref (e.g. PO-2026, SO-2026, B/L)..."
        />

        {/* Documents Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Name & File</th>
                <th>Category / Type</th>
                <th>Trading Phase</th>
                <th>Associated Order Ref</th>
                <th>Size</th>
                <th>Uploaded Date</th>
                <th>Notes</th>
                <th style={{ textAlign: "right", paddingRight: "1.5rem" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-loading-state">
                      <div className="table-spinner" />
                      <div className="table-loading-text">
                        Loading trade documents from local repository...
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty-state">
                      <div className="table-empty-state-icon">
                        <FolderOpen size={24} />
                      </div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        No trade documents match filter
                      </h4>
                      <p
                        style={{
                          margin: "0.35rem 0 0",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Upload customer purchase orders, shipping bills of
                        lading, or SGS inspection certificates.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const badgeStyle = getCategoryBadgeColor(
                    doc.documentCategory,
                  );
                  const catObj = taxonomy.find(
                    (t) => t.code === doc.documentCategory,
                  );
                  const catName = catObj
                    ? catObj.name
                    : doc.documentCategory.replace(/_/g, " ");

                  return (
                    <tr key={doc.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <FileText size={15} color="var(--primary-light)" />
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {doc.fileOriginalName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            background: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                            fontWeight: 600,
                          }}
                        >
                          {catName}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge badge-subtle"
                          style={{ fontSize: "0.72rem" }}
                        >
                          {doc.tradePhase.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        className="cell-code"
                        style={{
                          color: "var(--primary-light)",
                          fontWeight: 600,
                        }}
                      >
                        {doc.entityReference || "—"}
                      </td>
                      <td
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.notes || "—"}
                      </td>
                      <td
                        style={{ textAlign: "right", paddingRight: "1.5rem" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.35rem",
                          }}
                        >
                          {/* Preview in browser */}
                          <a
                            href={`${API_BASE}/documents/${doc.id}/download?preview=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-xs btn-outline"
                            title="Preview document in browser"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </a>

                          {/* Direct Download */}
                          <a
                            href={`${API_BASE}/documents/${doc.id}/download`}
                            download={doc.fileOriginalName}
                            className="btn btn-xs btn-outline"
                            title="Download document file"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </a>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(doc.id, doc.fileOriginalName)
                            }
                            className="btn btn-xs btn-outline"
                            title="Delete document"
                            style={{
                              color: "var(--danger)",
                              borderColor: "rgba(239, 68, 68, 0.25)",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>Showing {filteredDocuments.length} trade documents</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            All documents stored securely in local project directory (cloud
            storage ready).
          </span>
        </div>
      </div>

      {/* Upload Trade Document Modal */}
      {showUploadModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "580px", width: "100%" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Upload Trade Document to Repository
                </h3>
                <span
                  style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
                >
                  Select transaction phase, document category, and attach
                  multiple supporting files.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="btn btn-outline"
                style={{ padding: "0.25rem 0.55rem", borderRadius: "50%" }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUploadSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label className="form-label">
                    Transaction Module / Entity *
                  </label>
                  <select
                    value={uploadEntityType}
                    onChange={(e) => setUploadEntityType(e.target.value as any)}
                    className="form-control"
                    style={{ height: "40px", fontSize: "0.85rem" }}
                  >
                    <option value="SALES_ORDER">
                      Sales Order (Customer Contract)
                    </option>
                    <option value="PURCHASE_ORDER">
                      Purchase Order (Procurement)
                    </option>
                    <option value="FULFILMENT_SHIPMENT">
                      Fulfilment & Shipping
                    </option>
                    <option value="QUOTE">Pre-Sales Quotation</option>
                    <option value="GENERAL">General Trade Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Associated Order Ref # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SO-2026-001, PO-2026-004..."
                    value={uploadEntityRef}
                    onChange={(e) => setUploadEntityRef(e.target.value)}
                    className="form-control"
                    style={{ height: "40px", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Trade Document Category / Standard *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="form-control"
                  style={{ height: "40px", fontSize: "0.85rem" }}
                >
                  {taxonomy.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.isComplianceCritical ? "★ " : ""}
                      {item.name} ({item.phase})
                    </option>
                  ))}
                  <option value="OTHER">Other Trade Document</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Notes / Commercial Context (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Countersigned by supplier VP, original stamped B/L..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="form-control"
                  style={{
                    width: "100%",
                    resize: "vertical",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              {/* Multi-File Dropzone */}
              <div>
                <label className="form-label">
                  Select Files (Multiple Allowed) *
                </label>
                <input
                  type="file"
                  multiple
                  required={stagedFiles.length === 0}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="form-control"
                  style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                />
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: "0.3rem",
                  }}
                >
                  Allowed: PDF, Word (.docx), Excel (.xlsx/.csv), JPG, PNG up to
                  50MB per file.
                </span>
              </div>

              {stagedFiles.length > 0 && (
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Selected: {stagedFiles.map((f) => f.name).join(", ")}
                </div>
              )}

              {uploadError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: "var(--danger)",
                    fontSize: "0.8rem",
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Uploading to Vault...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Save to Document Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
