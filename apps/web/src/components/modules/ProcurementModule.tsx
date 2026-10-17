import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart,
  Plus,
  MapPin,
  Send,
  Building,
  Calendar,
  FileCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Download,
  CheckCircle,
  Paperclip,
} from "lucide-react";
import { TableToolbar } from "../common/TableToolbar.js";
import { DetailDrawer } from "../common/DetailDrawer.js";
import { exportToCsv } from "../../utils/csvExport.js";
import { downloadCommercialInvoice } from "../../utils/invoiceDownload.js";
import { TradeDocumentVault } from "../common/TradeDocumentVault.js";
import { API_BASE } from "../../utils/apiConfig.js";

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  location: string;
  state: string;
  commodities: string;
  paymentTerms: string;
  rating: number;
}

interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  supplierName: string;
  salesOrderRef: string;
  totalCost: number;
  currency: string;
  exchangeRateToUsd?: number;
  totalCostUsd?: number;
  status:
    | "DRAFT"
    | "APPROVED"
    | "ISSUED"
    | "ACKNOWLEDGED"
    | "COMPLETED"
    | "CANCELLED";
  expectedDispatch: string;
  createdAt: string;
  billId?: string;
  billNumber?: string;
  billStatus?: string;
}

interface MarketCurrency {
  id: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  exchangeRateToUsd: number;
}

interface SalesOrderOption {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
}

type PoSortField =
  | "poNumber"
  | "supplierName"
  | "salesOrderRef"
  | "totalCost"
  | "expectedDispatch"
  | "status";
type SupplierSortField =
  "code" | "name" | "location" | "commodities" | "rating";
type SortDirection = "asc" | "desc";

