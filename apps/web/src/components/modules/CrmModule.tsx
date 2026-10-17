import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  CheckCircle,
  Mail,
  Phone,
  Globe,
  Calendar,
  Building,
  FileText,
  ExternalLink,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  Send,
  Pencil,
  Trash2,
  Factory,
} from "lucide-react";
import { TableToolbar } from "../common/TableToolbar.js";
import { DetailDrawer } from "../common/DetailDrawer.js";
import { exportToCsv } from "../../utils/csvExport.js";

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED";
  notes: string;
  date: string;
  leadType?: "BUYER" | "SUPPLIER";
  convertedAccountId?: string;
  convertedType?: "BUYER" | "SUPPLIER";
  convertedSupplierCode?: string;
}

interface Account {
  id: string;
  accountNumber: string;
  name: string;
  country: string;
  destinationPort: string;
  paymentTerms: string;
  status: "ACTIVE" | "ON_HOLD";
  totalOrdersValue: number;
}

type LeadSortField =
  "name" | "company" | "country" | "date" | "status" | "source";
type AccountSortField =
  | "accountNumber"
  | "name"
  | "country"
  | "destinationPort"
  | "totalOrdersValue"
  | "status";
type SortDirection = "asc" | "desc";

export const CrmModule: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<"leads" | "accounts">("leads");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Sorting
  const [leadSortField, setLeadSortField] = useState<LeadSortField>("date");
  const [leadSortDir, setLeadSortDir] = useState<SortDirection>("desc");
  const [accSortField, setAccSortField] =
    useState<AccountSortField>("accountNumber");
  const [accSortDir, setAccSortDir] = useState<SortDirection>("asc");

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedAccIds, setSelectedAccIds] = useState<string[]>([]);

  // Drawer Inspect State
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerAccount, setDrawerAccount] = useState<Account | null>(null);

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Convert Lead Modal State (Supports Buyer & Supplier)
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [convertTargetType, setConvertTargetType] = useState<
    "BUYER" | "SUPPLIER"
  >("BUYER");

  // Buyer Mandated Fields
  const [convertCompanyName, setConvertCompanyName] = useState("");
  const [convertCountry, setConvertCountry] = useState("");
  const [convertDestPort, setConvertDestPort] = useState("");
  const [convertPaymentTerms, setConvertPaymentTerms] = useState("30 Days Net");
  const [convertAccountNumber, setConvertAccountNumber] = useState("");

  // Supplier Mandated Fields
  const [convertSupplierCode, setConvertSupplierCode] = useState("");
  const [convertSupplierState, setConvertSupplierState] = useState("Gujarat");
  const [convertSupplierCity, setConvertSupplierCity] = useState("Unjha");
  const [convertSupplierCommodities, setConvertSupplierCommodities] = useState(
    "Spices & Agro Commodities",
  );
  const [convertSupplierPaymentTerms, setConvertSupplierPaymentTerms] =
    useState("15 Days Credit");
  const [convertSupplierRating, setConvertSupplierRating] = useState(4.8);

  const [isConverting, setIsConverting] = useState(false);

  // New Lead form state
  const [newLeadType, setNewLeadType] = useState<"BUYER" | "SUPPLIER">("BUYER");
  const [name, setName] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState(
    "Al-Madina Foodstuff Wholesalers LLC",
  );
  const [isOtherBuyer, setIsOtherBuyer] = useState(false);
  const [customBuyerName, setCustomBuyerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [source, setSource] = useState("Website Contact Form");
  const [notes, setNotes] = useState("");

  // New Account form state
  const [accName, setAccName] = useState("");
  const [accCountry, setAccCountry] = useState("Netherlands");
  const [destPort, setDestPort] = useState("Port of Rotterdam");
  const [paymentTerms, setPaymentTerms] = useState("30 Days Net");

  const [isLoading, setIsLoading] = useState(true);

  const fetchCrmData = async () => {
    try {
      setIsLoading(true);
      const [resLeads, resAccounts] = await Promise.all([
        fetch("/api/v1/crm/leads"),
        fetch("/api/v1/crm/accounts"),
      ]);
      if (resLeads.ok && resAccounts.ok) {
        const lData = await resLeads.json();
        const aData = await resAccounts.json();
        setLeads(lData.leads || []);
        const accList: Account[] = aData.accounts || [];
        setAccounts(accList);
        const firstAcc = accList[0];
        if (firstAcc && !selectedBuyer) {
          setSelectedBuyer(firstAcc.name);
          setCountry(firstAcc.country);
        }
      }
    } catch (err) {
      console.warn("API error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCrmData();
  }, []);

  const handleBuyerChange = (value: string) => {
    if (value === "__OTHER__") {
      setIsOtherBuyer(true);
      setCustomBuyerName("");
      setCountry("");
    } else {
      setIsOtherBuyer(false);
      setSelectedBuyer(value);
      const found = accounts.find((a) => a.name === value);
      if (found) {
        setCountry(found.country);
      }
    }
  };

  const handleOpenConvertModal = (lead: Lead) => {
    setConvertingLead(lead);
    const isSupplier =
      lead.leadType === "SUPPLIER" ||
      lead.notes?.includes("[Type: SUPPLIER]") ||
      lead.name.toLowerCase().includes("supplier") ||
      lead.company.toLowerCase().includes("supplier") ||
      lead.notes?.toLowerCase().includes("sell") ||
      lead.notes?.toLowerCase().includes("stock") ||
      lead.notes?.toLowerCase().includes("supply") ||
      lead.notes?.toLowerCase().includes("fruit") ||
      lead.notes?.toLowerCase().includes("farmer") ||
      lead.notes?.toLowerCase().includes("mill") ||
      lead.notes?.toLowerCase().includes("processor") ||
      lead.notes?.toLowerCase().includes("vendor") ||
      lead.notes?.toLowerCase().includes("producer");
    const initialType: "BUYER" | "SUPPLIER" = isSupplier ? "SUPPLIER" : "BUYER";
    setConvertTargetType(initialType);
    setConvertCompanyName(lead.company);
    const country = lead.country || "India";
    setConvertCountry(country);

    // Buyer Defaults
    const cLower = country.toLowerCase();
    const defaultPort =
      cLower.includes("uae") || cLower.includes("emirates")
        ? "Jebel Ali Port (UAE)"
        : cLower.includes("nepal")
          ? "Birgunj Dry Port (Nepal)"
          : cLower.includes("ghana")
            ? "Tema Port (Ghana)"
            : cLower.includes("netherlands")
              ? "Port of Rotterdam"
              : cLower.includes("germany")
                ? "Port of Hamburg"
                : cLower.includes("singapore")
                  ? "Jurong Port (Singapore)"
                  : "Port of Rotterdam";
    setConvertDestPort(defaultPort);
    setConvertPaymentTerms("30 Days Net");
    const code =
      country
        .slice(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, "X") || "GLB";
    setConvertAccountNumber(
      `ACC-${code}-${Math.floor(100 + Math.random() * 900)}`,
    );

    // Supplier Defaults
    setConvertSupplierState("Gujarat");
    setConvertSupplierCity(isSupplier ? "Nashik / Rajkot" : "Unjha");
    const rawNotes = lead.notes?.replace(/\[[^\]]+\]/g, "").trim();
    setConvertSupplierCommodities(
      rawNotes || "Fresh Produce, Spices & Agro Commodities",
    );
    setConvertSupplierPaymentTerms("15 Days Credit");
    const supPrefix = country.slice(0, 2).toUpperCase() || "IN";
    setConvertSupplierCode(
      `SUP-${supPrefix}-${Math.floor(100 + Math.random() * 900)}`,
    );
    setConvertSupplierRating(4.8);

    setShowConvertModal(true);
  };

  const handleConfirmConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;
    setIsConverting(true);
    try {
      const payload =
        convertTargetType === "BUYER"
          ? {
              targetType: "BUYER",
              companyName: convertCompanyName,
              country: convertCountry,
              destinationPort: convertDestPort,
              paymentTerms: convertPaymentTerms,
              accountNumber: convertAccountNumber,
            }
          : {
              targetType: "SUPPLIER",
              companyName: convertCompanyName,
              country: convertCountry,
              state: convertSupplierState,
              location: convertSupplierCity,
              commodities: convertSupplierCommodities,
              paymentTerms: convertSupplierPaymentTerms,
              supplierCode: convertSupplierCode,
              rating: convertSupplierRating,
            };

      const res = await fetch(
        `/api/v1/crm/leads/${convertingLead.id}/convert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        setShowConvertModal(false);
        const compName = convertCompanyName;
        const isBuyer = convertTargetType === "BUYER";
        setConvertingLead(null);
        if (drawerLead && drawerLead.id === convertingLead.id) {
          setDrawerLead(null);
        }
        await fetchCrmData();

        if (isBuyer) {
          setActiveTab("accounts");
          setSearchQuery(compName);
        } else {
          alert(
            `✓ Lead successfully converted to Sourcing Partner "${compName}" (${convertSupplierCode}) in Procurement!`,
          );
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to convert lead");
      }
    } catch (err) {
      console.error("Lead conversion failed:", err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDirectUpdateLeadStatus = async (
    leadId: string,
    newStatus: Lead["status"],
  ) => {
    if (newStatus === "CONVERTED") {
      const targetLead =
        leads.find((l) => l.id === leadId) ||
        (drawerLead?.id === leadId ? drawerLead : null);
      if (targetLead) {
        handleOpenConvertModal(targetLead);
        return;
      }
    }

    try {
      const res = await fetch(`/api/v1/crm/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCrmData();
        if (drawerLead && drawerLead.id === leadId) {
          setDrawerLead((prev) =>
            prev ? { ...prev, status: newStatus } : null,
          );
        }
      }
    } catch (err) {
      console.error("Failed to update lead status:", err);
    }
  };

  const handleAdvanceStatus = async (leadId: string, currentStatus: string) => {
    if (currentStatus === "QUALIFIED") {
      const targetLead =
        leads.find((l) => l.id === leadId) ||
        (drawerLead?.id === leadId ? drawerLead : null);
      if (targetLead) {
        handleOpenConvertModal(targetLead);
        return;
      }
    }

    let nextStatus: Lead["status"] = "CONTACTED";
    if (currentStatus === "NEW") nextStatus = "CONTACTED";
    else if (currentStatus === "CONTACTED") nextStatus = "QUALIFIED";

    await handleDirectUpdateLeadStatus(leadId, nextStatus);
  };

  const handleOpenEditLead = (lead: Lead) => {
    setEditingLead({ ...lead });
    setShowEditLeadModal(true);
  };

  const handleSaveEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    try {
      const res = await fetch(`/api/v1/crm/leads/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLead),
      });
      if (res.ok) {
        setShowEditLeadModal(false);
        const saved = await res.json();
        const updatedLead = saved.lead || editingLead;
        setEditingLead(null);
        await fetchCrmData();
        if (drawerLead && drawerLead.id === updatedLead.id) {
          setDrawerLead(updatedLead);
        }
      }
    } catch (err) {
      console.error("Failed to update lead:", err);
    }
  };

  const handleDeleteLead = async (leadId: string, company: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete lead from "${company}"? This cannot be undone.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/v1/crm/leads/${leadId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (drawerLead && drawerLead.id === leadId) {
          setDrawerLead(null);
        }
        await fetchCrmData();
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const handleUpdateAccountStatus = async (
    accId: string,
    newStatus: Account["status"],
  ) => {
    try {
      const res = await fetch(`/api/v1/crm/accounts/${accId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCrmData();
        if (drawerAccount && drawerAccount.id === accId) {
          setDrawerAccount((prev) =>
            prev ? { ...prev, status: newStatus } : null,
          );
        }
      }
    } catch (err) {
      console.error("Failed to update account status:", err);
    }
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount({ ...acc });
    setShowEditAccountModal(true);
  };

  const handleSaveEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      const res = await fetch(`/api/v1/crm/accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAccount),
      });
      if (res.ok) {
        setShowEditAccountModal(false);
        const saved = await res.json();
        const updatedAcc = saved.account || editingAccount;
        setEditingAccount(null);
        await fetchCrmData();
        if (drawerAccount && drawerAccount.id === updatedAcc.id) {
          setDrawerAccount(updatedAcc);
        }
      }
    } catch (err) {
      console.error("Failed to update account:", err);
    }
  };

  const handleDeleteAccount = async (accId: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete buyer account "${name}"? This cannot be undone.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/v1/crm/accounts/${accId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (drawerAccount && drawerAccount.id === accId) {
          setDrawerAccount(null);
        }
        await fetchCrmData();
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
    }
  };

  const handleBatchAdvanceLeads = async () => {
    for (const id of selectedLeadIds) {
      const lead = leads.find((l) => l.id === id);
      if (lead && lead.status !== "CONVERTED") {
        await handleAdvanceStatus(lead.id, lead.status);
      }
    }
    setSelectedLeadIds([]);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCompany =
      newLeadType === "SUPPLIER"
        ? (customBuyerName || name || "Sourcing Vendor LLP").trim()
        : isOtherBuyer
          ? customBuyerName.trim()
          : selectedBuyer;
    if (!finalCompany) return;

    try {
      const res = await fetch("/api/v1/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company: finalCompany,
          email,
          phone,
          country: country.trim() || "India",
          source,
          notes,
          status: "NEW",
          leadType: newLeadType,
        }),
      });
      if (res.ok) {
        setShowAddLeadModal(false);
        setName("");
        setCustomBuyerName("");
        setIsOtherBuyer(false);
        setEmail("");
        setPhone("");
        setNotes("");
        setNewLeadType("BUYER");
        fetchCrmData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accName,
          country: accCountry,
          destinationPort: destPort,
          paymentTerms,
        }),
      });
      if (res.ok) {
        setShowAddAccountModal(false);
        setAccName("");
        fetchCrmData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sort toggle handlers
  const handleSortLead = (field: LeadSortField) => {
    if (leadSortField === field) {
      setLeadSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setLeadSortField(field);
      setLeadSortDir("asc");
    }
  };

  const handleSortAccount = (field: AccountSortField) => {
    if (accSortField === field) {
      setAccSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setAccSortField(field);
      setAccSortDir("asc");
    }
  };

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((l) => {
        const matchesStatus =
          statusFilter === "ALL"
            ? true
            : statusFilter === "BUYER"
              ? l.leadType !== "SUPPLIER"
              : statusFilter === "SUPPLIER"
                ? l.leadType === "SUPPLIER"
                : l.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q) ||
          l.notes.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA: string | number =
          leadSortField === "date"
            ? new Date(a.date).getTime() || 0
            : a[leadSortField] || "";
        const valB: string | number =
          leadSortField === "date"
            ? new Date(b.date).getTime() || 0
            : b[leadSortField] || "";
        if (valA < valB) return leadSortDir === "asc" ? -1 : 1;
        if (valA > valB) return leadSortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [leads, statusFilter, searchQuery, leadSortField, leadSortDir]);

  // Filtered & Sorted Accounts
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((a) => {
        const matchesStatus =
          statusFilter === "ALL" || a.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          a.accountNumber.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q) ||
          a.destinationPort.toLowerCase().includes(q) ||
          a.paymentTerms.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[accSortField];
        const valB = b[accSortField];
        if (valA < valB) return accSortDir === "asc" ? -1 : 1;
        if (valA > valB) return accSortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [accounts, statusFilter, searchQuery, accSortField, accSortDir]);

  // Selection Checkbox helpers
  const handleToggleSelectAllLeads = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAllAccounts = () => {
    if (selectedAccIds.length === filteredAccounts.length) {
      setSelectedAccIds([]);
    } else {
      setSelectedAccIds(filteredAccounts.map((a) => a.id));
    }
  };

  const handleToggleAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAccIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // CSV Exports
  const handleExportLeadsCsv = () => {
    exportToCsv(
      "polybridge-leads-pipeline",
      filteredLeads as unknown as Record<string, unknown>[],
      [
        { key: "name", header: "Contact Person" },
        { key: "company", header: "Company" },
        { key: "country", header: "Country" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Phone" },
        { key: "source", header: "Lead Source" },
        { key: "status", header: "Status" },
        { key: "notes", header: "Inquiry Notes" },
        { key: "date", header: "Received Date" },
      ],
    );
  };

  const handleExportAccountsCsv = () => {
    exportToCsv(
      "polybridge-verified-buyers",
      filteredAccounts as unknown as Record<string, unknown>[],
      [
        { key: "accountNumber", header: "Account #" },
        { key: "name", header: "Buyer Company Name" },
        { key: "country", header: "Country" },
        { key: "destinationPort", header: "Destination Port" },
        { key: "paymentTerms", header: "Payment Terms" },
        { key: "totalOrdersValue", header: "Total Orders ($ USD)" },
        { key: "status", header: "Status" },
      ],
    );
  };

  // Filter chips configuration
  const leadFilterOptions = [
    { id: "ALL", label: "All Inquiries", count: leads.length },
    {
      id: "BUYER",
      label: "🏢 Buyers",
      count: leads.filter((l) => l.leadType !== "SUPPLIER").length,
    },
    {
      id: "SUPPLIER",
      label: "🏭 Suppliers",
      count: leads.filter((l) => l.leadType === "SUPPLIER").length,
    },
    {
      id: "NEW",
      label: "New",
      count: leads.filter((l) => l.status === "NEW").length,
    },
    {
      id: "QUALIFIED",
      label: "Qualified",
      count: leads.filter((l) => l.status === "QUALIFIED").length,
    },
    {
      id: "CONVERTED",
      label: "Converted",
      count: leads.filter((l) => l.status === "CONVERTED").length,
    },
  ];

  const accountFilterOptions = [
    { id: "ALL", label: "All Buyers", count: accounts.length },
    {
      id: "ACTIVE",
      label: "Active Trade",
      count: accounts.filter((a) => a.status === "ACTIVE").length,
    },
    {
      id: "ON_HOLD",
      label: "On Hold",
      count: accounts.filter((a) => a.status === "ON_HOLD").length,
    },
  ];

  // Helper render sort arrow
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
      {/* Module Controls Bar (Tabs & Primary Action) */}
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
              setActiveTab("leads");
              setStatusFilter("ALL");
              setSearchQuery("");
            }}
            className={`segmented-btn ${activeTab === "leads" ? "active" : ""}`}
          >
            <span>Leads & Inquiries</span>
            <span className="segmented-btn-count">{leads.length}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("accounts");
              setStatusFilter("ALL");
              setSearchQuery("");
            }}
            className={`segmented-btn ${activeTab === "accounts" ? "active" : ""}`}
          >
            <span>Verified Buyers</span>
            <span className="segmented-btn-count">{accounts.length}</span>
          </button>
        </div>

        {activeTab === "leads" ? (
          <button
            onClick={() => {
              const firstAcc = accounts[0];
              if (firstAcc) {
                setSelectedBuyer(firstAcc.name);
                setCountry(firstAcc.country);
                setIsOtherBuyer(false);
              } else {
                setIsOtherBuyer(true);
              }
              setCustomBuyerName("");
              setShowAddLeadModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Add Trade Lead</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Create Buyer Account</span>
          </button>
        )}
      </div>

      {/* Main Table Container Card */}
      <div className="table-card">
        {/* Interactive Toolbar */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeTab === "leads"
              ? "Search by name, company, country, email, notes..."
              : "Search by account #, company, country, port..."
          }
          filterOptions={
            activeTab === "leads" ? leadFilterOptions : accountFilterOptions
          }
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onExportCsv={
            activeTab === "leads"
              ? handleExportLeadsCsv
              : handleExportAccountsCsv
          }
          selectedCount={
            activeTab === "leads"
              ? selectedLeadIds.length
              : selectedAccIds.length
          }
          onClearSelection={() =>
            activeTab === "leads"
              ? setSelectedLeadIds([])
              : setSelectedAccIds([])
          }
          selectionActions={
            activeTab === "leads" ? (
              <button
                onClick={handleBatchAdvanceLeads}
                className="btn btn-xs btn-primary"
              >
                <CheckCircle size={13} />
                <span>Advance Selected Leads</span>
              </button>
            ) : null
          }
        />

        {/* Active Tab: LEADS TABLE */}
        {activeTab === "leads" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-checkbox-cell">
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={
                        filteredLeads.length > 0 &&
                        selectedLeadIds.length === filteredLeads.length
                      }
                      onChange={handleToggleSelectAllLeads}
                      aria-label="Select all leads"
                    />
                  </th>
                  <th
                    className={`th-sortable ${leadSortField === "name" ? "sorted" : ""}`}
                    onClick={() => handleSortLead("name")}
                  >
                    Contact Person{" "}
                    {renderSortIndicator(leadSortField, "name", leadSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${leadSortField === "company" ? "sorted" : ""}`}
                    onClick={() => handleSortLead("company")}
                  >
                    Company & Country{" "}
                    {renderSortIndicator(leadSortField, "company", leadSortDir)}
                  </th>
                  <th>Channels & Contact</th>
                  <th
                    className={`th-sortable ${leadSortField === "source" ? "sorted" : ""}`}
                    onClick={() => handleSortLead("source")}
                  >
                    Source{" "}
                    {renderSortIndicator(leadSortField, "source", leadSortDir)}
                  </th>
                  <th>Commodity Inquiry Notes</th>
                  <th
                    className={`th-sortable ${leadSortField === "status" ? "sorted" : ""}`}
                    onClick={() => handleSortLead("status")}
                  >
                    Status{" "}
                    {renderSortIndicator(leadSortField, "status", leadSortDir)}
                  </th>
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
                          Loading prospective trade leads from database...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty-state">
                        <div className="table-empty-state-icon">
                          <Users size={24} />
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          No leads match your criteria
                        </h4>
                        <p style={{ margin: 0, fontSize: "0.825rem" }}>
                          Try adjusting your search terms or status filters.
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("ALL");
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ marginTop: "0.5rem" }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l) => {
                    const isSelected = selectedLeadIds.includes(l.id);
                    return (
                      <tr
                        key={l.id}
                        className={`clickable-row ${isSelected ? "selected-row" : ""}`}
                        onClick={() => setDrawerLead(l)}
                      >
                        <td
                          className="table-checkbox-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleToggleLead(
                                l.id,
                                e as unknown as React.MouseEvent,
                              )
                            }
                            aria-label={`Select ${l.name}`}
                          />
                        </td>
                        <td>
                          <div className="cell-primary">{l.name}</div>
                          <div
                            className="cell-secondary"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Calendar size={12} color="var(--text-muted)" />
                            <span>Received {l.date}</span>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {l.company}
                            </span>
                            <span
                              className={`badge ${l.leadType === "SUPPLIER" ? "badge-success" : "badge-info"}`}
                              style={{
                                fontSize: "0.65rem",
                                padding: "1px 6px",
                              }}
                            >
                              {l.leadType === "SUPPLIER"
                                ? "🏭 Supplier"
                                : "🏢 Buyer"}
                            </span>
                          </div>
                          <div
                            className="cell-secondary"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Globe size={12} color="var(--text-muted)" />
                            <span>{l.country}</span>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <a
                              href={`mailto:${l.email}`}
                              className="channel-pill"
                              onClick={(e) => e.stopPropagation()}
                              title={`Email ${l.email}`}
                            >
                              <Mail size={13} color="var(--primary-light)" />
                              <span
                                style={{ textDecoration: "underline dotted" }}
                              >
                                {l.email}
                              </span>
                            </a>
                            <a
                              href={`tel:${l.phone}`}
                              className="channel-pill"
                              onClick={(e) => e.stopPropagation()}
                              title={`Call ${l.phone}`}
                            >
                              <Phone size={13} color="var(--success)" />
                              <span>{l.phone}</span>
                            </a>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-subtle">{l.source}</span>
                        </td>
                        <td>
                          <div
                            style={{
                              maxWidth: "300px",
                              fontSize: "0.825rem",
                              color: "var(--text-secondary)",
                              lineHeight: 1.4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={l.notes}
                          >
                            {l.notes}
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="status-select-wrapper">
                            <select
                              value={l.status}
                              onChange={(e) =>
                                handleDirectUpdateLeadStatus(
                                  l.id,
                                  e.target.value as Lead["status"],
                                )
                              }
                              className={`status-select-pill ${
                                l.status === "QUALIFIED"
                                  ? "badge-success"
                                  : l.status === "CONTACTED"
                                    ? "badge-info"
                                    : l.status === "CONVERTED"
                                      ? "badge-primary"
                                      : "badge-warning"
                              }`}
                              title="Click to change status"
                            >
                              <option value="NEW">● NEW</option>
                              <option value="CONTACTED">● CONTACTED</option>
                              <option value="QUALIFIED">● QUALIFIED</option>
                              <option value="CONVERTED">● CONVERTED</option>
                            </select>
                          </div>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            paddingRight: "1.25rem",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "0.35rem",
                            }}
                          >
                            {l.status !== "CONVERTED" ? (
                              <button
                                onClick={() =>
                                  l.status === "QUALIFIED"
                                    ? handleOpenConvertModal(l)
                                    : handleAdvanceStatus(l.id, l.status)
                                }
                                className={`btn btn-sm ${
                                  l.status === "QUALIFIED"
                                    ? "btn-primary"
                                    : l.status === "CONTACTED"
                                      ? "btn-outline"
                                      : "btn-outline"
                                }`}
                                title={`Advance status from ${l.status}`}
                              >
                                <CheckCircle size={14} />
                                <span>
                                  {l.status === "NEW"
                                    ? "Contact"
                                    : l.status === "CONTACTED"
                                      ? "Qualify"
                                      : "Convert"}
                                </span>
                              </button>
                            ) : l.convertedType === "SUPPLIER" ? (
                              <span
                                className="badge badge-success"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.72rem",
                                  padding: "3px 7px",
                                }}
                                title={`Converted to Sourcing Partner: ${l.convertedSupplierCode || "Procurement"}`}
                              >
                                <Factory size={12} />
                                <span>Supplier</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveTab("accounts");
                                  setSearchQuery(l.company);
                                }}
                                className="btn btn-xs btn-outline"
                                style={{
                                  color: "var(--primary-light)",
                                  borderColor: "var(--primary-light)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="View Verified Buyer Account"
                              >
                                <ExternalLink size={12} />
                                <span>Buyer</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditLead(l)}
                              className="btn btn-sm btn-ghost btn-icon"
                              title="Edit lead"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteLead(l.id, l.company)}
                              className="btn btn-sm btn-ghost btn-icon"
                              style={{ color: "var(--danger)" }}
                              title="Delete lead"
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              onClick={() => setDrawerLead(l)}
                              className="btn btn-sm btn-ghost btn-icon"
                              title="Inspect lead details"
                            >
                              <ChevronRight size={16} />
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
        )}

        {/* Active Tab: ACCOUNTS TABLE */}
        {activeTab === "accounts" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-checkbox-cell">
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={
                        filteredAccounts.length > 0 &&
                        selectedAccIds.length === filteredAccounts.length
                      }
                      onChange={handleToggleSelectAllAccounts}
                      aria-label="Select all buyer accounts"
                    />
                  </th>
                  <th
                    className={`th-sortable ${accSortField === "accountNumber" ? "sorted" : ""}`}
                    onClick={() => handleSortAccount("accountNumber")}
                  >
                    Account #{" "}
                    {renderSortIndicator(
                      accSortField,
                      "accountNumber",
                      accSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${accSortField === "name" ? "sorted" : ""}`}
                    onClick={() => handleSortAccount("name")}
                  >
                    Buyer Company{" "}
                    {renderSortIndicator(accSortField, "name", accSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${accSortField === "destinationPort" ? "sorted" : ""}`}
                    onClick={() => handleSortAccount("destinationPort")}
                  >
                    Destination Port{" "}
                    {renderSortIndicator(
                      accSortField,
                      "destinationPort",
                      accSortDir,
                    )}
                  </th>
                  <th>Payment Terms</th>
                  <th
                    className={`th-sortable ${accSortField === "totalOrdersValue" ? "sorted" : ""}`}
                    onClick={() => handleSortAccount("totalOrdersValue")}
                  >
                    Cumulative Orders{" "}
                    {renderSortIndicator(
                      accSortField,
                      "totalOrdersValue",
                      accSortDir,
                    )}
                  </th>
                  <th
                    className={`th-sortable ${accSortField === "status" ? "sorted" : ""}`}
                    onClick={() => handleSortAccount("status")}
                  >
                    Status{" "}
                    {renderSortIndicator(accSortField, "status", accSortDir)}
                  </th>
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
                          Loading buyer corporate accounts from database...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
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
                          No buyer accounts match your criteria
                        </h4>
                        <p style={{ margin: 0, fontSize: "0.825rem" }}>
                          Try adjusting your search query or filter.
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("ALL");
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ marginTop: "0.5rem" }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((a) => {
                    const isSelected = selectedAccIds.includes(a.id);
                    return (
                      <tr
                        key={a.id}
                        className={`clickable-row ${isSelected ? "selected-row" : ""}`}
                        onClick={() => setDrawerAccount(a)}
                      >
                        <td
                          className="table-checkbox-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleToggleAccount(
                                a.id,
                                e as unknown as React.MouseEvent,
                              )
                            }
                            aria-label={`Select ${a.name}`}
                          />
                        </td>
                        <td className="cell-code">{a.accountNumber}</td>
                        <td>
                          <div className="cell-primary">{a.name}</div>
                          <div
                            className="cell-secondary"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Globe size={12} color="var(--text-muted)" />
                            <span>{a.country}</span>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "var(--text-primary)",
                            }}
                          >
                            <Globe size={14} color="var(--primary-light)" />
                            <span style={{ fontWeight: 500 }}>
                              {a.destinationPort}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-subtle">
                            {a.paymentTerms}
                          </span>
                        </td>
                        <td className="cell-amount">
                          ${a.totalOrdersValue.toLocaleString()} USD
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="status-select-wrapper">
                            <select
                              value={a.status}
                              onChange={(e) =>
                                handleUpdateAccountStatus(
                                  a.id,
                                  e.target.value as Account["status"],
                                )
                              }
                              className={`status-select-pill ${a.status === "ACTIVE" ? "badge-success" : "badge-warning"}`}
                              title="Click to change status"
                            >
                              <option value="ACTIVE">● ACTIVE</option>
                              <option value="ON_HOLD">● ON_HOLD</option>
                            </select>
                          </div>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            paddingRight: "1.25rem",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "0.35rem",
                            }}
                          >
                            <button
                              onClick={() => handleOpenEditAccount(a)}
                              className="btn btn-sm btn-ghost btn-icon"
                              title="Edit account"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(a.id, a.name)}
                              className="btn btn-sm btn-ghost btn-icon"
                              style={{ color: "var(--danger)" }}
                              title="Delete account"
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              onClick={() => setDrawerAccount(a)}
                              className="btn btn-sm btn-outline"
                              title="Inspect dossier"
                            >
                              <span>Inspect</span>
                              <ChevronRight size={14} />
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
        )}

        {/* Table Footer */}
        <div className="table-footer">
          <span>
            Showing{" "}
            {activeTab === "leads"
              ? filteredLeads.length
              : filteredAccounts.length}{" "}
            of {activeTab === "leads" ? leads.length : accounts.length} records
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Tip: Click any row to view complete dossier and execution controls.
          </span>
        </div>
      </div>

      {/* LEAD DETAIL SLIDE-OVER DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerLead)}
        onClose={() => setDrawerLead(null)}
        title={drawerLead?.name || "Trade Inquiry Dossier"}
        subtitle={`Received on ${drawerLead?.date} • ID: ${drawerLead?.id}`}
        badge={
          drawerLead ? (
            <span
              className={`badge ${
                drawerLead.status === "QUALIFIED"
                  ? "badge-success"
                  : drawerLead.status === "CONTACTED"
                    ? "badge-info"
                    : drawerLead.status === "CONVERTED"
                      ? "badge-primary"
                      : "badge-warning"
              }`}
            >
              <span className="badge-dot" />
              {drawerLead.status}
            </span>
          ) : null
        }
        footer={
          drawerLead ? (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleOpenEditLead(drawerLead)}
                  title="Edit full lead details"
                >
                  <Pencil size={14} />
                  <span>Edit Lead</span>
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: "var(--danger)" }}
                  onClick={() =>
                    handleDeleteLead(drawerLead.id, drawerLead.company)
                  }
                  title="Delete lead record"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    window.location.href = `mailto:${drawerLead.email}?subject=Polybridge Ventures Trade Inquiry - ${encodeURIComponent(drawerLead.company)}`;
                  }}
                >
                  <Send size={14} />
                  <span>Email</span>
                </button>
                {drawerLead.status !== "CONVERTED" ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      drawerLead.status === "QUALIFIED"
                        ? handleOpenConvertModal(drawerLead)
                        : handleAdvanceStatus(drawerLead.id, drawerLead.status)
                    }
                  >
                    <CheckCircle size={14} />
                    <span>
                      {drawerLead.status === "NEW"
                        ? "Contact"
                        : drawerLead.status === "CONTACTED"
                          ? "Qualify"
                          : "Convert Lead"}
                    </span>
                  </button>
                ) : drawerLead.convertedType === "SUPPLIER" ? (
                  <span
                    className="badge badge-success"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      fontSize: "0.825rem",
                    }}
                  >
                    <Factory size={14} />
                    <span>
                      Sourcing Partner (
                      {drawerLead.convertedSupplierCode || "Procurement"})
                    </span>
                  </span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onClick={() => {
                      const comp = drawerLead.company;
                      setDrawerLead(null);
                      setActiveTab("accounts");
                      setSearchQuery(comp);
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>View Verified Partner</span>
                  </button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {drawerLead && (
          <>
            {/* Status Workflow Progression */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <CheckCircle size={14} color="var(--primary-light)" />
                Pipeline Stage Progression
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                {(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"] as const).map(
                  (step, idx) => {
                    const stepIndex = [
                      "NEW",
                      "CONTACTED",
                      "QUALIFIED",
                      "CONVERTED",
                    ].indexOf(drawerLead.status);
                    const isDone = idx <= stepIndex;
                    const isCurrent = idx === stepIndex;
                    return (
                      <div
                        key={step}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          zIndex: 2,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: isCurrent
                              ? "var(--primary)"
                              : isDone
                                ? "var(--success)"
                                : "var(--bg-tertiary)",
                            color: isDone ? "#fff" : "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            border: isCurrent
                              ? "2px solid var(--primary-light)"
                              : "none",
                          }}
                        >
                          {idx + 1}
                        </div>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            marginTop: "4px",
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent
                              ? "var(--primary-light)"
                              : isDone
                                ? "var(--text-primary)"
                                : "var(--text-muted)",
                          }}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Buyer & Commercial Entity */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Building size={14} color="var(--primary-light)" />
                Commercial Entity & Geography
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Company Name</span>
                  <span className="drawer-stat-value">
                    {drawerLead.company}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Country & Market</span>
                  <span
                    className="drawer-stat-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Globe size={14} color="var(--primary-light)" />
                    {drawerLead.country}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Direct Contact</span>
                  <span className="drawer-stat-value">{drawerLead.name}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Acquisition Channel</span>
                  <span className="drawer-stat-value">
                    <span className="badge badge-subtle">
                      {drawerLead.source}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Communication Channels */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Phone size={14} color="var(--primary-light)" />
                Direct Communication Channels
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                    }}
                  >
                    <Mail size={16} color="var(--primary-light)" />
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {drawerLead.email}
                    </span>
                  </div>
                  <a
                    href={`mailto:${drawerLead.email}`}
                    className="btn btn-xs btn-outline"
                  >
                    Send Email <ExternalLink size={12} />
                  </a>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                    }}
                  >
                    <Phone size={16} color="var(--success)" />
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {drawerLead.phone}
                    </span>
                  </div>
                  <a
                    href={`tel:${drawerLead.phone}`}
                    className="btn btn-xs btn-outline"
                  >
                    Dial Direct <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Commodity Requirements */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <FileText size={14} color="var(--primary-light)" />
                Commodity Specifications & Buyer Notes
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
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {drawerLead.notes}
              </p>
            </div>
          </>
        )}
      </DetailDrawer>

      {/* ACCOUNT DETAIL SLIDE-OVER DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerAccount)}
        onClose={() => setDrawerAccount(null)}
        title={drawerAccount?.name || "Verified Buyer Dossier"}
        subtitle={`Account: ${drawerAccount?.accountNumber} • ${drawerAccount?.country}`}
        badge={
          drawerAccount ? (
            <span
              className={`badge ${drawerAccount.status === "ACTIVE" ? "badge-success" : "badge-warning"}`}
            >
              <span className="badge-dot" />
              {drawerAccount.status}
            </span>
          ) : null
        }
        footer={
          drawerAccount ? (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleOpenEditAccount(drawerAccount)}
                >
                  <Pencil size={14} />
                  <span>Edit Account</span>
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: "var(--danger)" }}
                  onClick={() =>
                    handleDeleteAccount(drawerAccount.id, drawerAccount.name)
                  }
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                  handleUpdateAccountStatus(
                    drawerAccount.id,
                    drawerAccount.status === "ACTIVE" ? "ON_HOLD" : "ACTIVE",
                  )
                }
              >
                <span>
                  {drawerAccount.status === "ACTIVE"
                    ? "Put On Hold"
                    : "Activate Account"}
                </span>
              </button>
            </div>
          ) : undefined
        }
      >
        {drawerAccount && (
          <>
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Building size={14} color="var(--primary-light)" />
                B2B Verified Account Profile
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Account Code</span>
                  <span className="drawer-stat-value cell-code">
                    {drawerAccount.accountNumber}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Country of Origin</span>
                  <span className="drawer-stat-value">
                    {drawerAccount.country}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Destination Discharge Port
                  </span>
                  <span className="drawer-stat-value">
                    {drawerAccount.destinationPort}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Credit & Payment Terms
                  </span>
                  <span className="drawer-stat-value">
                    <span className="badge badge-subtle">
                      {drawerAccount.paymentTerms}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">
                <UserCheck size={14} color="var(--primary-light)" />
                Commercial Trade Performance
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    Total Cumulative Orders
                  </span>
                  <span
                    className="drawer-stat-value cell-amount"
                    style={{
                      fontSize: "1.2rem",
                      color: "var(--primary-light)",
                    }}
                  >
                    ${drawerAccount.totalOrdersValue.toLocaleString()} USD
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">
                    KYC / ASVS Verification
                  </span>
                  <span className="drawer-stat-value">
                    <span className="badge badge-success">Verified Active</span>
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </DetailDrawer>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
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
                Add Commercial Trade Lead
              </h3>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowAddLeadModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAddLead}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Lead Inquiry Classification */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    marginBottom: "0.4rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Trade Inquiry Classification *
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.6rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setNewLeadType("BUYER")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-md)",
                      border:
                        newLeadType === "BUYER"
                          ? "2px solid var(--primary-light)"
                          : "1px solid var(--border-medium)",
                      background:
                        newLeadType === "BUYER"
                          ? "rgba(56, 189, 248, 0.15)"
                          : "var(--bg-secondary)",
                      color:
                        newLeadType === "BUYER"
                          ? "#fff"
                          : "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Building
                      size={16}
                      color={
                        newLeadType === "BUYER"
                          ? "var(--primary-light)"
                          : "var(--text-muted)"
                      }
                    />
                    <span>🏢 Buyer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewLeadType("SUPPLIER")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-md)",
                      border:
                        newLeadType === "SUPPLIER"
                          ? "2px solid var(--success)"
                          : "1px solid var(--border-medium)",
                      background:
                        newLeadType === "SUPPLIER"
                          ? "rgba(34, 197, 94, 0.15)"
                          : "var(--bg-secondary)",
                      color:
                        newLeadType === "SUPPLIER"
                          ? "#fff"
                          : "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Factory
                      size={16}
                      color={
                        newLeadType === "SUPPLIER"
                          ? "var(--success)"
                          : "var(--text-muted)"
                      }
                    />
                    <span>🏭 Supplier (Vendor / Mill)</span>
                  </button>
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
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Mansoor"
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
                    {newLeadType === "BUYER"
                      ? "Buyer Company Legal Name *"
                      : "Supplier / Mill Legal Name *"}
                  </label>
                  {newLeadType === "BUYER" ? (
                    <select
                      value={isOtherBuyer ? "__OTHER__" : selectedBuyer}
                      onChange={(e) => handleBuyerChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.55rem",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <optgroup label="Verified Existing Buyers">
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.name}>
                            {acc.name} ({acc.country})
                          </option>
                        ))}
                      </optgroup>
                      <option value="__OTHER__">
                        ✨ + Other (Enter New Buyer Manually)
                      </option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gujarat Spice Processors LLP"
                      value={customBuyerName}
                      onChange={(e) => setCustomBuyerName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.55rem",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--success)",
                        borderRadius: "var(--radius-md)",
                      }}
                    />
                  )}
                  {newLeadType === "BUYER" && !isOtherBuyer && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--success)",
                        marginTop: "0.3rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>✓ Verified Buyer Selected</span>
                    </div>
                  )}
                </div>
              </div>

              {newLeadType === "BUYER" && isOtherBuyer && (
                <div style={{ animation: "fadeIn 0.2s ease" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                      color: "var(--primary-light)",
                    }}
                  >
                    Type New Buyer Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gulf Commodities Trading LLC"
                    value={customBuyerName}
                    onChange={(e) => setCustomBuyerName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--primary)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>
              )}

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
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. tariq@gulfcommodities.ae"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +971 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
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
                    Inquiry Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <option value="Website Contact Form">
                      Website Contact Form
                    </option>
                    <option value="Direct Trade Inquiry">
                      Direct Trade Inquiry
                    </option>
                    <option value="Dubai Trade Fair (Gulfood)">
                      Dubai Trade Fair (Gulfood)
                    </option>
                    <option value="Partner Referral">Partner Referral</option>
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
                  Commodity Requirements / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Inquiring for 2 FCL Turmeric Whole Salem & Cumin Seeds Machine Cleaned CIF Jebel Ali"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  onClick={() => setShowAddLeadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
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
          <div className="card" style={{ maxWidth: "500px", width: "100%" }}>
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
                Create Verified Buyer Account
              </h3>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowAddAccountModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAddAccount}
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
                  Company / Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nordic Spices & Produce AS"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
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
                    Country
                  </label>
                  <input
                    type="text"
                    value={accCountry}
                    onChange={(e) => setAccCountry(e.target.value)}
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
                    Destination Port
                  </label>
                  <input
                    type="text"
                    value={destPort}
                    onChange={(e) => setDestPort(e.target.value)}
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
                  Agreed Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
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
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddAccountModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditLeadModal && editingLead && (
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
          <div
            className="card"
            style={{
              maxWidth: "540px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
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
                  Edit Commercial Trade Lead
                </h3>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowEditLeadModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveEditLead}
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
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLead.name}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, name: e.target.value })
                    }
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
                    {editingLead.leadType === "SUPPLIER"
                      ? "Supplier / Mill Legal Name *"
                      : "Buyer Company Legal Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLead.company}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        company: e.target.value,
                      })
                    }
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
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editingLead.email}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, email: e.target.value })
                    }
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
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editingLead.phone}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, phone: e.target.value })
                    }
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
                    Country
                  </label>
                  <input
                    type="text"
                    value={editingLead.country}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        country: e.target.value,
                      })
                    }
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
                    Pipeline Status
                  </label>
                  <select
                    value={editingLead.status}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        status: e.target.value as Lead["status"],
                      })
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
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="CONVERTED">CONVERTED</option>
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
                  Inquiry Source
                </label>
                <select
                  value={editingLead.source}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, source: e.target.value })
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
                  <option value="Website Contact Form">
                    Website Contact Form
                  </option>
                  <option value="Direct Trade Inquiry">
                    Direct Trade Inquiry
                  </option>
                  <option value="Dubai Trade Fair (Gulfood)">
                    Dubai Trade Fair (Gulfood)
                  </option>
                  <option value="Partner Referral">Partner Referral</option>
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
                  Commodity Requirements / Notes
                </label>
                <textarea
                  rows={3}
                  value={editingLead.notes}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, notes: e.target.value })
                  }
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
                  onClick={() => setShowEditLeadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditAccountModal && editingAccount && (
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
          <div className="card" style={{ maxWidth: "500px", width: "100%" }}>
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
                  Edit Buyer Account
                </h3>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowEditAccountModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveEditAccount}
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
                  Company / Account Name
                </label>
                <input
                  type="text"
                  required
                  value={editingAccount.name}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      name: e.target.value,
                    })
                  }
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
                    Country
                  </label>
                  <input
                    type="text"
                    value={editingAccount.country}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        country: e.target.value,
                      })
                    }
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
                    Destination Port
                  </label>
                  <input
                    type="text"
                    value={editingAccount.destinationPort}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        destinationPort: e.target.value,
                      })
                    }
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
                    Agreed Payment Terms
                  </label>
                  <input
                    type="text"
                    value={editingAccount.paymentTerms}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        paymentTerms: e.target.value,
                      })
                    }
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
                    Account Status
                  </label>
                  <select
                    value={editingAccount.status}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        status: e.target.value as Account["status"],
                      })
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
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
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
                  onClick={() => setShowEditAccountModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Convert Lead to Partner Modal (Supports Buyer & Supplier) */}
      {showConvertModal && convertingLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: "620px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "0.75rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    background:
                      convertTargetType === "BUYER"
                        ? "rgba(56, 189, 248, 0.15)"
                        : "rgba(34, 197, 94, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {convertTargetType === "BUYER" ? (
                    <Building size={18} color="var(--primary-light)" />
                  ) : (
                    <Factory size={18} color="var(--success)" />
                  )}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      margin: 0,
                      color: "var(--text-primary)",
                    }}
                  >
                    {convertTargetType === "BUYER"
                      ? "Convert Lead to Verified Buyer"
                      : "Convert Lead to Sourcing Partner (Supplier)"}
                  </h3>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {convertTargetType === "BUYER"
                      ? "Creates an active client account in the Accounts table for quoting & sales orders"
                      : "Creates an active sourcing vendor in Procurement for purchase orders & supply contracts"}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowConvertModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Step 1: Select Partner Type (Buyer vs Supplier) */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                Step 1: Choose Partner Classification *
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div
                  onClick={() => setConvertTargetType("BUYER")}
                  style={{
                    cursor: "pointer",
                    padding: "0.9rem",
                    borderRadius: "var(--radius-md)",
                    border:
                      convertTargetType === "BUYER"
                        ? "2px solid var(--primary-light)"
                        : "1px solid var(--border-medium)",
                    background:
                      convertTargetType === "BUYER"
                        ? "rgba(56, 189, 248, 0.12)"
                        : "var(--bg-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Building
                        size={16}
                        color={
                          convertTargetType === "BUYER"
                            ? "var(--primary-light)"
                            : "var(--text-muted)"
                        }
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.925rem",
                          color:
                            convertTargetType === "BUYER"
                              ? "#fff"
                              : "var(--text-primary)",
                        }}
                      >
                        Verified Buyer
                      </span>
                    </div>
                    <span
                      className="badge badge-info"
                      style={{ fontSize: "0.65rem" }}
                    >
                      Buyer Account
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.35,
                    }}
                  >
                    Overseas customer purchasing commodities. Creates a client
                    account for quotes & sales orders.
                  </p>
                </div>

                <div
                  onClick={() => setConvertTargetType("SUPPLIER")}
                  style={{
                    cursor: "pointer",
                    padding: "0.9rem",
                    borderRadius: "var(--radius-md)",
                    border:
                      convertTargetType === "SUPPLIER"
                        ? "2px solid var(--success)"
                        : "1px solid var(--border-medium)",
                    background:
                      convertTargetType === "SUPPLIER"
                        ? "rgba(34, 197, 94, 0.12)"
                        : "var(--bg-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Factory
                        size={16}
                        color={
                          convertTargetType === "SUPPLIER"
                            ? "var(--success)"
                            : "var(--text-muted)"
                        }
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.925rem",
                          color:
                            convertTargetType === "SUPPLIER"
                              ? "#fff"
                              : "var(--text-primary)",
                        }}
                      >
                        Sourcing Partner
                      </span>
                    </div>
                    <span
                      className="badge badge-success"
                      style={{ fontSize: "0.65rem" }}
                    >
                      Supplier / Vendor
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.35,
                    }}
                  >
                    Manufacturer or mill supplying commodities. Creates a vendor
                    profile for purchase orders.
                  </p>
                </div>
              </div>
            </div>

            {/* Lead Brief Dossier Summary */}
            <div
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Originating Inquiry Details
                </span>
                <span
                  className="badge badge-subtle"
                  style={{ fontSize: "0.7rem" }}
                >
                  {convertingLead.source}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.925rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {convertingLead.name} ({convertingLead.company})
                </span>
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
                >
                  {convertingLead.email} • {convertingLead.phone || "No phone"}
                </span>
              </div>
              {convertingLead.notes && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  "{convertingLead.notes}"
                </div>
              )}
            </div>

            {/* Step 2: Mandated Fields Form */}
            <form
              onSubmit={handleConfirmConvert}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                }}
              >
                Step 2: Complete Mandated Records for{" "}
                <span
                  style={{
                    color:
                      convertTargetType === "BUYER"
                        ? "var(--primary-light)"
                        : "var(--success)",
                  }}
                >
                  {convertTargetType === "BUYER"
                    ? "Verified Buyer Account"
                    : "Sourcing Vendor Partner"}
                </span>
              </div>

              {/* BUYER MANDATED FIELDS */}
              {convertTargetType === "BUYER" && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr",
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
                        Buyer Company Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={convertCompanyName}
                        onChange={(e) => setConvertCompanyName(e.target.value)}
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
                        Country of Destination *
                      </label>
                      <input
                        type="text"
                        required
                        value={convertCountry}
                        onChange={(e) => setConvertCountry(e.target.value)}
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
                      Primary Destination Port of Discharge *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jebel Ali Port (UAE) or Birgunj Dry Port (Nepal)"
                      value={convertDestPort}
                      onChange={(e) => setConvertDestPort(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.55rem",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "var(--radius-md)",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: "0.35rem",
                        flexWrap: "wrap",
                        marginTop: "0.4rem",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Quick Ports:
                      </span>
                      {[
                        "Jebel Ali Port (UAE)",
                        "Birgunj Dry Port (Nepal)",
                        "Tema Port (Ghana)",
                        "Port of Rotterdam (NL)",
                        "Nhava Sheva (IN)",
                        "Oslo Havn (NO)",
                      ].map((port) => (
                        <button
                          key={port}
                          type="button"
                          onClick={() => setConvertDestPort(port)}
                          style={{
                            background:
                              convertDestPort === port
                                ? "var(--primary)"
                                : "var(--bg-tertiary)",
                            color:
                              convertDestPort === port
                                ? "#fff"
                                : "var(--text-secondary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "12px",
                            padding: "2px 8px",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                          }}
                        >
                          {port}
                        </button>
                      ))}
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
                        Agreed Commercial Payment Terms *
                      </label>
                      <select
                        value={convertPaymentTerms}
                        onChange={(e) => setConvertPaymentTerms(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.55rem",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-medium)",
                          borderRadius: "var(--radius-md)",
                        }}
                      >
                        <option value="30 Days Net">30 Days Net</option>
                        <option value="60 Days Net">60 Days Net</option>
                        <option value="14 Days Net">14 Days Net</option>
                        <option value="100% CAD against BL">
                          100% CAD against BL
                        </option>
                        <option value="100% Advance Wire">
                          100% Advance Wire
                        </option>
                        <option value="Letter of Credit (LC at Sight)">
                          Letter of Credit (LC at Sight)
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
                        Buyer Account # *
                      </label>
                      <input
                        type="text"
                        required
                        value={convertAccountNumber}
                        onChange={(e) =>
                          setConvertAccountNumber(e.target.value)
                        }
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
                </>
              )}

              {/* SUPPLIER MANDATED FIELDS */}
              {convertTargetType === "SUPPLIER" && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr",
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
                        Sourcing Partner / Mill Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={convertCompanyName}
                        onChange={(e) => setConvertCompanyName(e.target.value)}
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
                        State / Province *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gujarat, Maharashtra, Kerala"
                        value={convertSupplierState}
                        onChange={(e) => {
                          setConvertSupplierState(e.target.value);
                          const st =
                            e.target.value.slice(0, 2).toUpperCase() || "IN";
                          setConvertSupplierCode(
                            `SUP-${st}-${Math.floor(100 + Math.random() * 900)}`,
                          );
                        }}
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
                        Processing Facility / City *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Unjha, Rajkot, Nashik, Lasalgaon"
                        value={convertSupplierCity}
                        onChange={(e) => setConvertSupplierCity(e.target.value)}
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
                        Sourcing Supplier Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={convertSupplierCode}
                        onChange={(e) => setConvertSupplierCode(e.target.value)}
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
                      Supplied Commodities / Capabilities *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cumin, Turmeric, Coriander, Fennel Seeds"
                      value={convertSupplierCommodities}
                      onChange={(e) =>
                        setConvertSupplierCommodities(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.55rem",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "var(--radius-md)",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: "0.35rem",
                        flexWrap: "wrap",
                        marginTop: "0.4rem",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Quick Commodities:
                      </span>
                      {[
                        "Cumin, Turmeric & Whole Spices",
                        "Fresh Fruits (Mangoes, Apples, Grapes)",
                        "FIBC Jumbo Bags & Woven Sacks",
                        "Raw Peanuts & Sesame Seeds",
                        "Black Pepper & Cardamom",
                        "Polymer Granules & Raw Resins",
                      ].map((comm) => (
                        <button
                          key={comm}
                          type="button"
                          onClick={() => setConvertSupplierCommodities(comm)}
                          style={{
                            background:
                              convertSupplierCommodities === comm
                                ? "var(--success)"
                                : "var(--bg-tertiary)",
                            color:
                              convertSupplierCommodities === comm
                                ? "#fff"
                                : "var(--text-secondary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "12px",
                            padding: "2px 8px",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                          }}
                        >
                          {comm}
                        </button>
                      ))}
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
                        Agreed Sourcing Payment Terms *
                      </label>
                      <select
                        value={convertSupplierPaymentTerms}
                        onChange={(e) =>
                          setConvertSupplierPaymentTerms(e.target.value)
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
                        <option value="15 Days Credit">15 Days Credit</option>
                        <option value="10 Days Net">10 Days Net</option>
                        <option value="30 Days Net">30 Days Net</option>
                        <option value="Advance CAD">Advance CAD</option>
                        <option value="100% Advance Wire">
                          100% Advance Wire
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
                        Initial Partner Rating (Out of 5) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        required
                        value={convertSupplierRating}
                        onChange={(e) =>
                          setConvertSupplierRating(
                            parseFloat(e.target.value) || 4.5,
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
                      />
                    </div>
                  </div>
                </>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.75rem",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowConvertModal(false)}
                  disabled={isConverting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isConverting}
                  style={{
                    background:
                      convertTargetType === "BUYER"
                        ? "var(--primary)"
                        : "var(--success)",
                    borderColor:
                      convertTargetType === "BUYER"
                        ? "var(--primary)"
                        : "var(--success)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {convertTargetType === "BUYER" ? (
                    <Building size={15} />
                  ) : (
                    <Factory size={15} />
                  )}
                  <span>
                    {isConverting
                      ? "Creating Record..."
                      : convertTargetType === "BUYER"
                        ? "Confirm & Create Verified Buyer"
                        : "Confirm & Create Sourcing Partner"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
