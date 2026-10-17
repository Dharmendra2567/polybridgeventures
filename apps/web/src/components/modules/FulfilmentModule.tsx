import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Plus,
  FileCheck,
  Globe,
  Calendar,
  Anchor,
  Navigation,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { TableToolbar } from "../common/TableToolbar.js";
import { DetailDrawer } from "../common/DetailDrawer.js";
import { exportToCsv } from "../../utils/csvExport.js";
import { TradeDocumentVault } from "../common/TradeDocumentVault.js";
import { API_BASE } from "../../utils/apiConfig.js";

interface ShipmentItem {
  id: string;
  shipmentReference: string;
  salesOrderRef: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  status:
    | "BOOKED"
    | "DISPATCHED"
    | "IN_TRANSIT"
    | "CUSTOMS_CLEARANCE"
    | "DELIVERED"
    | "EXCEPTION";
  originPort: string;
  destinationPort: string;
  dispatchedDate: string;
  estimatedArrival: string;
  isSupplierDirect: boolean;
}

type ShipmentSortField =
  | "shipmentReference"
  | "salesOrderRef"
  | "customerName"
  | "carrier"
  | "dispatchedDate"
  | "estimatedArrival"
  | "status";
type SortDirection = "asc" | "desc";

export const FulfilmentModule: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Sorting
  const [sortField, setSortField] =
    useState<ShipmentSortField>("shipmentReference");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Drawer
  const [drawerShipment, setDrawerShipment] = useState<ShipmentItem | null>(
    null,
  );

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<ShipmentItem | null>(
    null,
  );

  // New Shipment form
  const [salesOrderRef, setSalesOrderRef] = useState("SO-2026-001");
  const [customerName, setCustomerName] = useState(
    "Al-Madina Foodstuff Wholesalers LLC",
  );
  const [carrier, setCarrier] = useState("Maersk Line Shipping");
  const [trackingNumber, setTrackingNumber] = useState("MSKU88492019");
  const [originPort, setOriginPort] = useState("Mundra Port, Gujarat, India");
  const [destinationPort, setDestinationPort] = useState(
    "Jebel Ali Port, Dubai, UAE",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Shipment form
  const [editRef, setEditRef] = useState("");
  const [editSalesOrderRef, setEditSalesOrderRef] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCarrier, setEditCarrier] = useState("");
  const [editTrackingNumber, setEditTrackingNumber] = useState("");
  const [editOriginPort, setEditOriginPort] = useState("");
  const [editDestinationPort, setEditDestinationPort] = useState("");
  const [editDispatchedDate, setEditDispatchedDate] = useState("");
  const [editEstimatedArrival, setEditEstimatedArrival] = useState("");
  const [editStatus, setEditStatus] =
    useState<ShipmentItem["status"]>("DISPATCHED");
  const [isUpdating, setIsUpdating] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchShipments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/fulfilment/shipments`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
      }
    } catch (err) {
      console.warn("API error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleUpdateStatus = async (shipmentId: string, newStatus: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/fulfilment/shipments/${shipmentId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (res.ok) {
        setShipments((prev) =>
          prev.map((s) =>
            s.id === shipmentId
              ? { ...s, status: newStatus as ShipmentItem["status"] }
              : s,
          ),
        );
        if (drawerShipment && drawerShipment.id === shipmentId) {
          setDrawerShipment((prev) =>
            prev
              ? { ...prev, status: newStatus as ShipmentItem["status"] }
              : null,
          );
        }
      }
    } catch (err) {
      console.error("Error updating shipment status:", err);
    }
  };

  const handleDeliver = async (shipmentId: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/fulfilment/shipments/${shipmentId}/deliver`,
        {
          method: "PATCH",
        },
      );
      if (res.ok) {
        await fetchShipments();
        if (drawerShipment && drawerShipment.id === shipmentId) {
          setDrawerShipment((prev) =>
            prev ? { ...prev, status: "DELIVERED" } : null,
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShipment = async (shipmentId: string, ref: string) => {
    if (!window.confirm(`Are you sure you want to delete shipment ${ref}?`)) {
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/fulfilment/shipments/${shipmentId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        setShipments((prev) => prev.filter((s) => s.id !== shipmentId));
        if (drawerShipment && drawerShipment.id === shipmentId)
          setDrawerShipment(null);
      }
    } catch (err) {
      console.error("Error deleting shipment:", err);
    }
  };

  const openEditModal = (s: ShipmentItem) => {
    setEditingShipment(s);
    setEditRef(s.shipmentReference);
    setEditSalesOrderRef(s.salesOrderRef);
    setEditCustomerName(s.customerName);
    setEditCarrier(s.carrier);
    setEditTrackingNumber(s.trackingNumber);
    setEditOriginPort(s.originPort);
    setEditDestinationPort(s.destinationPort);
    setEditDispatchedDate(s.dispatchedDate);
    setEditEstimatedArrival(s.estimatedArrival);
    setEditStatus(s.status);
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    setIsUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/fulfilment/shipments/${editingShipment.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shipmentReference: editRef,
            salesOrderRef: editSalesOrderRef,
            customerName: editCustomerName,
            carrier: editCarrier,
            trackingNumber: editTrackingNumber,
            originPort: editOriginPort,
            destinationPort: editDestinationPort,
            dispatchedDate: editDispatchedDate,
            estimatedArrival: editEstimatedArrival,
            status: editStatus,
          }),
        },
      );
      if (res.ok) {
        setEditingShipment(null);
        await fetchShipments();
        if (drawerShipment && drawerShipment.id === editingShipment.id) {
          setDrawerShipment((prev) =>
            prev
              ? {
                  ...prev,
                  shipmentReference: editRef,
                  salesOrderRef: editSalesOrderRef,
                  customerName: editCustomerName,
                  carrier: editCarrier,
                  trackingNumber: editTrackingNumber,
                  originPort: editOriginPort,
                  destinationPort: editDestinationPort,
                  dispatchedDate: editDispatchedDate,
                  estimatedArrival: editEstimatedArrival,
                  status: editStatus,
                }
              : null,
          );
        }
      }
    } catch (err) {
      console.error("Error updating shipment:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/fulfilment/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderRef,
          customerName,
          carrier,
          trackingNumber,
          originPort,
          destinationPort,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchShipments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (field: ShipmentSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filterOptions = [
    { id: "ALL", label: "All Shipments", count: shipments.length },
    {
      id: "DISPATCHED",
      label: "Dispatched",
      count: shipments.filter((s) => s.status === "DISPATCHED").length,
    },
    {
      id: "IN_TRANSIT",
      label: "In Transit",
      count: shipments.filter((s) => s.status === "IN_TRANSIT").length,
    },
    {
      id: "CUSTOMS_CLEARANCE",
      label: "Customs Clearance",
      count: shipments.filter((s) => s.status === "CUSTOMS_CLEARANCE").length,
    },
    {
      id: "DELIVERED",
      label: "Delivered (POD)",
      count: shipments.filter((s) => s.status === "DELIVERED").length,
    },
  ];

  const filteredShipments = useMemo(() => {
    return shipments
      .filter((s) => {
        const matchesStatus =
          statusFilter === "ALL" || s.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          s.shipmentReference.toLowerCase().includes(q) ||
          s.salesOrderRef.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q) ||
          s.trackingNumber.toLowerCase().includes(q) ||
          s.originPort.toLowerCase().includes(q) ||
          s.destinationPort.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [shipments, statusFilter, searchQuery, sortField, sortDir]);

  const handleExportCsv = () => {
    exportToCsv(
      "polybridge-shipments-tracking",
      filteredShipments as unknown as Record<string, unknown>[],
      [
        { key: "shipmentReference", header: "Shipment Ref" },
        { key: "salesOrderRef", header: "Sales Order" },
        { key: "customerName", header: "Buyer" },
        { key: "carrier", header: "Shipping Line" },
        { key: "trackingNumber", header: "Bill of Lading" },
        { key: "originPort", header: "Port of Loading" },
        { key: "destinationPort", header: "Port of Discharge" },
        { key: "dispatchedDate", header: "Dispatched Date" },
        { key: "estimatedArrival", header: "ETA" },
        { key: "status", header: "Status" },
      ],
    );
  };

  const renderSortIndicator = (targetField: ShipmentSortField) => {
    if (sortField !== targetField) {
      return <ArrowUpDown size={12} className="sort-icon-indicator" />;
    }
    return sortDir === "asc" ? (
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
      {/* Module Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus size={15} />
          <span>Log Container Shipment</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        {/* Toolbar (density relaxed by default) */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by shipment ref, order #, carrier, B/L..."
          filterOptions={filterOptions}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onExportCsv={handleExportCsv}
        />

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  className={`th-sortable ${sortField === "shipmentReference" ? "sorted" : ""}`}
                  onClick={() => handleSort("shipmentReference")}
                >
                  Shipment Ref {renderSortIndicator("shipmentReference")}
                </th>
                <th
                  className={`th-sortable ${sortField === "salesOrderRef" ? "sorted" : ""}`}
                  onClick={() => handleSort("salesOrderRef")}
                >
                  Order Ref {renderSortIndicator("salesOrderRef")}
                </th>
                <th
                  className={`th-sortable ${sortField === "customerName" ? "sorted" : ""}`}
                  onClick={() => handleSort("customerName")}
                >
                  Buyer / Consignee {renderSortIndicator("customerName")}
                </th>
                <th
                  className={`th-sortable ${sortField === "carrier" ? "sorted" : ""}`}
                  onClick={() => handleSort("carrier")}
                >
                  Carrier & B/L {renderSortIndicator("carrier")}
                </th>
                <th>Routing (Origin → Destination)</th>
                <th
                  className={`th-sortable ${sortField === "dispatchedDate" ? "sorted" : ""}`}
                  onClick={() => handleSort("dispatchedDate")}
                >
                  Dispatched {renderSortIndicator("dispatchedDate")}
                </th>
                <th
                  className={`th-sortable ${sortField === "estimatedArrival" ? "sorted" : ""}`}
                  onClick={() => handleSort("estimatedArrival")}
                >
                  ETA {renderSortIndicator("estimatedArrival")}
                </th>
                <th
                  className={`th-sortable ${sortField === "status" ? "sorted" : ""}`}
                  onClick={() => handleSort("status")}
                >
                  Status {renderSortIndicator("status")}
                </th>
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
                        Loading export shipments from database...
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="table-empty-state">
                      <div className="table-empty-state-icon">
                        <Truck size={24} />
                      </div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        No active shipments match criteria
                      </h4>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => (
                  <tr
                    key={s.id}
                    className="clickable-row"
                    onClick={() => setDrawerShipment(s)}
                  >
                    <td className="cell-code">{s.shipmentReference}</td>
                    <td
                      className="cell-code"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {s.salesOrderRef}
                    </td>
                    <td>
                      <div className="cell-primary">{s.customerName}</div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {s.carrier}
                      </div>
                      <div
                        className="cell-secondary cell-code"
                        style={{ fontSize: "0.725rem" }}
                      >
                        BL: {s.trackingNumber}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>
                          From: {s.originPort}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          To: {s.destinationPort}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        fontSize: "0.825rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {s.dispatchedDate}
                    </td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.estimatedArrival}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="status-select-wrapper">
                        <select
                          value={s.status}
                          onChange={(e) =>
                            handleUpdateStatus(s.id, e.target.value)
                          }
                          className={`status-select-pill ${
                            s.status === "DELIVERED"
                              ? "badge-success"
                              : s.status === "IN_TRANSIT"
                                ? "badge-warning"
                                : s.status === "CUSTOMS_CLEARANCE"
                                  ? "badge-primary"
                                  : s.status === "EXCEPTION"
                                    ? "badge-danger"
                                    : "badge-info"
                          }`}
                        >
                          <option value="BOOKED">BOOKED</option>
                          <option value="DISPATCHED">DISPATCHED</option>
                          <option value="IN_TRANSIT">IN_TRANSIT</option>
                          <option value="CUSTOMS_CLEARANCE">
                            CUSTOMS_CLEARANCE
                          </option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="EXCEPTION">EXCEPTION</option>
                        </select>
                      </div>
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
                        {s.status !== "DELIVERED" && (
                          <button
                            onClick={() => handleDeliver(s.id)}
                            className="btn btn-xs btn-success"
                            title="Confirm Proof of Delivery"
                          >
                            <FileCheck size={12} />
                            <span>POD</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(s)}
                          className="btn btn-xs btn-outline"
                          title="Edit Shipment"
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteShipment(s.id, s.shipmentReference)
                          }
                          className="btn btn-xs btn-outline"
                          title="Delete Shipment"
                          style={{
                            color: "var(--danger)",
                            borderColor: "rgba(239, 68, 68, 0.25)",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          onClick={() => setDrawerShipment(s)}
                          className="btn btn-xs btn-ghost"
                          title="View Details"
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

        <div className="table-footer">
          <span>Showing {filteredShipments.length} containers</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Zero-warehouse cross-border logistics stream. Edit or update status
            inline.
          </span>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerShipment)}
        onClose={() => setDrawerShipment(null)}
        title={drawerShipment?.shipmentReference || "Shipment Tracking"}
        subtitle={`Carrier: ${drawerShipment?.carrier} • B/L: ${drawerShipment?.trackingNumber}`}
        badge={
          drawerShipment ? (
            <span
              className={`badge ${drawerShipment.status === "DELIVERED" ? "badge-success" : "badge-warning"}`}
            >
              <span className="badge-dot" />
              {drawerShipment.status}
            </span>
          ) : null
        }
        footer={
          drawerShipment ? (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              {drawerShipment.status !== "DELIVERED" && (
                <button
                  onClick={() => handleDeliver(drawerShipment.id)}
                  className="btn btn-success"
                >
                  <FileCheck size={15} />
                  <span>Confirm POD</span>
                </button>
              )}
              <button
                onClick={() => {
                  const s = drawerShipment;
                  setDrawerShipment(null);
                  openEditModal(s);
                }}
                className="btn btn-outline"
              >
                <Pencil size={15} />
                <span>Edit Shipment</span>
              </button>
              <button
                onClick={() =>
                  handleDeleteShipment(
                    drawerShipment.id,
                    drawerShipment.shipmentReference,
                  )
                }
                className="btn btn-outline"
                style={{
                  color: "var(--danger)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {drawerShipment && (
          <>
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Navigation size={14} color="var(--primary-light)" />
                Routing & Ocean Freight Tracking
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Port of Loading (POL)
                  </span>
                  <span
                    className="drawer-stat-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Anchor size={14} color="var(--primary-light)" />
                    {drawerShipment.originPort}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Port of Discharge (POD)
                  </span>
                  <span
                    className="drawer-stat-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Globe size={14} color="var(--success)" />
                    {drawerShipment.destinationPort}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Dispatched Date</span>
                  <span
                    className="drawer-stat-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Calendar size={13} color="var(--text-muted)" />
                    {drawerShipment.dispatchedDate}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Estimated Port Arrival
                  </span>
                  <span
                    className="drawer-stat-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Calendar size={13} color="var(--primary-light)" />
                    {drawerShipment.estimatedArrival}
                  </span>
                </div>
                <div className="drawer-stat" style={{ gridColumn: "span 2" }}>
                  <span className="drawer-stat-label">
                    Update Shipment Status
                  </span>
                  <div style={{ marginTop: "0.4rem" }}>
                    <select
                      value={drawerShipment.status}
                      onChange={(e) =>
                        handleUpdateStatus(drawerShipment.id, e.target.value)
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
                      <option value="BOOKED">BOOKED</option>
                      <option value="DISPATCHED">DISPATCHED</option>
                      <option value="IN_TRANSIT">IN_TRANSIT</option>
                      <option value="CUSTOMS_CLEARANCE">
                        CUSTOMS_CLEARANCE
                      </option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="EXCEPTION">EXCEPTION</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">
                <FileCheck size={14} color="var(--primary-light)" />
                Commercial Consignee & Shipping Documentation
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Consignee Name</span>
                  <span className="drawer-stat-value">
                    {drawerShipment.customerName}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Sales Order Reference
                  </span>
                  <span className="drawer-stat-value cell-code">
                    {drawerShipment.salesOrderRef}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Shipping Line</span>
                  <span className="drawer-stat-value">
                    {drawerShipment.carrier}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Bill of Lading Tracking
                  </span>
                  <span
                    className="drawer-stat-value cell-code"
                    style={{ color: "var(--primary-light)" }}
                  >
                    {drawerShipment.trackingNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Logistics & POD Documents Vault */}
            <div style={{ marginTop: "1.25rem" }}>
              <TradeDocumentVault
                entityType="FULFILMENT_SHIPMENT"
                entityId={drawerShipment.id}
                entityReference={drawerShipment.shipmentReference}
                title="Shipping Logistics & POD Documents"
                subtitle="Upload Bill of Lading (B/L), Packing List, Certificate of Origin, SGS Inspection, and Consignee POD"
              />
            </div>
          </>
        )}
      </DetailDrawer>

      {/* Add Shipment Modal */}
      {showAddModal && (
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
                Log Container Dispatch
              </h3>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateShipment}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
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
                    Consignee / Customer
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
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
                    Shipping Carrier
                  </label>
                  <input
                    type="text"
                    required
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
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
                    Bill of Lading #
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
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
                    Origin Port (India)
                  </label>
                  <input
                    type="text"
                    required
                    value={originPort}
                    onChange={(e) => setOriginPort(e.target.value)}
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
                    Destination Port (Global)
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
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
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Dispatching..." : "Dispatch Container"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shipment Modal */}
      {editingShipment && (
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
                  Edit Container Shipment ({editingShipment.shipmentReference})
                </h3>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setEditingShipment(null)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdateShipment}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
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
                    Shipment Ref
                  </label>
                  <input
                    type="text"
                    required
                    value={editRef}
                    onChange={(e) => setEditRef(e.target.value)}
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
                    Sales Order Ref
                  </label>
                  <input
                    type="text"
                    required
                    value={editSalesOrderRef}
                    onChange={(e) => setEditSalesOrderRef(e.target.value)}
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
                  Buyer / Consignee
                </label>
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
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
                    Carrier Line
                  </label>
                  <input
                    type="text"
                    required
                    value={editCarrier}
                    onChange={(e) => setEditCarrier(e.target.value)}
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
                    Bill of Lading #
                  </label>
                  <input
                    type="text"
                    required
                    value={editTrackingNumber}
                    onChange={(e) => setEditTrackingNumber(e.target.value)}
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
                    Port of Loading
                  </label>
                  <input
                    type="text"
                    required
                    value={editOriginPort}
                    onChange={(e) => setEditOriginPort(e.target.value)}
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
                    Port of Discharge
                  </label>
                  <input
                    type="text"
                    required
                    value={editDestinationPort}
                    onChange={(e) => setEditDestinationPort(e.target.value)}
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
                  gridTemplateColumns: "1fr 1fr 1fr",
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
                    Dispatched Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDispatchedDate}
                    onChange={(e) => setEditDispatchedDate(e.target.value)}
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
                    ETA
                  </label>
                  <input
                    type="date"
                    required
                    value={editEstimatedArrival}
                    onChange={(e) => setEditEstimatedArrival(e.target.value)}
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
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as ShipmentItem["status"])
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
                    <option value="BOOKED">BOOKED</option>
                    <option value="DISPATCHED">DISPATCHED</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="CUSTOMS_CLEARANCE">CUSTOMS_CLEARANCE</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="EXCEPTION">EXCEPTION</option>
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
                  onClick={() => setEditingShipment(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving Changes..." : "Update Shipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
