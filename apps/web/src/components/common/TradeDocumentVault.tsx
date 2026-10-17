import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Paperclip,
  X,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { API_BASE } from "../../utils/apiConfig.js";

export interface TradeDocument {
  id: string;
  entityType: string;
  entityId: string;
  entityReference?: string | null;
  documentCategory: string;
  tradePhase: string;
  fileName: string;
  fileOriginalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  fileUrl: string;
  uploadedByName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DocumentTaxonomyItem {
  code: string;
  name: string;
  phase: string;
  entityType: string;
  description: string;
  isComplianceCritical: boolean;
  acceptedFormats: string[];
}

interface TradeDocumentVaultProps {
  entityType:
    | "QUOTE"
    | "SALES_ORDER"
    | "PURCHASE_ORDER"
    | "FULFILMENT_SHIPMENT"
    | "CUSTOMER_INVOICE"
    | "SUPPLIER_BILL"
    | "GENERAL";
  entityId: string;
  entityReference?: string;
  title?: string;
  subtitle?: string;
  onDocumentCountChange?: (count: number) => void;
  compact?: boolean;
}

export const TradeDocumentVault: React.FC<TradeDocumentVaultProps> = ({
  entityType,
  entityId,
  entityReference,
  title,
  subtitle,
  onDocumentCountChange,
  compact = false,
}) => {
  const [documents, setDocuments] = useState<TradeDocument[]>([]);
  const [taxonomy, setTaxonomy] = useState<DocumentTaxonomyItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected files for batch staging
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load taxonomy categories for this entity type
  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/documents/taxonomy?entityType=${entityType}`,
        );
        if (res.ok) {
          const data = await res.json();
          setTaxonomy(data.taxonomy || []);
          if (data.taxonomy && data.taxonomy.length > 0) {
            setSelectedCategory(data.taxonomy[0].code);
          }
        }
      } catch (err) {
        console.error("[DocumentVault] Failed to load taxonomy", err);
      }
    };
    fetchTaxonomy();
  }, [entityType]);

  // Load attached documents for this entity
  const fetchDocuments = async () => {
    if (!entityId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/documents?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const docs: TradeDocument[] = data.documents || [];
        setDocuments(docs);
        if (onDocumentCountChange) {
          onDocumentCountChange(docs.length);
        }
      }
    } catch (err) {
      console.error("[DocumentVault] Failed to fetch documents", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [entityId, entityType]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setStagedFiles((prev) => [...prev, ...newFiles]);
    setErrorMsg(null);
  };

  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedFiles.length === 0) {
      setErrorMsg("Please select at least one document to upload.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);
      if (entityReference) {
        formData.append("entityReference", entityReference);
      }
      formData.append("documentCategory", selectedCategory || "OTHER");
      if (notes) {
        formData.append("notes", notes);
      }

      // Append multiple files
      for (const file of stagedFiles) {
        formData.append("files", file);
      }

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const result = await res.json();
      setSuccessMsg(
        `Successfully uploaded ${result.count || stagedFiles.length} trade document(s)!`,
      );
      setStagedFiles([]);
      setNotes("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh documents list
      await fetchDocuments();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${docName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (err) {
      console.error("[DocumentVault] Delete failed", err);
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
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "var(--radius-lg)",
        padding: compact ? "1rem" : "1.5rem",
        marginTop: "1rem",
      }}
    >
      {/* Vault Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            style={{
              padding: "0.45rem",
              borderRadius: "8px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--primary-light)",
              display: "flex",
            }}
          >
            <Paperclip size={18} />
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {title || `Trade Documents & Compliance Vault`}
            </h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {subtitle ||
                `Associated with ${entityType.replace(/_/g, " ")} ${entityReference ? `(#${entityReference})` : ""}`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              padding: "0.2rem 0.6rem",
              borderRadius: "12px",
              background:
                documents.length > 0
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(255, 255, 255, 0.06)",
              color: documents.length > 0 ? "#34d399" : "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {documents.length}{" "}
            {documents.length === 1 ? "Document" : "Documents"} Attached
          </span>
          <button
            type="button"
            onClick={fetchDocuments}
            title="Refresh documents"
            className="btn btn-outline"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          >
            <RefreshCw size={12} className={isLoading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <form onSubmit={handleUploadSubmit} style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "1.5fr 1fr",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          {/* Document Category Selector */}
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem" }}>
              Select Document Category / Type *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-control"
              style={{ fontSize: "0.85rem", height: "38px", cursor: "pointer" }}
            >
              {taxonomy.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.isComplianceCritical ? "★ " : ""}
                  {item.name} ({item.phase})
                </option>
              ))}
              <option value="OTHER">Other Commercial Document</option>
            </select>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem" }}>
              Document Notes / Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Signed by Buyer VP, Container #MSKU123..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-control"
              style={{ fontSize: "0.85rem", height: "38px" }}
            />
          </div>
        </div>

        {/* Drag & Drop File Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "var(--primary)" : "rgba(99, 102, 241, 0.35)"}`,
            background: isDragging
              ? "rgba(99, 102, 241, 0.12)"
              : "rgba(15, 23, 42, 0.4)",
            borderRadius: "var(--radius-md)",
            padding: compact ? "0.85rem" : "1.25rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <Upload
            size={24}
            style={{ color: "var(--primary-light)", marginBottom: "0.35rem" }}
          />
          <div
            style={{
              fontSize: "0.86rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Drag & Drop documents here, or{" "}
            <span
              style={{
                color: "var(--primary-light)",
                textDecoration: "underline",
              }}
            >
              Browse Files
            </span>
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              marginTop: "0.2rem",
            }}
          >
            Supports PDF, Word (.docx), Excel (.xlsx/.csv), and High-Res Images
            up to 50MB. Multiple files allowed.
          </div>
        </div>

        {/* Staged Files Preview */}
        {stagedFiles.length > 0 && (
          <div
            style={{
              marginTop: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Staged for Upload ({stagedFiles.length} files):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {stagedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.6rem",
                    background: "rgba(99, 102, 241, 0.1)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                    borderRadius: "6px",
                    fontSize: "0.76rem",
                  }}
                >
                  <FileText size={13} color="var(--primary-light)" />
                  <span
                    style={{
                      fontWeight: 600,
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </span>
                  <span
                    style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                  >
                    ({formatFileSize(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveStagedFile(idx);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "0.4rem",
              }}
            >
              <button
                type="submit"
                disabled={isUploading}
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.82rem",
                  padding: "0.4rem 0.85rem",
                }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    <span>
                      Upload {stagedFiles.length} Document
                      {stagedFiles.length > 1 ? "s" : ""} to Local Vault
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "var(--danger)",
              fontSize: "0.78rem",
              marginTop: "0.5rem",
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "#34d399",
              fontSize: "0.78rem",
              marginTop: "0.5rem",
            }}
          >
            <CheckCircle2 size={14} />
            <span>{successMsg}</span>
          </div>
        )}
      </form>

      {/* Uploaded Documents List */}
      <div>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Attached Documents ({documents.length})
        </div>

        {documents.length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              background: "rgba(0, 0, 0, 0.15)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed rgba(255, 255, 255, 0.06)",
            }}
          >
            <FolderOpen
              size={28}
              style={{ color: "var(--text-muted)", marginBottom: "0.4rem" }}
            />
            <div style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
              No trade documents attached yet.
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginTop: "0.2rem",
              }}
            >
              Upload customer purchase orders, signed supplier agreements, B/Ls,
              or inspection reports above.
            </div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {documents.map((doc) => {
              const badgeStyle = getCategoryBadgeColor(doc.documentCategory);
              const categoryObj = taxonomy.find(
                (t) => t.code === doc.documentCategory,
              );
              const displayName = categoryObj
                ? categoryObj.name
                : doc.documentCategory.replace(/_/g, " ");

              return (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.65rem 0.85rem",
                    background: "rgba(15, 23, 42, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "var(--radius-md)",
                    gap: "0.75rem",
                  }}
                >
                  {/* Left: Icon & Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.4rem",
                        borderRadius: "6px",
                        background: badgeStyle.bg,
                        color: badgeStyle.text,
                        display: "flex",
                      }}
                    >
                      <FileCheck size={16} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.84rem",
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.fileOriginalName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "0.12rem 0.45rem",
                            borderRadius: "4px",
                            background: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                            fontWeight: 600,
                          }}
                        >
                          {displayName}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "0.15rem",
                        }}
                      >
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span style={{ margin: "0 0.35rem" }}>•</span>
                        <span>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                        {doc.notes && (
                          <>
                            <span style={{ margin: "0 0.35rem" }}>•</span>
                            <span
                              style={{
                                fontStyle: "italic",
                                color: "var(--text-secondary)",
                              }}
                            >
                              "{doc.notes}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      flexShrink: 0,
                    }}
                  >
                    {/* Inline Preview (for PDFs & Images) */}
                    <a
                      href={`${API_BASE}/documents/${doc.id}/download?preview=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      title="Preview Document in browser"
                      style={{
                        padding: "0.3rem 0.5rem",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Eye size={13} />
                      <span style={{ display: compact ? "none" : "inline" }}>
                        Preview
                      </span>
                    </a>

                    {/* Download */}
                    <a
                      href={`${API_BASE}/documents/${doc.id}/download`}
                      download={doc.fileOriginalName}
                      className="btn btn-outline"
                      title="Download file to computer"
                      style={{
                        padding: "0.3rem 0.5rem",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Download size={13} />
                      <span style={{ display: compact ? "none" : "inline" }}>
                        Download
                      </span>
                    </a>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.fileOriginalName)}
                      className="btn btn-outline"
                      title="Delete document"
                      style={{
                        padding: "0.3rem 0.45rem",
                        color: "var(--danger)",
                        fontSize: "0.75rem",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