export const ProcurementModule: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [pos, setPos] = useState<PurchaseOrderItem[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderOption[]>([]);
  const [activeTab, setActiveTab] = useState<"pos" | "suppliers">("pos");

  // FX Markets & Currency Selection State
  const [markets, setMarkets] = useState<MarketCurrency[]>([]);
  const [poCurrency, setPoCurrency] = useState("INR");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Sorting
  const [poSortField, setPoSortField] = useState<PoSortField>("poNumber");
  const [poSortDir, setPoSortDir] = useState<SortDirection>("desc");
  const [supplierSortField, setSupplierSortField] =
    useState<SupplierSortField>("name");
  const [supplierSortDir, setSupplierSortDir] = useState<SortDirection>("asc");

  // Detail Drawer
  const [drawerPo, setDrawerPo] = useState<PurchaseOrderItem | null>(null);
  const [drawerSupplier, setDrawerSupplier] = useState<SupplierItem | null>(
    null,
  );

  // Add Modals
  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // Edit Modals State
  const [editingPo, setEditingPo] = useState<PurchaseOrderItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(
    null,
  );

  // New PO form state
  const [supplierName, setSupplierName] = useState(
    "Gujarat Agro & Spice Processors Ltd",
  );
  const [salesOrderRef, setSalesOrderRef] = useState("SO-2026-001");
  const [cost, setCost] = useState("46200");
  const [dispatchDate, setDispatchDate] = useState("2026-10-22");
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);

  // Edit PO form state
  const [editPoSupplier, setEditPoSupplier] = useState("");
  const [editPoOrderRef, setEditPoOrderRef] = useState("");
  const [editPoCost, setEditPoCost] = useState("");
  const [editPoDispatch, setEditPoDispatch] = useState("");
  const [editPoStatus, setEditPoStatus] =
    useState<PurchaseOrderItem["status"]>("DRAFT");
  const [isUpdatingPo, setIsUpdatingPo] = useState(false);

  // New Supplier form state
  const [newSupName, setNewSupName] = useState("");
  const [newSupLocation, setNewSupLocation] = useState("");
  const [newSupState, setNewSupState] = useState("Gujarat");
  const [newSupCommodities, setNewSupCommodities] = useState("");
  const [newSupPaymentTerms, setNewSupPaymentTerms] =
    useState("15 Days Credit");
  const [newSupRating, setNewSupRating] = useState("4.8");
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);

  // Edit Supplier form state
  const [editSupName, setEditSupName] = useState("");
  const [editSupLocation, setEditSupLocation] = useState("");
  const [editSupState, setEditSupState] = useState("Gujarat");
  const [editSupCommodities, setEditSupCommodities] = useState("");
  const [editSupPaymentTerms, setEditSupPaymentTerms] =
    useState("15 Days Credit");
  const [editSupRating, setEditSupRating] = useState("4.8");
  const [isUpdatingSupplier, setIsUpdatingSupplier] = useState(false);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchProcurementData = async () => {
    try {
      setIsLoading(true);
      const [resSuppliers, resPos, resOrders, resMarkets] = await Promise.all([
        fetch(`${API_BASE}/procurement/suppliers`),
        fetch(`${API_BASE}/procurement/purchase-orders`),
        fetch(`${API_BASE}/sales/orders`),
        fetch(`${API_BASE}/fx/markets`),
      ]);

      if (resSuppliers.ok && resPos.ok) {
        const sData = await resSuppliers.json();
        const pData = await resPos.json();
        const supList: SupplierItem[] = sData.suppliers || [];
        setSuppliers(supList);
        setPos(pData.purchaseOrders || []);
        const firstSup = supList[0];
        if (firstSup && !supplierName) {
          setSupplierName(firstSup.name);
        }
      }

      if (resMarkets && resMarkets.ok) {
        const mData = await resMarkets.json();
        if (Array.isArray(mData.markets)) {
          setMarkets(mData.markets);
        }
      }

      if (resOrders && resOrders.ok) {
        const oData = await resOrders.json();
        const orderList: SalesOrderOption[] = oData.orders || [];
        setSalesOrders(orderList);
        const firstOrder = orderList[0];
        if (firstOrder && !salesOrderRef) {
          setSalesOrderRef(firstOrder.orderNumber);
        }
      }
    } catch (err) {
      console.warn("API error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, []);

  // Update Status directly
  const handleUpdatePoStatus = async (poId: string, newStatus: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/procurement/purchase-orders/${poId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (res.ok) {
        setPos((prev) =>
          prev.map((p) =>
            p.id === poId
              ? { ...p, status: newStatus as PurchaseOrderItem["status"] }
              : p,
          ),
        );
        if (drawerPo && drawerPo.id === poId) {
          setDrawerPo((prev) =>
            prev
              ? { ...prev, status: newStatus as PurchaseOrderItem["status"] }
              : null,
          );
        }
      }
    } catch (err) {
      console.error("Error updating PO status:", err);
    }
  };

  const handleDownloadBill = (p: PurchaseOrderItem) => {
    if (!p.billNumber) return;
    downloadCommercialInvoice({
      invoiceNumber: p.billNumber,
      orderNumber: p.poNumber,
      supplierName: p.supplierName,
      totalAmount: p.totalCost,
      currency: p.currency,
      type: "SUPPLIER_BILL",
      status: p.billStatus || "PENDING",
    });
  };

  const handleGenerateBill = async (p: PurchaseOrderItem) => {
    setIsGeneratingBill(true);
    try {
      const res = await fetch(
        `${API_BASE}/procurement/purchase-orders/${p.id}/generate-bill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await res.json();
      if (res.ok && data.bill) {
        await fetchProcurementData();
        if (drawerPo && drawerPo.id === p.id) {
          setDrawerPo((prev) =>
            prev
              ? {
                  ...prev,
                  billId: data.bill.id,
                  billNumber: data.bill.billNumber,
                  billStatus: data.bill.status,
                }
              : null,
          );
        }
        // Immediately trigger download of the supplier bill
        downloadCommercialInvoice({
          invoiceNumber: data.bill.billNumber,
          orderNumber: p.poNumber,
          supplierName: p.supplierName,
          totalAmount: p.totalCost,
          currency: p.currency,
          type: "SUPPLIER_BILL",
          status: data.bill.status || "PENDING",
        });
      } else {
        alert(data.error || "Failed to generate supplier bill");
      }
    } catch (err) {
      console.error("Error generating bill:", err);
      alert("Network error while generating supplier bill");
    } finally {
      setIsGeneratingBill(false);
    }
  };

  // Issue PO workflow
  const handleIssuePo = async (poId: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/procurement/purchase-orders/${poId}/issue`,
        {
          method: "PATCH",
        },
      );
      if (res.ok) {
        await fetchProcurementData();
        if (drawerPo && drawerPo.id === poId) {
          setDrawerPo((prev) => (prev ? { ...prev, status: "ISSUED" } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete PO
  const handleDeletePo = async (poId: string, poNumber: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Purchase Order ${poNumber}?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/procurement/purchase-orders/${poId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        setPos((prev) => prev.filter((p) => p.id !== poId));
        if (drawerPo && drawerPo.id === poId) setDrawerPo(null);
      }
    } catch (err) {
      console.error("Error deleting PO:", err);
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (supId: string, supName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Sourcing Partner "${supName}"?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/procurement/suppliers/${supId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuppliers((prev) => prev.filter((s) => s.id !== supId));
        if (drawerSupplier && drawerSupplier.id === supId)
          setDrawerSupplier(null);
      }
    } catch (err) {
      console.error("Error deleting supplier:", err);
    }
  };

  // Open Edit PO
  const openEditPo = (p: PurchaseOrderItem) => {
    setEditingPo(p);
    setEditPoSupplier(p.supplierName);
    setEditPoOrderRef(p.salesOrderRef);
    setEditPoCost(p.totalCost.toString());
    setEditPoDispatch(p.expectedDispatch);
    setEditPoStatus(p.status);
  };

  // Submit Edit PO
  const handleUpdatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPo) return;
    setIsUpdatingPo(true);
    try {
      const res = await fetch(
        `${API_BASE}/procurement/purchase-orders/${editingPo.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierName: editPoSupplier,
            salesOrderRef: editPoOrderRef,
            totalCost: parseFloat(editPoCost) || editingPo.totalCost,
            expectedDispatch: editPoDispatch,
            status: editPoStatus,
          }),
        },
      );
      if (res.ok) {
        setEditingPo(null);
        await fetchProcurementData();
        if (drawerPo && drawerPo.id === editingPo.id) {
          setDrawerPo((prev) =>
            prev
              ? {
                  ...prev,
                  supplierName: editPoSupplier,
                  salesOrderRef: editPoOrderRef,
                  totalCost: parseFloat(editPoCost) || prev.totalCost,
                  expectedDispatch: editPoDispatch,
                  status: editPoStatus,
                }
              : null,
          );
        }
      }
    } catch (err) {
      console.error("Error updating PO:", err);
    } finally {
      setIsUpdatingPo(false);
    }
  };

  // Open Edit Supplier
  const openEditSupplier = (s: SupplierItem) => {
    setEditingSupplier(s);
    setEditSupName(s.name);
    setEditSupLocation(s.location);
    setEditSupState(s.state);
    setEditSupCommodities(s.commodities);
    setEditSupPaymentTerms(s.paymentTerms);
    setEditSupRating(s.rating.toString());
  };

  // Submit Edit Supplier
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setIsUpdatingSupplier(true);
    try {
      const res = await fetch(
        `${API_BASE}/procurement/suppliers/${editingSupplier.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editSupName.trim(),
            location: editSupLocation.trim(),
            state: editSupState,
            commodities: editSupCommodities.trim(),
            paymentTerms: editSupPaymentTerms,
            rating: parseFloat(editSupRating) || editingSupplier.rating,
          }),
        },
      );
      if (res.ok) {
        setEditingSupplier(null);
        await fetchProcurementData();
        if (drawerSupplier && drawerSupplier.id === editingSupplier.id) {
          setDrawerSupplier((prev) =>
            prev
              ? {
                  ...prev,
                  name: editSupName.trim(),
                  location: editSupLocation.trim(),
                  state: editSupState,
                  commodities: editSupCommodities.trim(),
                  paymentTerms: editSupPaymentTerms,
                  rating: parseFloat(editSupRating) || prev.rating,
                }
              : null,
          );
        }
      }
    } catch (err) {
      console.error("Error updating supplier:", err);
    } finally {
      setIsUpdatingSupplier(false);
    }
  };

  // Create PO
  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPo(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName:
            supplierName ||
            (suppliers[0]?.name ?? "Gujarat Agro & Spice Processors Ltd"),
          salesOrderRef:
            salesOrderRef || (salesOrders[0]?.orderNumber ?? "SO-2026-001"),
          totalCost: parseFloat(cost) || 10000,
          currency: poCurrency,
          expectedDispatch: dispatchDate,
        }),
      });
      if (res.ok) {
        setShowAddPoModal(false);
        fetchProcurementData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPo(false);
    }
  };

  // Create Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    setIsSubmittingSupplier(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupName.trim(),
          location: newSupLocation.trim() || "Processing Hub",
          state: newSupState,
          commodities: newSupCommodities.trim() || "Agro Commodities & Spices",
          paymentTerms: newSupPaymentTerms,
          rating: parseFloat(newSupRating) || 4.8,
        }),
      });
      if (res.ok) {
        setShowAddSupplierModal(false);
        setNewSupName("");
        setNewSupLocation("");
        setNewSupCommodities("");
        await fetchProcurementData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  // Sort handlers
  const handleSortPo = (field: PoSortField) => {
    if (poSortField === field) {
      setPoSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setPoSortField(field);
      setPoSortDir("asc");
    }
  };

  const handleSortSupplier = (field: SupplierSortField) => {
    if (supplierSortField === field) {
      setSupplierSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSupplierSortField(field);
      setSupplierSortDir("asc");
    }
  };

  // Filtered & Sorted POs
  const filteredPos = useMemo(() => {
    return pos
      .filter((p) => {
        const matchesStatus =
          statusFilter === "ALL" || p.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.poNumber.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          p.salesOrderRef.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[poSortField];
        const valB = b[poSortField];
        if (valA < valB) return poSortDir === "asc" ? -1 : 1;
        if (valA > valB) return poSortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [pos, statusFilter, searchQuery, poSortField, poSortDir]);

  // Filtered & Sorted Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          !q ||
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q) ||
          s.commodities.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const valA = a[supplierSortField];
        const valB = b[supplierSortField];
        if (valA < valB) return supplierSortDir === "asc" ? -1 : 1;
        if (valA > valB) return supplierSortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [suppliers, searchQuery, supplierSortField, supplierSortDir]);

  // Export CSV
  const handleExportPosCsv = () => {
    exportToCsv(
      "polybridge-purchase-orders",
      filteredPos as unknown as Record<string, unknown>[],
      [
        { key: "poNumber", header: "PO #" },
        { key: "supplierName", header: "Supplier Processor" },
        { key: "salesOrderRef", header: "Linked Sales Order" },
        { key: "totalCost", header: "Total Cost ($)" },
        { key: "expectedDispatch", header: "Expected Dispatch" },
        { key: "status", header: "Status" },
        { key: "createdAt", header: "Created Date" },
      ],
    );
  };

  const handleExportSuppliersCsv = () => {
    exportToCsv(
      "polybridge-suppliers",
      filteredSuppliers as unknown as Record<string, unknown>[],
      [
        { key: "code", header: "Supplier Code" },
        { key: "name", header: "Supplier Name" },
        { key: "location", header: "Location" },
        { key: "state", header: "State" },
        { key: "commodities", header: "Commodities" },
        { key: "paymentTerms", header: "Payment Terms" },
        { key: "rating", header: "Rating" },
      ],
    );
  };

  // Filter Options
  const poFilterOptions = [
    { id: "ALL", label: "All POs", count: pos.length },
    {
      id: "DRAFT",
      label: "Draft",
      count: pos.filter((p) => p.status === "DRAFT").length,
    },
    {
      id: "APPROVED",
      label: "Approved",
      count: pos.filter((p) => p.status === "APPROVED").length,
    },
    {
      id: "ISSUED",
      label: "Issued to Supplier",
      count: pos.filter((p) => p.status === "ISSUED").length,
    },
    {
      id: "ACKNOWLEDGED",
      label: "Acknowledged",
      count: pos.filter((p) => p.status === "ACKNOWLEDGED").length,
    },
    {
      id: "COMPLETED",
      label: "Completed",
      count: pos.filter((p) => p.status === "COMPLETED").length,
    },
  ];

  const renderSortIndicator = (
    currentField: string,
    targetField: string,
    dir: SortDirection,
  ) => {
    if (currentField !== targetField) {
      return <ArrowUpDown size={12} className="sort-icon-indicator" />;
    }
    return dir === "asc" ? (
      <ArrowUp
        size={12}
        className="sort-icon-indicator"
        color="var(--primary-light)"
      />
    ) : (
      <ArrowDown
        size={12}
        className="sort-icon-indicator"
        color="var(--primary-light)"
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Module Controls Bar (Tabs & Action) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div className="segmented-control">
          <button
            onClick={() => {
              setActiveTab("pos");
              setStatusFilter("ALL");
              setSearchQuery("");
            }}
            className={`segmented-btn ${activeTab === "pos" ? "active" : ""}`}
          >
            <span>Purchase Orders</span>
            <span className="segmented-btn-count">{pos.length}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("suppliers");
              setStatusFilter("ALL");
              setSearchQuery("");
            }}
            className={`segmented-btn ${activeTab === "suppliers" ? "active" : ""}`}
          >
            <span>Sourcing Partners</span>
            <span className="segmented-btn-count">{suppliers.length}</span>
          </button>
        </div>

        {activeTab === "pos" ? (
          <button
            onClick={() => {
              const firstSup = suppliers[0];
              if (firstSup && !supplierName) {
                setSupplierName(firstSup.name);
              }
              const firstOrder = salesOrders[0];
              if (firstOrder && !salesOrderRef) {
                setSalesOrderRef(firstOrder.orderNumber);
              }
              setShowAddPoModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Issue Purchase Order</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Add Sourcing Partner</span>
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        {/* Toolbar (density relaxed by default, no compact toggle) */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeTab === "pos"
              ? "Search by PO #, supplier name, sales order..."
              : "Search by code, supplier, state, commodity..."
          }
          filterOptions={activeTab === "pos" ? poFilterOptions : undefined}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onExportCsv={
            activeTab === "pos" ? handleExportPosCsv : handleExportSuppliersCsv
          }
        />

        {/* POs Table */}
        {activeTab === "pos" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`th-sortable ${poSortField === "poNumber" ? "sorted" : ""}`}
                    onClick={() => handleSortPo("poNumber")}
                  >
                    PO #{" "}
                    {renderSortIndicator(poSortField, "poNumber", poSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${poSortField === "supplierName" ? "sorted" : ""}`}
                    onClick={() => handleSortPo("supplierName")}
                  >
                    Supplier Processor{" "}
                    {renderSortIndicator(
                      poSortField,
                      "supplierName",
                      poSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${poSortField === "salesOrderRef" ? "sorted" : ""}`}
                    onClick={() => handleSortPo("salesOrderRef")}
                  >
                    Linked Sales Order{" "}
                    {renderSortIndicator(
                      poSortField,
                      "salesOrderRef",
                      poSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${poSortField === "totalCost" ? "sorted" : ""}`}
                    onClick={() => handleSortPo("totalCost")}
                  >
                    Total Cost{" "}
                    {renderSortIndicator(poSortField, "totalCost", poSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${poSortField === "expectedDispatch" ? "sorted" : ""}`}
                    onClick={() => handleSortPo("expectedDispatch")}
                  >
                    Expected Dispatch{" "}
                    {renderSortIndicator(
                      poSortField,
                      "expectedDispatch",
                      poSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${poSortField === "status" ? "sorted" : ""}`}
                    onClick={() => handleSortPo("status")}
                  >
                    Status{" "}
                    {renderSortIndicator(poSortField, "status", poSortDir)}
                  </th>
                  <th>Created Date</th>
                  <th>Trade Docs</th>
                  <th style={{ textAlign: "right", paddingRight: "1.5rem" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="table-loading-state">
                        <div className="table-spinner" />
                        <div className="table-loading-text">
                          Loading purchase orders from database...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredPos.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty-state">
                        <div className="table-empty-state-icon">
                          <ShoppingCart size={24} />
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          No purchase orders match criteria
                        </h4>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPos.map((p) => (
                    <tr
                      key={p.id}
                      className="clickable-row"
                      onClick={() => setDrawerPo(p)}
                    >
                      <td className="cell-code">{p.poNumber}</td>
                      <td>
                        <div className="cell-primary">{p.supplierName}</div>
                      </td>
                      <td
                        className="cell-code"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {p.salesOrderRef}
                      </td>
                      <td className="cell-amount">
                        <div>
                          {p.currency === "USD" ? "$" : ""}
                          {p.totalCost.toLocaleString()} {p.currency}
                        </div>
                        {p.currency !== "USD" && (
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--primary-light)",
                              fontWeight: 500,
                              marginTop: "2px",
                            }}
                          >
                            ≈ $
                            {(
                              p.totalCostUsd ??
                              p.totalCost / (p.exchangeRateToUsd || 1)
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            USD
                            {p.exchangeRateToUsd && (
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  marginLeft: 3,
                                }}
                              >
                                @{p.exchangeRateToUsd}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.85rem",
                          }}
                        >
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>{p.expectedDispatch}</span>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px",
                            alignItems: "flex-start",
                          }}
                        >
                          <div className="status-select-wrapper">
                            <select
                              value={p.status}
                              onChange={(e) =>
                                handleUpdatePoStatus(p.id, e.target.value)
                              }
                              className={`status-select-pill ${
                                p.status === "ISSUED" ||
                                p.status === "COMPLETED"
                                  ? "badge-success"
                                  : p.status === "CANCELLED"
                                    ? "badge-danger"
                                    : p.status === "APPROVED" ||
                                        p.status === "ACKNOWLEDGED"
                                      ? "badge-primary"
                                      : "badge-warning"
                              }`}
                            >
                              <option value="DRAFT">DRAFT</option>
                              <option value="APPROVED">APPROVED</option>
                              <option value="ISSUED">ISSUED</option>
                              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </div>
                          {p.billNumber ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadBill(p);
                              }}
                              className="badge badge-success"
                              style={{
                                fontSize: "0.68rem",
                                padding: "3px 8px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: "pointer",
                                border: "1px solid rgba(16, 185, 129, 0.4)",
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                fontWeight: 600,
                                borderRadius: "4px",
                                transition: "all 0.15s ease",
                              }}
                              title={`Click to download Supplier Bill ${p.billNumber}`}
                            >
                              <FileText size={10} /> {p.billNumber}
                              <Download
                                size={10}
                                style={{ marginLeft: "2px" }}
                              />
                            </button>
                          ) : p.status === "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateBill(p);
                              }}
                              disabled={isGeneratingBill}
                              className="btn btn-xs btn-primary"
                              style={{
                                fontSize: "0.68rem",
                                padding: "2px 7px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontWeight: 600,
                              }}
                              title="Click to generate Supplier Bill in Finance"
                            >
                              <Plus size={10} /> Generate Bill
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {p.createdAt}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDrawerPo(p)}
                          className="btn btn-xs btn-outline"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            borderColor: "rgba(99, 102, 241, 0.35)",
                            background: "rgba(99, 102, 241, 0.08)",
                            color: "var(--primary-light)",
                            fontWeight: 600,
                          }}
                          title="Open attached trade documents & compliance vault"
                        >
                          <Paperclip size={11} />
                          <span>Vault</span>
                        </button>
                      </td>
                      <td
                        style={{ textAlign: "right", paddingRight: "1.5rem" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.4rem",
                          }}
                        >
                          {p.status === "DRAFT" && (
                            <button
                              onClick={() => handleIssuePo(p.id)}
                              className="btn btn-xs btn-primary"
                              title="Issue PO to Supplier"
                            >
                              <Send size={12} />
                              <span>Issue</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEditPo(p)}
                            className="btn btn-xs btn-outline"
                            title="Edit Purchase Order"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeletePo(p.id, p.poNumber)}
                            className="btn btn-xs btn-outline"
                            title="Delete Purchase Order"
                            style={{
                              color: "var(--danger)",
                              borderColor: "rgba(239, 68, 68, 0.25)",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={() => setDrawerPo(p)}
                            className="btn btn-xs btn-ghost"
                            title="Inspect Dossier"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Suppliers Table */}
        {activeTab === "suppliers" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`th-sortable ${supplierSortField === "code" ? "sorted" : ""}`}
                    onClick={() => handleSortSupplier("code")}
                  >
                    Supplier Code{" "}
                    {renderSortIndicator(
                      supplierSortField,
                      "code",
                      supplierSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${supplierSortField === "name" ? "sorted" : ""}`}
                    onClick={() => handleSortSupplier("name")}
                  >
                    Supplier & Processor Name{" "}
                    {renderSortIndicator(
                      supplierSortField,
                      "name",
                      supplierSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${supplierSortField === "location" ? "sorted" : ""}`}
                    onClick={() => handleSortSupplier("location")}
                  >
                    Location & State{" "}
                    {renderSortIndicator(
                      supplierSortField,
                      "location",
                      supplierSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${supplierSortField === "commodities" ? "sorted" : ""}`}
                    onClick={() => handleSortSupplier("commodities")}
                  >
                    Core Commodities{" "}
                    {renderSortIndicator(
                      supplierSortField,
                      "commodities",
                      supplierSortDir,
                    )}
                  </th>
                  <th>Credit Terms</th>
                  <th
                    className={`th-sortable ${supplierSortField === "rating" ? "sorted" : ""}`}
                    onClick={() => handleSortSupplier("rating")}
                  >
                    Quality Rating{" "}
                    {renderSortIndicator(
                      supplierSortField,
                      "rating",
                      supplierSortDir,
                    )}
                  </th>
                  <th style={{ textAlign: "right", paddingRight: "1.5rem" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="table-loading-state">
                        <div className="table-spinner" />
                        <div className="table-loading-text">
                          Loading verified suppliers from database...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="table-empty-state">
                        <div className="table-empty-state-icon">
                          <Building size={24} />
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          No suppliers match criteria
                        </h4>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr
                      key={s.id}
                      className="clickable-row"
                      onClick={() => setDrawerSupplier(s)}
                    >
                      <td className="cell-code">{s.code}</td>
                      <td>
                        <div className="cell-primary">{s.name}</div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <MapPin size={13} color="var(--primary-light)" />
                          <span>
                            {s.location}, {s.state}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {s.commodities}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-subtle">
                          {s.paymentTerms}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--warning)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          ★ {s.rating.toFixed(1)} / 5.0
                        </span>
                      </td>
                      <td
                        style={{ textAlign: "right", paddingRight: "1.5rem" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.4rem",
                          }}
                        >
                          <button
                            onClick={() => openEditSupplier(s)}
                            className="btn btn-xs btn-outline"
                            title="Edit Supplier Profile"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id, s.name)}
                            className="btn btn-xs btn-outline"
                            title="Delete Sourcing Partner"
                            style={{
                              color: "var(--danger)",
                              borderColor: "rgba(239, 68, 68, 0.25)",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={() => setDrawerSupplier(s)}
                            className="btn btn-xs btn-ghost"
                            title="View Profile Dossier"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer">
          <span>
            Showing{" "}
            {activeTab === "pos"
              ? filteredPos.length
              : filteredSuppliers.length}{" "}
            records
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Click any row to view complete procurement dossier. Edit or update
            status inline.
          </span>
        </div>
      </div>

      {/* PO DETAIL DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerPo)}
        onClose={() => setDrawerPo(null)}
        title={drawerPo?.poNumber || "Purchase Order Dossier"}
        subtitle={`Supplier: ${drawerPo?.supplierName} • Created ${drawerPo?.createdAt}`}
        badge={
          drawerPo ? (
            <span
              className={`badge ${
                drawerPo.status === "ISSUED" || drawerPo.status === "COMPLETED"
                  ? "badge-success"
                  : drawerPo.status === "CANCELLED"
                    ? "badge-danger"
                    : "badge-warning"
              }`}
            >
              <span className="badge-dot" />
              {drawerPo.status}
            </span>
          ) : null
        }
        footer={
          drawerPo ? (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              {drawerPo.status === "DRAFT" && (
                <button
                  onClick={() => handleIssuePo(drawerPo.id)}
                  className="btn btn-primary"
                >
                  <Send size={15} />
                  <span>Issue Purchase Order</span>
                </button>
              )}
              <button
                onClick={() => {
                  const p = drawerPo;
                  setDrawerPo(null);
                  openEditPo(p);
                }}
                className="btn btn-outline"
              >
                <Pencil size={15} />
                <span>Edit PO</span>
              </button>
              <button
                onClick={() => handleDeletePo(drawerPo.id, drawerPo.poNumber)}
                className="btn btn-outline"
                style={{
                  color: "var(--danger)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                <Trash2 size={15} />
                <span>Delete PO</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {drawerPo && (
          <>
            <div className="drawer-section">
              <div className="drawer-section-title">
                <FileCheck size={14} color="var(--primary-light)" />
                Sourcing & PO Details
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Purchase Order Code</span>
                  <span className="drawer-stat-value cell-code">
                    {drawerPo.poNumber}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Linked Sales Order</span>
                  <span className="drawer-stat-value cell-code">
                    {drawerPo.salesOrderRef}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Total Procurement Cost
                  </span>
                  <span
                    className="drawer-stat-value cell-amount"
                    style={{
                      fontSize: "1.25rem",
                      color: "var(--primary-light)",
                    }}
                  >
                    {drawerPo.currency === "USD" ? "$" : ""}
                    {drawerPo.totalCost.toLocaleString()} {drawerPo.currency}
                  </span>
                  {drawerPo.currency !== "USD" && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--primary-light)",
                        marginTop: "2px",
                      }}
                    >
                      ≈ $
                      {(
                        drawerPo.totalCostUsd ??
                        drawerPo.totalCost / (drawerPo.exchangeRateToUsd || 1)
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD
                      {drawerPo.exchangeRateToUsd && (
                        <span
                          style={{ color: "var(--text-muted)", marginLeft: 3 }}
                        >
                          @{drawerPo.exchangeRateToUsd}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Target Dispatch Schedule
                  </span>
                  <span
                    className="drawer-stat-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Calendar size={13} color="var(--text-muted)" />
                    {drawerPo.expectedDispatch}
                  </span>
                </div>
                <div className="drawer-stat" style={{ gridColumn: "span 2" }}>
                  <span className="drawer-stat-label">
                    Direct Status Progression
                  </span>
                  <div style={{ marginTop: "0.4rem" }}>
                    <select
                      value={drawerPo.status}
                      onChange={(e) =>
                        handleUpdatePoStatus(drawerPo.id, e.target.value)
                      }
                      style={{
                        padding: "0.45rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-medium)",
                        fontWeight: 600,
                      }}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="ISSUED">ISSUED</option>
                      <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier Procurement Invoicing & Accounts Payable */}
            <div className="drawer-section" style={{ marginTop: "1.25rem" }}>
              <div className="drawer-section-title">
                <FileText size={14} color="var(--primary-light)" />
                Supplier Invoicing & Accounts Payable
              </div>

              {drawerPo.billNumber ? (
                <div
                  className="card"
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.65rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <CheckCircle size={16} color="var(--success)" />
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Supplier Commercial Bill Issued
                      </span>
                    </div>
                    <span className="badge badge-success">
                      {drawerPo.billStatus || "PENDING"}
                    </span>
                  </div>
                  <div
                    className="drawer-grid"
                    style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}
                  >
                    <div className="drawer-stat">
                      <span className="drawer-stat-label">
                        Supplier Bill Ref
                      </span>
                      <span className="drawer-stat-value cell-code">
                        {drawerPo.billNumber}
                      </span>
                    </div>
                    <div className="drawer-stat">
                      <span className="drawer-stat-label">Total Payable</span>
                      <span
                        className="drawer-stat-value cell-amount"
                        style={{ color: "var(--success)" }}
                      >
                        ${drawerPo.totalCost.toLocaleString()}{" "}
                        {drawerPo.currency}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.5rem",
                    }}
                  >
                    Supplier invoice recorded in{" "}
                    <strong>Finance & Invoices (Accounts Payable)</strong>.
                    Track outward SWIFT wire disbursement there.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadBill(drawerPo)}
                    className="btn btn-sm btn-primary"
                    style={{
                      marginTop: "0.75rem",
                      width: "100%",
                      justifyContent: "center",
                      gap: "0.4rem",
                      fontWeight: 600,
                    }}
                  >
                    <Download size={14} />
                    <span>Download Supplier Bill ({drawerPo.billNumber})</span>
                  </button>
                </div>
              ) : drawerPo.status === "COMPLETED" ? (
                <div
                  className="card"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px dashed var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontSize: "0.88rem",
                      }}
                    >
                      Ready for Supplier Billing
                    </span>
                    <span className="badge badge-primary">● Completed PO</span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      margin: "0.35rem 0 0.85rem",
                      lineHeight: 1.45,
                    }}
                  >
                    Procurement fulfillment is completed! Click below to
                    generate the official Supplier Purchase Invoice / Bill and
                    record ${drawerPo.totalCost.toLocaleString()}{" "}
                    {drawerPo.currency} in Finance Accounts Payable.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateBill(drawerPo)}
                    disabled={isGeneratingBill}
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "0.65rem 1rem",
                      gap: "0.5rem",
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={15} />
                    <span>
                      {isGeneratingBill
                        ? "Generating Supplier Bill..."
                        : `Generate Supplier Bill ($${drawerPo.totalCost.toLocaleString()} ${drawerPo.currency})`}
                    </span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    padding: "0.5rem 0",
                  }}
                >
                  Supplier bills are generated once the Purchase Order reaches
                  COMPLETED status.
                </div>
              )}
            </div>

            {/* Trade Documents & Supplier Compliance Vault */}
            <div style={{ marginTop: "1.25rem" }}>
              <TradeDocumentVault
                entityType="PURCHASE_ORDER"
                entityId={drawerPo.id}
                entityReference={drawerPo.poNumber}
                title="Trade Documents & Sourcing Compliance Vault"
                subtitle="Upload & manage countersigned PO, supplier proforma, quality schedule, and wire receipts"
              />
            </div>
          </>
        )}
      </DetailDrawer>

      {/* SUPPLIER DETAIL DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerSupplier)}
        onClose={() => setDrawerSupplier(null)}
        title={drawerSupplier?.name || "Sourcing Partner Profile"}
        subtitle={`Supplier Code: ${drawerSupplier?.code} • ${drawerSupplier?.location}`}
        footer={
          drawerSupplier ? (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  const s = drawerSupplier;
                  setDrawerSupplier(null);
                  openEditSupplier(s);
                }}
                className="btn btn-outline"
              >
                <Pencil size={15} />
                <span>Edit Partner Profile</span>
              </button>
              <button
                onClick={() =>
                  handleDeleteSupplier(drawerSupplier.id, drawerSupplier.name)
                }
                className="btn btn-outline"
                style={{
                  color: "var(--danger)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                <Trash2 size={15} />
                <span>Delete Partner</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {drawerSupplier && (
          <div className="drawer-section">
            <div className="drawer-section-title">
              <Building size={14} color="var(--primary-light)" />
              Processor Capabilities & Terms
            </div>
            <div className="drawer-grid">
              <div className="drawer-stat">
                <span className="drawer-stat-label">Location</span>
                <span className="drawer-stat-value">
                  {drawerSupplier.location}, {drawerSupplier.state}
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Audit Rating</span>
                <span
                  className="drawer-stat-value"
                  style={{ color: "var(--warning)", fontWeight: 700 }}
                >
                  ★ {drawerSupplier.rating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Commodities Processed</span>
                <span className="drawer-stat-value">
                  {drawerSupplier.commodities}
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Payment Terms</span>
                <span className="drawer-stat-value">
                  <span className="badge badge-subtle">
                    {drawerSupplier.paymentTerms}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Add PO Modal */}
      {showAddPoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: "540px", width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "0.75rem",
              }}
            >
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                Issue Supplier Purchase Order
              </h3>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowAddPoModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreatePo}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Indian Supplier Partner / Processing Mill
                </label>
                <select
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                  }}
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.location}, {s.state})
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Confirmed Sales Order Ref
                  </label>
                  <select
                    value={salesOrderRef}
                    onChange={(e) => setSalesOrderRef(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                    required
                  >
                    {salesOrders.length > 0 ? (
                      salesOrders.map((so) => (
                        <option key={so.id} value={so.orderNumber}>
                          {so.orderNumber} — {so.customerName} ($
                          {so.totalAmount.toLocaleString()} USD) [{so.status}]
                        </option>
                      ))
                    ) : (
                      <option value="SO-2026-001">
                        SO-2026-001 — Al-Madina Foodstuff Wholesalers ($114,800
                        USD) [CONFIRMED]
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Multi-Currency & Live FX Rate Selection */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr",
                  gap: "1rem",
                  background: "rgba(59, 130, 246, 0.05)",
                  padding: "0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--primary-light)",
                    }}
                  >
                    Procurement Currency *
                  </label>
                  <select
                    value={poCurrency}
                    onChange={(e) => setPoCurrency(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                      fontWeight: 600,
                    }}
                  >
                    <option value="INR">
                      INR — Indian Rupee (Primary Origin)
                    </option>
                    <option value="USD">
                      USD — US Dollar (Base Benchmark)
                    </option>
                    {markets
                      .filter(
                        (m) =>
                          m.currencyCode !== "USD" && m.currencyCode !== "INR",
                      )
                      .map((m) => (
                        <option
                          key={m.id || m.currencyCode}
                          value={m.currencyCode}
                        >
                          {m.currencyCode} — {m.countryName} ({m.currencyName})
                        </option>
                      ))}
                    <option value="EUR">EUR — Eurozone (Euro)</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Exchange Rate to USD
                  </label>
                  <div
                    style={{
                      padding: "0.55rem 0.65rem",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      minHeight: "38px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>1 USD =</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--primary-light)",
                      }}
                    >
                      {poCurrency === "USD"
                        ? "1.0000 USD"
                        : `${(markets.find((m) => m.currencyCode === poCurrency)?.exchangeRateToUsd ?? 94.95).toFixed(4)} ${poCurrency}`}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Total Procurement Cost ({poCurrency})
                  </label>
                  <input
                    type="number"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                  {poCurrency !== "USD" && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--primary-light)",
                        marginTop: "4px",
                        fontWeight: 500,
                      }}
                    >
                      ≈ $
                      {(
                        (parseFloat(cost) || 0) /
                        (markets.find((m) => m.currencyCode === poCurrency)
                          ?.exchangeRateToUsd || 1)
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD equivalent
                    </div>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Expected Dispatch Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>
              </div>

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
                  className="btn btn-outline"
                  onClick={() => setShowAddPoModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingPo}
                >
                  {isSubmittingPo ? "Issuing..." : "Generate & Issue PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {editingPo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: "540px", width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "0.75rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Pencil size={18} color="var(--primary-light)" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                  Edit Purchase Order ({editingPo.poNumber})
                </h3>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setEditingPo(null)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdatePo}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Supplier Processor
                </label>
                <input
                  type="text"
                  required
                  value={editPoSupplier}
                  onChange={(e) => setEditPoSupplier(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Sales Order Ref
                  </label>
                  <input
                    type="text"
                    required
                    value={editPoOrderRef}
                    onChange={(e) => setEditPoOrderRef(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Total Cost ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={editPoCost}
                    onChange={(e) => setEditPoCost(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Expected Dispatch Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editPoDispatch}
                    onChange={(e) => setEditPoDispatch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={editPoStatus}
                    onChange={(e) =>
                      setEditPoStatus(
                        e.target.value as PurchaseOrderItem["status"],
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="ISSUED">ISSUED</option>
                    <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

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
                  className="btn btn-outline"
                  onClick={() => setEditingPo(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdatingPo}
                >
                  {isUpdatingPo ? "Saving Changes..." : "Update Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sourcing Partner Modal */}
      {showAddSupplierModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: "540px", width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "0.75rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Building size={20} color="var(--primary-light)" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                  Onboard Indian Sourcing Partner
                </h3>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowAddSupplierModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateSupplier}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Partner / Processor Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Malabar Agro Processing & Spices LLP"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Processing Hub / Location
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unjha, Mehsana"
                    value={newSupLocation}
                    onChange={(e) => setNewSupLocation(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    State of India
                  </label>
                  <select
                    value={newSupState}
                    onChange={(e) => setNewSupState(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="Gujarat">Gujarat</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Punjab">Punjab</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Commodities & Produce Handled
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Turmeric, Cumin, Black Pepper, Coriander"
                  value={newSupCommodities}
                  onChange={(e) => setNewSupCommodities(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Commercial Payment Terms
                  </label>
                  <select
                    value={newSupPaymentTerms}
                    onChange={(e) => setNewSupPaymentTerms(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="15 Days Credit">15 Days Credit</option>
                    <option value="30 Days Net">30 Days Net</option>
                    <option value="10 Days Net">10 Days Net</option>
                    <option value="Advance CAD">Advance CAD</option>
                    <option value="50% Advance, 50% Against Dispatch">
                      50% Advance, 50% Against Dispatch
                    </option>
                    <option value="Letter of Credit (LC)">
                      Letter of Credit (LC)
                    </option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Initial Audit Rating (out of 5.0)
                  </label>
                  <select
                    value={newSupRating}
                    onChange={(e) => setNewSupRating(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="5.0">5.0 (Grade A Processor)</option>
                    <option value="4.9">
                      4.9 (APEDA / Spice Board Certified)
                    </option>
                    <option value="4.8">4.8 (Verified Mill)</option>
                    <option value="4.7">4.7 (Standard Verified)</option>
                    <option value="4.5">4.5 (Trial Supplier)</option>
                  </select>
                </div>
              </div>

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
                  className="btn btn-outline"
                  onClick={() => setShowAddSupplierModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingSupplier}
                >
                  {isSubmittingSupplier
                    ? "Saving..."
                    : "Save & Onboard Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sourcing Partner Modal */}
      {editingSupplier && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: "540px", width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "0.75rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Pencil size={18} color="var(--primary-light)" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                  Edit Sourcing Partner ({editingSupplier.code})
                </h3>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setEditingSupplier(null)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdateSupplier}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Partner Company Name
                </label>
                <input
                  type="text"
                  required
                  value={editSupName}
                  onChange={(e) => setEditSupName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Location / Hub
                  </label>
                  <input
                    type="text"
                    required
                    value={editSupLocation}
                    onChange={(e) => setEditSupLocation(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    State
                  </label>
                  <select
                    value={editSupState}
                    onChange={(e) => setEditSupState(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="Gujarat">Gujarat</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Punjab">Punjab</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Core Commodities Handled
                </label>
                <input
                  type="text"
                  required
                  value={editSupCommodities}
                  onChange={(e) => setEditSupCommodities(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Commercial Payment Terms
                  </label>
                  <select
                    value={editSupPaymentTerms}
                    onChange={(e) => setEditSupPaymentTerms(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="15 Days Credit">15 Days Credit</option>
                    <option value="30 Days Net">30 Days Net</option>
                    <option value="10 Days Net">10 Days Net</option>
                    <option value="Advance CAD">Advance CAD</option>
                    <option value="50% Advance, 50% Against Dispatch">
                      50% Advance, 50% Against Dispatch
                    </option>
                    <option value="Letter of Credit (LC)">
                      Letter of Credit (LC)
                    </option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Audit Rating
                  </label>
                  <select
                    value={editSupRating}
                    onChange={(e) => setEditSupRating(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="5.0">5.0 (Grade A Processor)</option>
                    <option value="4.9">
                      4.9 (APEDA / Spice Board Certified)
                    </option>
                    <option value="4.8">4.8 (Verified Mill)</option>
                    <option value="4.7">4.7 (Standard Verified)</option>
                    <option value="4.5">4.5 (Trial Supplier)</option>
                  </select>
                </div>
              </div>

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
                  className="btn btn-outline"
                  onClick={() => setEditingSupplier(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdatingSupplier}
                >
                  {isUpdatingSupplier ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
