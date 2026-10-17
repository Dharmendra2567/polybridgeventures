import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  ShieldCheck,
  CheckCircle,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { TableToolbar } from "../common/TableToolbar.js";
import { DetailDrawer } from "../common/DetailDrawer.js";
import { exportToCsv } from "../../utils/csvExport.js";
import { API_BASE } from "../../utils/apiConfig.js";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  standardCost: number;
  standardPrice: number;
  currency: string;
  description: string;
}

type ProductSortField =
  "sku" | "name" | "category" | "uom" | "standardCost" | "standardPrice";
type SortDirection = "asc" | "desc";

export const CatalogueModule: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<ProductSortField>("sku");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Drawer
  const [drawerProduct, setDrawerProduct] = useState<ProductItem | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null,
  );

  // New product form
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Indian Spices – Whole & Ground");
  const [uom, setUom] = useState("MT");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit product form
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState(
    "Indian Spices – Whole & Ground",
  );
  const [editUom, setEditUom] = useState("MT");
  const [editCost, setEditCost] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/catalogue/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.warn("API error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdd(true);
    try {
      const res = await fetch(`${API_BASE}/catalogue/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          name,
          category,
          uom,
          standardCost: parseFloat(cost) || 100,
          standardPrice: parseFloat(price) || 150,
          description,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setSku("");
        setName("");
        setCost("");
        setPrice("");
        setDescription("");
        await fetchProducts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setEditSku(p.sku);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditUom(p.uom);
    setEditCost(p.standardCost.toString());
    setEditPrice(p.standardPrice.toString());
    setEditDescription(p.description);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/catalogue/products/${editingProduct.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: editSku,
            name: editName,
            category: editCategory,
            uom: editUom,
            standardCost: parseFloat(editCost) || editingProduct.standardCost,
            standardPrice:
              parseFloat(editPrice) || editingProduct.standardPrice,
            description: editDescription,
          }),
        },
      );
      if (res.ok) {
        setEditingProduct(null);
        await fetchProducts();
        if (drawerProduct && drawerProduct.id === editingProduct.id) {
          setDrawerProduct((prev) =>
            prev
              ? {
                  ...prev,
                  sku: editSku,
                  name: editName,
                  category: editCategory,
                  uom: editUom,
                  standardCost: parseFloat(editCost) || prev.standardCost,
                  standardPrice: parseFloat(editPrice) || prev.standardPrice,
                  description: editDescription,
                }
              : null,
          );
        }
      }
    } catch (err) {
      console.error("Error updating product:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProduct = async (
    productId: string,
    productName: string,
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete commodity "${productName}" from catalogue?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/catalogue/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        if (drawerProduct && drawerProduct.id === productId)
          setDrawerProduct(null);
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  const handleSort = (field: ProductSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const categories = [
    { id: "ALL", label: "All Commodities", count: products.length },
    {
      id: "Indian Spices – Whole & Ground",
      label: "🌶️ Spices",
      count: products.filter((p) => p.category.includes("Spices")).length,
    },
    {
      id: "Fresh Fruits from India",
      label: "🍎 Fruits",
      count: products.filter((p) => p.category.includes("Fruits")).length,
    },
    {
      id: "Fresh Vegetables from India",
      label: "🥕 Vegetables",
      count: products.filter((p) => p.category.includes("Vegetables")).length,
    },
    {
      id: "Industrial & Commercial Packaging",
      label: "📦 Packaging",
      count: products.filter((p) => p.category.includes("Packaging")).length,
    },
  ];

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory =
          selectedCategory === "ALL" || p.category === selectedCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortField, sortDir]);

  const handleExportCsv = () => {
    exportToCsv(
      "polybridge-master-catalogue",
      filteredProducts as unknown as Record<string, unknown>[],
      [
        { key: "sku", header: "SKU Code" },
        { key: "name", header: "Commodity Name" },
        { key: "category", header: "Category" },
        { key: "uom", header: "UOM" },
        { key: "standardCost", header: "FOB Standard Cost ($)" },
        { key: "standardPrice", header: "Standard Export Price ($)" },
        { key: "description", header: "Export Specifications" },
      ],
    );
  };

  const renderSortIndicator = (targetField: ProductSortField) => {
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
          <span>Add Export Product</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        {/* Toolbar with Categories (relaxed density default) */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by SKU, commodity name, specs..."
          filterOptions={categories}
          activeFilter={selectedCategory}
          onFilterChange={setSelectedCategory}
          onExportCsv={handleExportCsv}
        />

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  className={`th-sortable ${sortField === "sku" ? "sorted" : ""}`}
                  onClick={() => handleSort("sku")}
                >
                  SKU Code {renderSortIndicator("sku")}
                </th>
                <th
                  className={`th-sortable ${sortField === "name" ? "sorted" : ""}`}
                  onClick={() => handleSort("name")}
                >
                  Commodity Name {renderSortIndicator("name")}
                </th>
                <th
                  className={`th-sortable ${sortField === "category" ? "sorted" : ""}`}
                  onClick={() => handleSort("category")}
                >
                  Category {renderSortIndicator("category")}
                </th>
                <th
                  className={`th-sortable ${sortField === "uom" ? "sorted" : ""}`}
                  onClick={() => handleSort("uom")}
                >
                  UOM {renderSortIndicator("uom")}
                </th>
                <th
                  className={`th-sortable ${sortField === "standardCost" ? "sorted" : ""}`}
                  onClick={() => handleSort("standardCost")}
                >
                  FOB Cost {renderSortIndicator("standardCost")}
                </th>
                <th
                  className={`th-sortable ${sortField === "standardPrice" ? "sorted" : ""}`}
                  onClick={() => handleSort("standardPrice")}
                >
                  Export Price {renderSortIndicator("standardPrice")}
                </th>
                <th>Margin %</th>
                <th>Export Specifications</th>
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
                        Loading export commodities from database...
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="table-empty-state">
                      <div className="table-empty-state-icon">
                        <Package size={24} />
                      </div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        No commodities found
                      </h4>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const margin =
                    p.standardPrice > 0
                      ? (
                          ((p.standardPrice - p.standardCost) /
                            p.standardPrice) *
                          100
                        ).toFixed(1)
                      : "0";
                  return (
                    <tr
                      key={p.id}
                      className="clickable-row"
                      onClick={() => setDrawerProduct(p)}
                    >
                      <td className="cell-code">{p.sku}</td>
                      <td>
                        <div className="cell-primary">{p.name}</div>
                      </td>
                      <td>
                        <span className="badge badge-subtle">{p.category}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.uom}</td>
                      <td className="cell-amount">
                        ${p.standardCost.toLocaleString()}
                      </td>
                      <td
                        className="cell-amount"
                        style={{
                          color: "var(--primary-light)",
                          fontWeight: 700,
                        }}
                      >
                        ${p.standardPrice.toLocaleString()}
                      </td>
                      <td>
                        <span
                          style={{
                            color: "var(--success)",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {margin}%
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: "0.825rem",
                            color: "var(--text-secondary)",
                            maxWidth: "240px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={p.description}
                        >
                          {p.description}
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
                          <button
                            onClick={() => openEditModal(p)}
                            className="btn btn-xs btn-outline"
                            title="Edit Commodity Specs"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="btn btn-xs btn-outline"
                            title="Delete Commodity"
                            style={{
                              color: "var(--danger)",
                              borderColor: "rgba(239, 68, 68, 0.25)",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={() => setDrawerProduct(p)}
                            className="btn btn-xs btn-ghost"
                            title="View Specifications"
                          >
                            <Eye size={12} />
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
          <span>Showing {filteredProducts.length} commodities</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Click row for detailed export specifications and quality
            certifications. Full CRUD available.
          </span>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerProduct)}
        onClose={() => setDrawerProduct(null)}
        title={drawerProduct?.name || "Product Specifications"}
        subtitle={`SKU: ${drawerProduct?.sku} • Category: ${drawerProduct?.category}`}
        badge={
          drawerProduct ? (
            <span className="badge badge-primary">
              <span className="badge-dot" />
              {drawerProduct.uom}
            </span>
          ) : null
        }
        footer={
          drawerProduct ? (
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
                  const p = drawerProduct;
                  setDrawerProduct(null);
                  openEditModal(p);
                }}
                className="btn btn-outline"
              >
                <Pencil size={15} />
                <span>Edit Product</span>
              </button>
              <button
                onClick={() =>
                  handleDeleteProduct(drawerProduct.id, drawerProduct.name)
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
        {drawerProduct && (
          <>
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Tag size={14} color="var(--primary-light)" />
                Export Pricing & Baseline Margin
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Standard FOB Cost</span>
                  <span className="drawer-stat-value cell-amount">
                    ${drawerProduct.standardCost.toLocaleString()} USD/
                    {drawerProduct.uom}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Standard Export Price
                  </span>
                  <span
                    className="drawer-stat-value cell-amount"
                    style={{
                      color: "var(--primary-light)",
                      fontSize: "1.25rem",
                    }}
                  >
                    ${drawerProduct.standardPrice.toLocaleString()} USD/
                    {drawerProduct.uom}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Unit of Measure (UOM)
                  </span>
                  <span className="drawer-stat-value">{drawerProduct.uom}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Theoretical Gross Margin
                  </span>
                  <span
                    className="drawer-stat-value"
                    style={{ color: "var(--success)", fontWeight: 700 }}
                  >
                    {(
                      ((drawerProduct.standardPrice -
                        drawerProduct.standardCost) /
                        drawerProduct.standardPrice) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">
                <ShieldCheck size={14} color="var(--primary-light)" />
                Export Quality & Phyto Specifications
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                  background: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {drawerProduct.description}
              </p>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">
                <CheckCircle size={14} color="var(--primary-light)" />
                Regulatory & Export Compliance
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span className="badge badge-success">APEDA Certified</span>
                <span className="badge badge-success">
                  Spice Board of India
                </span>
                <span className="badge badge-success">
                  FSSAI Export Quality
                </span>
                <span className="badge badge-subtle">Fumigation Compliant</span>
              </div>
            </div>
          </>
        )}
      </DetailDrawer>

      {/* Add Product Modal */}
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
          <div className="card" style={{ maxWidth: "580px", width: "100%" }}>
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
                Add New Export Commodity
              </h3>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAddProduct}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
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
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SPICE-COR-SEED"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
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
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coriander Seeds Bold Green"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                  gridTemplateColumns: "2fr 1fr",
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
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="Indian Spices – Whole & Ground">
                      Indian Spices – Whole & Ground
                    </option>
                    <option value="Fresh Fruits from India">
                      Fresh Fruits from India
                    </option>
                    <option value="Fresh Vegetables from India">
                      Fresh Vegetables from India
                    </option>
                    <option value="Industrial & Commercial Packaging">
                      Industrial & Commercial Packaging
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
                    UOM
                  </label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="MT">MT (Metric Ton)</option>
                    <option value="BOX">BOX (Corrugated Carton)</option>
                    <option value="BAG">BAG (25kg/50kg Sack)</option>
                    <option value="PCS">PCS (Units)</option>
                    <option value="KG">KG (Kilogram)</option>
                  </select>
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
                    Standard Cost ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1800"
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
                    Standard Export Price ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 2250"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
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
                  Product & Quality Specifications
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Machine cleaned 99% purity, moisture max 8%, origin Gujarat, India."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                    resize: "vertical",
                  }}
                />
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
                  disabled={isSubmittingAdd}
                >
                  {isSubmittingAdd ? "Saving..." : "Save to Catalogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
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
          <div className="card" style={{ maxWidth: "580px", width: "100%" }}>
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
                  Edit Commodity ({editingProduct.sku})
                </h3>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setEditingProduct(null)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdateProduct}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
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
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
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
                    Commodity Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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
                  gridTemplateColumns: "2fr 1fr",
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
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="Indian Spices – Whole & Ground">
                      Indian Spices – Whole & Ground
                    </option>
                    <option value="Fresh Fruits from India">
                      Fresh Fruits from India
                    </option>
                    <option value="Fresh Vegetables from India">
                      Fresh Vegetables from India
                    </option>
                    <option value="Industrial & Commercial Packaging">
                      Industrial & Commercial Packaging
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
                    UOM
                  </label>
                  <select
                    value={editUom}
                    onChange={(e) => setEditUom(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="MT">MT (Metric Ton)</option>
                    <option value="BOX">BOX (Corrugated Carton)</option>
                    <option value="BAG">BAG (25kg/50kg Sack)</option>
                    <option value="PCS">PCS (Units)</option>
                    <option value="KG">KG (Kilogram)</option>
                  </select>
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
                    Standard Cost ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
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
                    Standard Export Price ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
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
                  Product & Quality Specifications
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                    resize: "vertical",
                  }}
                />
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
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving Changes..." : "Update Commodity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
