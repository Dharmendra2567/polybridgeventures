import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  CreditCard,
  FileText,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Eye,
  Download,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Send,
} from 'lucide-react';
import { TableToolbar } from '../common/TableToolbar.js';
import { DetailDrawer } from '../common/DetailDrawer.js';
import { exportToCsv } from '../../utils/csvExport.js';
import { downloadCommercialInvoice } from '../../utils/invoiceDownload.js';
import { API_BASE } from '../../utils/apiConfig.js';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
}

interface SupplierBillItem {
  id: string;
  billNumber: string;
  supplierName: string;
  poNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  dueDate: string;
  createdAt: string;
}

type InvoiceSortField = 'invoiceNumber' | 'orderNumber' | 'customerName' | 'totalAmount' | 'paidAmount' | 'balanceDue' | 'status' | 'dueDate';
type BillSortField = 'billNumber' | 'poNumber' | 'supplierName' | 'totalAmount' | 'paidAmount' | 'balanceDue' | 'status' | 'dueDate';
type SortDirection = 'asc' | 'desc';

export const FinanceModule: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [bills, setBills] = useState<SupplierBillItem[]>([]);
  const [activeTab, setActiveTab] = useState<'AR_INVOICES' | 'AP_BILLS'>('AR_INVOICES');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Supplier Bill filtering & sorting
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState('ALL');
  const [billSortField, setBillSortField] = useState<BillSortField>('billNumber');
  const [billSortDir, setBillSortDir] = useState<SortDirection>('desc');

  // Sorting
  const [sortField, setSortField] = useState<InvoiceSortField>('invoiceNumber');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Detail Drawers
  const [drawerInvoice, setDrawerInvoice] = useState<InvoiceItem | null>(null);
  const [drawerBill, setDrawerBill] = useState<SupplierBillItem | null>(null);

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);

  // Inward Payment Form
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [swiftRef, setSwiftRef] = useState('ENBD-SWIFT-99482');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Outward Disbursement Form
  const [selectedBill, setSelectedBill] = useState<SupplierBillItem | null>(null);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disburseRef, setDisburseRef] = useState('WIRE-OUT-99214');
  const [isSubmittingDisburse, setIsSubmittingDisburse] = useState(false);

  // Create Invoice Form
  const [newInvNumber, setNewInvNumber] = useState('');
  const [newOrderRef, setNewOrderRef] = useState('SO-2026-001');
  const [newCustomer, setNewCustomer] = useState('Al-Madina Foodstuff Wholesalers LLC');
  const [newTotal, setNewTotal] = useState('114800');
  const [newPaid, setNewPaid] = useState('0');
  const [newDueDate, setNewDueDate] = useState('2026-11-20');
  const [newStatus, setNewStatus] = useState<InvoiceItem['status']>('ISSUED');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Invoice Form
  const [editInvNumber, setEditInvNumber] = useState('');
  const [editOrderRef, setEditOrderRef] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editPaid, setEditPaid] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<InvoiceItem['status']>('ISSUED');
  const [isUpdating, setIsUpdating] = useState(false);

  interface AvailableOrder {
    orderNumber: string;
    customerName: string;
    totalAmount: number;
  }

  interface UnbilledPoItem {
    id: string;
    poNumber: string;
    supplierName: string;
    totalCost: number;
    currency: string;
  }

  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [unbilledPos, setUnbilledPos] = useState<UnbilledPoItem[]>([]);
  const [isGeneratingPoBill, setIsGeneratingPoBill] = useState(false);
  const [isCustomOrderRef, setIsCustomOrderRef] = useState(false);
  const [customOrderRef, setCustomOrderRef] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const fetchFinanceData = async () => {
    try {
      setIsLoading(true);
      const [resInvoices, resOrders, resBills, resPos] = await Promise.all([
        fetch(`${API_BASE}/finance/invoices`),
        fetch(`${API_BASE}/sales/orders`),
        fetch(`${API_BASE}/finance/supplier-bills`),
        fetch(`${API_BASE}/procurement/purchase-orders`),
      ]);
      if (resInvoices.ok) {
        const data = await resInvoices.json();
        setInvoices(data.invoices || []);
      }
      if (resBills.ok) {
        const bData = await resBills.json();
        setBills(bData.bills || []);
      }
      if (resOrders.ok) {
        const oData = await resOrders.json();
        if (Array.isArray(oData.orders)) {
          const list: AvailableOrder[] = oData.orders.map((o: { orderNumber: string; customerName: string; totalAmount: number }) => ({
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            totalAmount: o.totalAmount,
          }));
          setAvailableOrders(list);
          if (list[0]) {
            setNewOrderRef(list[0].orderNumber);
            setNewCustomer(list[0].customerName);
            setNewTotal(String(list[0].totalAmount));
          }
        }
      }
      if (resPos && resPos.ok) {
        const pData = await resPos.json();
        const poList = Array.isArray(pData.purchaseOrders) ? pData.purchaseOrders : [];
        const unbilled: UnbilledPoItem[] = poList
          .filter((p: { status: string; billNumber?: string }) => p.status === 'COMPLETED' && !p.billNumber)
          .map((p: { id: string; poNumber: string; supplierName: string; totalCost: number; currency?: string }) => ({
            id: p.id,
            poNumber: p.poNumber,
            supplierName: p.supplierName,
            totalCost: p.totalCost,
            currency: p.currency || 'USD',
          }));
        setUnbilledPos(unbilled);
      }
    } catch (err) {
      console.warn('API error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickGenerateBill = async (p: UnbilledPoItem) => {
    setIsGeneratingPoBill(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/purchase-orders/${p.id}/generate-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.bill) {
        await fetchFinanceData();
        downloadCommercialInvoice({
          invoiceNumber: data.bill.billNumber,
          orderNumber: p.poNumber,
          supplierName: p.supplierName,
          totalAmount: p.totalCost,
          currency: p.currency,
          type: 'SUPPLIER_BILL',
          status: data.bill.status || 'PENDING',
        });
      } else {
        alert(data.error || 'Failed to generate supplier bill');
      }
    } catch (err) {
      console.error('Error generating bill:', err);
      alert('Network error while generating supplier bill');
    } finally {
      setIsGeneratingPoBill(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleSelectOrderForInvoice = (val: string) => {
    if (val === '__OTHER__') {
      setIsCustomOrderRef(true);
      setCustomOrderRef('');
      setNewOrderRef('');
      return;
    }
    setIsCustomOrderRef(false);
    setNewOrderRef(val);
    const found = availableOrders.find((o) => o.orderNumber === val);
    if (found) {
      setNewCustomer(found.customerName);
      setNewTotal(String(found.totalAmount));
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatusVal: string) => {
    try {
      const res = await fetch(`${API_BASE}/finance/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatusVal }),
      });
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === invoiceId ? { ...i, status: newStatusVal as InvoiceItem['status'] } : i))
        );
        if (drawerInvoice && drawerInvoice.id === invoiceId) {
          setDrawerInvoice((prev) => (prev ? { ...prev, status: newStatusVal as InvoiceItem['status'] } : null));
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`${API_BASE}/finance/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: parseFloat(payAmount) || 1000,
          bankReference: swiftRef,
        }),
      });
      if (res.ok) {
        setShowPayModal(false);
        setSelectedInvoice(null);
        setPayAmount('');
        await fetchFinanceData();
        if (drawerInvoice && drawerInvoice.id === selectedInvoice.id) {
          setDrawerInvoice(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invNum: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete Invoice ${invNum}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/finance/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
        if (drawerInvoice && drawerInvoice.id === invoiceId) setDrawerInvoice(null);
      }
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    const finalOrderRef = isCustomOrderRef ? customOrderRef.trim() : newOrderRef;
    try {
      const res = await fetch(`${API_BASE}/finance/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: newInvNumber.trim() || undefined,
          orderNumber: finalOrderRef,
          customerName: newCustomer,
          totalAmount: parseFloat(newTotal) || 0,
          paidAmount: parseFloat(newPaid) || 0,
          dueDate: newDueDate,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewInvNumber('');
        setIsCustomOrderRef(false);
        setCustomOrderRef('');
        await fetchFinanceData();
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditModal = (inv: InvoiceItem) => {
    setEditingInvoice(inv);
    setEditInvNumber(inv.invoiceNumber);
    setEditOrderRef(inv.orderNumber);
    setEditCustomer(inv.customerName);
    setEditTotal(inv.totalAmount.toString());
    setEditPaid(inv.paidAmount.toString());
    setEditDueDate(inv.dueDate);
    setEditStatus(inv.status);
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setIsUpdating(true);
    try {
      const totalAmount = parseFloat(editTotal) || editingInvoice.totalAmount;
      const paidAmount = parseFloat(editPaid) || 0;
      const balanceDue = Math.max(0, totalAmount - paidAmount);

      const res = await fetch(`${API_BASE}/finance/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: editInvNumber,
          orderNumber: editOrderRef,
          customerName: editCustomer,
          totalAmount,
          paidAmount,
          dueDate: editDueDate,
          status: editStatus,
        }),
      });
      if (res.ok) {
        setEditingInvoice(null);
        await fetchFinanceData();
        if (drawerInvoice && drawerInvoice.id === editingInvoice.id) {
          setDrawerInvoice((prev) =>
            prev
              ? {
                  ...prev,
                  invoiceNumber: editInvNumber,
                  orderNumber: editOrderRef,
                  customerName: editCustomer,
                  totalAmount,
                  paidAmount,
                  balanceDue,
                  dueDate: editDueDate,
                  status: editStatus,
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSort = (field: InvoiceSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filterOptions = [
    { id: 'ALL', label: 'All Invoices', count: invoices.length },
    { id: 'ISSUED', label: 'Issued / Pending', count: invoices.filter((i) => i.status === 'ISSUED').length },
    { id: 'PARTIALLY_PAID', label: 'Partially Paid', count: invoices.filter((i) => i.status === 'PARTIALLY_PAID').length },
    { id: 'PAID', label: 'Settled (Paid)', count: invoices.filter((i) => i.status === 'PAID').length },
  ];

  const billFilterOptions = [
    { id: 'ALL', label: 'All Bills', count: bills.length },
    { id: 'PENDING', label: 'Pending Payment', count: bills.filter((b) => b.status === 'PENDING').length },
    { id: 'PARTIALLY_PAID', label: 'Partially Paid', count: bills.filter((b) => b.status === 'PARTIALLY_PAID').length },
    { id: 'PAID', label: 'Settled (Paid)', count: bills.filter((b) => b.status === 'PAID').length },
  ];

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.orderNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.status.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [invoices, statusFilter, searchQuery, sortField, sortDir]);

  const handleExportCsv = () => {
    exportToCsv(
      'polybridge-invoices',
      filteredInvoices as unknown as Record<string, unknown>[],
      [
        { key: 'invoiceNumber', header: 'Invoice #' },
        { key: 'orderNumber', header: 'Sales Order Ref' },
        { key: 'customerName', header: 'Customer' },
        { key: 'totalAmount', header: 'Total Invoiced ($)' },
        { key: 'paidAmount', header: 'Paid Amount ($)' },
        { key: 'balanceDue', header: 'Balance Due ($)' },
        { key: 'status', header: 'Status' },
        { key: 'dueDate', header: 'Due Date' },
      ]
    );
  };

  const handleRecordDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    setIsSubmittingDisburse(true);
    try {
      const res = await fetch(`${API_BASE}/finance/supplier-bills/${selectedBill.id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(disburseAmount) || selectedBill.balanceDue,
          bankReference: disburseRef,
        }),
      });
      if (res.ok) {
        setShowDisburseModal(false);
        setSelectedBill(null);
        await fetchFinanceData();
        if (drawerBill && drawerBill.id === selectedBill.id) {
          setDrawerBill(null);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to record outward disbursement');
      }
    } catch (err) {
      console.error('Error recording outward payment:', err);
      alert('Network error recording disbursement');
    } finally {
      setIsSubmittingDisburse(false);
    }
  };

  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
        const matchesQuery =
          b.billNumber.toLowerCase().includes(billSearchQuery.toLowerCase()) ||
          b.poNumber.toLowerCase().includes(billSearchQuery.toLowerCase()) ||
          b.supplierName.toLowerCase().includes(billSearchQuery.toLowerCase());
        const matchesStatus = billStatusFilter === 'ALL' || b.status === billStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[billSortField];
        const valB = b[billSortField];
        if (valA < valB) return billSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return billSortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [bills, billSearchQuery, billStatusFilter, billSortField, billSortDir]);

  const handleExportBillsCsv = () => {
    exportToCsv(
      'polybridge-supplier-bills',
      filteredBills as unknown as Record<string, unknown>[],
      [
        { key: 'billNumber', header: 'Bill / Invoice #' },
        { key: 'poNumber', header: 'Purchase Order Ref' },
        { key: 'supplierName', header: 'Supplier' },
        { key: 'totalAmount', header: 'Total Billed ($)' },
        { key: 'paidAmount', header: 'Disbursed ($)' },
        { key: 'balanceDue', header: 'Balance Due ($)' },
        { key: 'status', header: 'Status' },
        { key: 'dueDate', header: 'Due Date' },
      ]
    );
  };

  const handleSortBill = (field: BillSortField) => {
    if (billSortField === field) {
      setBillSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setBillSortField(field);
      setBillSortDir('desc');
    }
  };

  const renderBillSortIndicator = (targetField: BillSortField) => {
    if (billSortField !== targetField) {
      return <ArrowUpDown size={12} className="sort-icon-indicator" />;
    }
    return billSortDir === 'asc' ? (
      <ArrowUp size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    ) : (
      <ArrowDown size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    );
  };

  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.balanceDue, 0);

  const totalBilled = bills.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalDisbursed = bills.reduce((acc, b) => acc + b.paidAmount, 0);
  const totalPayableDue = bills.reduce((acc, b) => acc + b.balanceDue, 0);

  const netTradingGrossMargin = totalInvoiced - totalBilled;
  const netWorkingCapital = totalOutstanding - totalPayableDue;

  const renderSortIndicator = (targetField: InvoiceSortField) => {
    if (sortField !== targetField) {
      return <ArrowUpDown size={12} className="sort-icon-indicator" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    ) : (
      <ArrowDown size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Module Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('AR_INVOICES')}
            className={`btn btn-sm ${activeTab === 'AR_INVOICES' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <FileText size={14} />
            <span>Customer Invoices (Sales AR)</span>
            <span className="badge badge-subtle">{invoices.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('AP_BILLS')}
            className={`btn btn-sm ${activeTab === 'AP_BILLS' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <ShoppingCart size={14} />
            <span>Supplier Bills (Procurement AP)</span>
            <span className="badge badge-subtle">{bills.length}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {activeTab === 'AR_INVOICES' ? (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-sm btn-outline"
              >
                <Plus size={14} />
                <span>Create Invoice</span>
              </button>

              {invoices.length > 0 && (
                <button
                  onClick={() => {
                    const pending = invoices.find((i) => i.balanceDue > 0) || invoices[0];
                    if (pending) {
                      setSelectedInvoice(pending);
                      setPayAmount(String(pending.balanceDue));
                      setShowPayModal(true);
                    }
                  }}
                  className="btn btn-sm btn-primary"
                >
                  <CreditCard size={14} />
                  <span>Record Inward SWIFT</span>
                </button>
              )}
            </>
          ) : (
            bills.length > 0 && (
              <button
                onClick={() => {
                  const pending = bills.find((b) => b.balanceDue > 0) || bills[0];
                  if (pending) {
                    setSelectedBill(pending);
                    setDisburseAmount(String(pending.balanceDue));
                    setShowDisburseModal(true);
                  }
                }}
                className="btn btn-sm btn-primary"
              >
                <Send size={14} />
                <span>Disburse Wire to Supplier</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI Financial Cards (Comprehensive AR & AP Coverage) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Export Sales AR */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>Total Export Invoiced (AR)</span>
            <FileText size={16} color="var(--primary-light)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            ${totalInvoiced.toLocaleString()} USD
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Inward: <strong style={{ color: 'var(--success)' }}>${totalCollected.toLocaleString()}</strong> • Due: <strong style={{ color: 'var(--warning)' }}>${totalOutstanding.toLocaleString()}</strong>
          </div>
        </div>

        {/* Card 2: Procurement Sourcing AP */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>Total Sourcing Billed (AP)</span>
            <ShoppingCart size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
            ${totalBilled.toLocaleString()} USD
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Disbursed: <strong style={{ color: 'var(--success)' }}>${totalDisbursed.toLocaleString()}</strong> • Due: <strong style={{ color: 'var(--danger)' }}>${totalPayableDue.toLocaleString()}</strong>
          </div>
        </div>

        {/* Card 3: Net Trade Gross Margin */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>Net Trade Gross Margin</span>
            <TrendingUp size={16} color={netTradingGrossMargin >= 0 ? 'var(--success)' : 'var(--danger)'} />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: netTradingGrossMargin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {netTradingGrossMargin >= 0 ? '+' : ''}${netTradingGrossMargin.toLocaleString()} USD
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Export Sales minus Sourcing Cost
          </div>
        </div>

        {/* Card 4: Net Working Capital */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>Net Working Capital</span>
            <Wallet size={16} color="var(--primary-light)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {netWorkingCapital >= 0 ? '+' : ''}${netWorkingCapital.toLocaleString()} USD
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Net Receivables vs Payables
          </div>
        </div>
      </div>

      {activeTab === 'AR_INVOICES' ? (
        /* Invoices Table Card */
        <div className="table-card">
          {/* Toolbar (density relaxed by default) */}
          <TableToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by invoice #, order ref, customer..."
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
                    className={`th-sortable ${sortField === 'invoiceNumber' ? 'sorted' : ''}`}
                    onClick={() => handleSort('invoiceNumber')}
                  >
                    Invoice # {renderSortIndicator('invoiceNumber')}
                  </th>
                  <th
                    className={`th-sortable ${sortField === 'orderNumber' ? 'sorted' : ''}`}
                    onClick={() => handleSort('orderNumber')}
                  >
                    Sales Order Ref {renderSortIndicator('orderNumber')}
                  </th>
                  <th
                    className={`th-sortable ${sortField === 'customerName' ? 'sorted' : ''}`}
                    onClick={() => handleSort('customerName')}
                  >
                    Buyer / Customer {renderSortIndicator('customerName')}
                  </th>
                  <th
                    className={`th-sortable ${sortField === 'totalAmount' ? 'sorted' : ''}`}
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total Invoiced {renderSortIndicator('totalAmount')}
                  </th>
                  <th
                    className={`th-sortable ${sortField === 'paidAmount' ? 'sorted' : ''}`}
                    onClick={() => handleSort('paidAmount')}
                  >
                    Paid Amount {renderSortIndicator('paidAmount')}
                  </th>
                  <th
                    className={`th-sortable ${sortField === 'balanceDue' ? 'sorted' : ''}`}
                    onClick={() => handleSort('balanceDue')}
                  >
                    Balance Due {renderSortIndicator('balanceDue')}
                  </th>
                  <th
                    className={`th-sortable ${sortField === 'status' ? 'sorted' : ''}`}
                    onClick={() => handleSort('status')}
                  >
                    Status {renderSortIndicator('status')}
                  </th>
                  <th
                    className={`th-sortable ${sortField === 'dueDate' ? 'sorted' : ''}`}
                    onClick={() => handleSort('dueDate')}
                  >
                    Due Date {renderSortIndicator('dueDate')}
                  </th>
                  <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="table-loading-state">
                        <div className="table-spinner" />
                        <div className="table-loading-text">Loading commercial invoices from database...</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="table-empty-state">
                        <div className="table-empty-state-icon">
                          <DollarSign size={24} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>No commercial invoices match criteria</h4>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="clickable-row"
                      onClick={() => setDrawerInvoice(inv)}
                    >
                      <td className="cell-code">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadCommercialInvoice({
                              invoiceNumber: inv.invoiceNumber,
                              orderNumber: inv.orderNumber,
                              customerName: inv.customerName,
                              totalAmount: inv.totalAmount,
                              paidAmount: inv.paidAmount,
                              balanceDue: inv.balanceDue,
                              currency: inv.currency,
                              issueDate: inv.issueDate,
                              dueDate: inv.dueDate,
                              status: inv.status,
                            });
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--primary-light)' }}
                          title="Click to download Commercial Invoice"
                        >
                          <FileText size={11} /> {inv.invoiceNumber}
                          <Download size={10} />
                        </span>
                      </td>
                      <td className="cell-code" style={{ color: 'var(--text-secondary)' }}>
                        {inv.orderNumber}
                      </td>
                      <td>
                        <div className="cell-primary">{inv.customerName}</div>
                      </td>
                      <td className="cell-amount">
                        ${inv.totalAmount.toLocaleString()} {inv.currency}
                      </td>
                      <td className="cell-amount" style={{ color: 'var(--success)', fontWeight: 700 }}>
                        ${inv.paidAmount.toLocaleString()}
                      </td>
                      <td
                        className="cell-amount"
                        style={{
                          fontWeight: 700,
                          color: inv.balanceDue > 0 ? 'var(--warning)' : 'var(--text-muted)',
                        }}
                      >
                        ${inv.balanceDue.toLocaleString()}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="status-select-wrapper">
                          <select
                            value={inv.status}
                            onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                            className={`status-select-pill ${
                              inv.status === 'PAID'
                                ? 'badge-success'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'badge-warning'
                                : inv.status === 'CANCELLED' || inv.status === 'OVERDUE'
                                ? 'badge-danger'
                                : 'badge-primary'
                            }`}
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="ISSUED">ISSUED</option>
                            <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                            <option value="PAID">PAID</option>
                            <option value="OVERDUE">OVERDUE</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{inv.dueDate}</span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          {inv.balanceDue > 0 && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPayAmount(String(inv.balanceDue));
                                setShowPayModal(true);
                              }}
                              className="btn btn-xs btn-primary"
                              title="Record Wire Payment"
                            >
                              <CreditCard size={12} />
                              <span>Wire</span>
                            </button>
                          )}
                          <button
                            onClick={() => downloadCommercialInvoice({
                              invoiceNumber: inv.invoiceNumber,
                              orderNumber: inv.orderNumber,
                              customerName: inv.customerName,
                              totalAmount: inv.totalAmount,
                              paidAmount: inv.paidAmount,
                              balanceDue: inv.balanceDue,
                              currency: inv.currency,
                              issueDate: inv.issueDate,
                              dueDate: inv.dueDate,
                              status: inv.status,
                            })}
                            className="btn btn-xs btn-outline"
                            title="Download Commercial Invoice"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={() => openEditModal(inv)}
                            className="btn btn-xs btn-outline"
                            title="Edit Invoice"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            className="btn btn-xs btn-outline"
                            title="Delete Invoice"
                            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={() => setDrawerInvoice(inv)}
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
            <span>Showing {filteredInvoices.length} commercial invoices</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Automated balance calculation & currency reconciliation. Edit or update status inline.
            </span>
          </div>
        </div>
      ) : (
        /* Supplier Bills Table View (AP) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {unbilledPos.length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShoppingCart size={18} color="#f59e0b" />
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {unbilledPos.length} Completed Purchase Order(s) Awaiting Supplier Bill Generation
                  </strong>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Procurement POs marked COMPLETED can be converted into Supplier Bills (AP) to reflect in Accounts Payable.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {unbilledPos.map((po) => (
                  <button
                    key={po.id}
                    onClick={() => handleQuickGenerateBill(po)}
                    disabled={isGeneratingPoBill}
                    className="btn btn-xs btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={11} />
                    <span>Generate Bill: {po.poNumber} (${po.totalCost.toLocaleString()} {po.currency})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="table-card">
            <TableToolbar
              searchQuery={billSearchQuery}
              onSearchChange={setBillSearchQuery}
              searchPlaceholder="Search by bill #, PO ref, supplier..."
              filterOptions={billFilterOptions}
              activeFilter={billStatusFilter}
              onFilterChange={setBillStatusFilter}
              onExportCsv={handleExportBillsCsv}
            />

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      className={`th-sortable ${billSortField === 'billNumber' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('billNumber')}
                    >
                      Bill / Invoice # {renderBillSortIndicator('billNumber')}
                    </th>
                    <th
                      className={`th-sortable ${billSortField === 'poNumber' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('poNumber')}
                    >
                      Purchase Order Ref {renderBillSortIndicator('poNumber')}
                    </th>
                    <th
                      className={`th-sortable ${billSortField === 'supplierName' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('supplierName')}
                    >
                      Supplier / Sourcing Partner {renderBillSortIndicator('supplierName')}
                    </th>
                    <th
                      className={`th-sortable ${billSortField === 'totalAmount' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('totalAmount')}
                    >
                      Total Billed {renderBillSortIndicator('totalAmount')}
                    </th>
                    <th
                      className={`th-sortable ${billSortField === 'paidAmount' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('paidAmount')}
                    >
                      Disbursed {renderBillSortIndicator('paidAmount')}
                    </th>
                    <th
                      className={`th-sortable ${billSortField === 'balanceDue' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('balanceDue')}
                    >
                      Balance Due {renderBillSortIndicator('balanceDue')}
                    </th>
                    <th
                      className={`th-sortable ${billSortField === 'status' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('status')}
                    >
                      Status {renderBillSortIndicator('status')}
                    </th>
                    <th
                      className={`th-sortable ${billSortField === 'dueDate' ? 'sorted' : ''}`}
                      onClick={() => handleSortBill('dueDate')}
                    >
                      Due Date {renderBillSortIndicator('dueDate')}
                    </th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="table-loading-state">
                          <div className="table-spinner" />
                          <div className="table-loading-text">Loading supplier procurement bills...</div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="table-empty-state">
                          <div className="table-empty-state-icon">
                            <ShoppingCart size={24} />
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>No supplier bills recorded yet</h4>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            When a Purchase Order is marked COMPLETED in Procurement, click "Generate Bill" to create a bill.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr
                        key={b.id}
                        className="clickable-row"
                        onClick={() => setDrawerBill(b)}
                      >
                        <td className="cell-code">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadCommercialInvoice({
                                invoiceNumber: b.billNumber,
                                orderNumber: b.poNumber,
                                supplierName: b.supplierName,
                                totalAmount: b.totalAmount,
                                paidAmount: b.paidAmount,
                                balanceDue: b.balanceDue,
                                currency: b.currency,
                                type: 'SUPPLIER_BILL',
                                status: b.status,
                                dueDate: b.dueDate,
                              });
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#f59e0b' }}
                            title="Click to download Supplier Bill / Purchase Invoice"
                          >
                            <FileText size={11} /> {b.billNumber}
                            <Download size={10} />
                          </span>
                        </td>
                        <td className="cell-code" style={{ color: 'var(--text-secondary)' }}>
                          {b.poNumber}
                        </td>
                        <td>
                          <div className="cell-primary">{b.supplierName}</div>
                        </td>
                        <td className="cell-amount">
                          ${b.totalAmount.toLocaleString()} {b.currency}
                        </td>
                        <td className="cell-amount" style={{ color: 'var(--success)', fontWeight: 700 }}>
                          ${b.paidAmount.toLocaleString()}
                        </td>
                        <td
                          className="cell-amount"
                          style={{
                            fontWeight: 700,
                            color: b.balanceDue > 0 ? 'var(--danger)' : 'var(--text-muted)',
                          }}
                        >
                          ${b.balanceDue.toLocaleString()}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <span
                            className={`badge ${
                              b.status === 'PAID'
                                ? 'badge-success'
                                : b.status === 'PARTIALLY_PAID'
                                ? 'badge-warning'
                                : 'badge-outline'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{b.dueDate}</span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            {b.balanceDue > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedBill(b);
                                  setDisburseAmount(String(b.balanceDue));
                                  setShowDisburseModal(true);
                                }}
                                className="btn btn-xs btn-primary"
                                title="Disburse Outward Wire"
                              >
                                <Send size={12} />
                                <span>Disburse</span>
                              </button>
                            )}
                            <button
                              onClick={() => downloadCommercialInvoice({
                                invoiceNumber: b.billNumber,
                                orderNumber: b.poNumber,
                                supplierName: b.supplierName,
                                totalAmount: b.totalAmount,
                                paidAmount: b.paidAmount,
                                balanceDue: b.balanceDue,
                                currency: b.currency,
                                type: 'SUPPLIER_BILL',
                                status: b.status,
                                dueDate: b.dueDate,
                              })}
                              className="btn btn-xs btn-outline"
                              title="Download Supplier Bill"
                            >
                              <Download size={12} />
                            </button>
                            <button
                              onClick={() => setDrawerBill(b)}
                              className="btn btn-xs btn-ghost"
                              title="View Bill Details"
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
              <span>Showing {filteredBills.length} supplier procurement bills</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Accounts Payable tracking for verified supplier commitments & outward disbursements.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE DETAIL DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerInvoice)}
        onClose={() => setDrawerInvoice(null)}
        title={drawerInvoice?.invoiceNumber || 'Invoice Reconciliation'}
        subtitle={`Customer: ${drawerInvoice?.customerName} • Order: ${drawerInvoice?.orderNumber}`}
        badge={
          drawerInvoice ? (
            <span
              className={`badge ${
                drawerInvoice.status === 'PAID'
                  ? 'badge-success'
                  : drawerInvoice.status === 'PARTIALLY_PAID'
                  ? 'badge-warning'
                  : 'badge-danger'
              }`}
            >
              <span className="badge-dot" />
              {drawerInvoice.status}
            </span>
          ) : null
        }
        footer={
          drawerInvoice ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
              <button
                onClick={() => downloadCommercialInvoice({
                  invoiceNumber: drawerInvoice.invoiceNumber,
                  orderNumber: drawerInvoice.orderNumber,
                  customerName: drawerInvoice.customerName,
                  totalAmount: drawerInvoice.totalAmount,
                  paidAmount: drawerInvoice.paidAmount,
                  balanceDue: drawerInvoice.balanceDue,
                  currency: drawerInvoice.currency,
                  issueDate: drawerInvoice.issueDate,
                  dueDate: drawerInvoice.dueDate,
                  status: drawerInvoice.status,
                })}
                className="btn btn-primary"
              >
                <Download size={15} />
                <span>Download Invoice</span>
              </button>
              {drawerInvoice.balanceDue > 0 && (
                <button
                  onClick={() => {
                    setSelectedInvoice(drawerInvoice);
                    setPayAmount(String(drawerInvoice.balanceDue));
                    setShowPayModal(true);
                  }}
                  className="btn btn-outline"
                >
                  <CreditCard size={15} />
                  <span>Record Wire</span>
                </button>
              )}
              <button
                onClick={() => {
                  const inv = drawerInvoice;
                  setDrawerInvoice(null);
                  openEditModal(inv);
                }}
                className="btn btn-outline"
              >
                <Pencil size={15} />
                <span>Edit Invoice</span>
              </button>
              <button
                onClick={() => handleDeleteInvoice(drawerInvoice.id, drawerInvoice.invoiceNumber)}
                className="btn btn-outline"
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {drawerInvoice && (
          <div className="drawer-section">
            <div className="drawer-section-title">
              <DollarSign size={14} color="var(--primary-light)" />
              Accounts Receivable Status
            </div>
            <div className="drawer-grid">
              <div className="drawer-stat">
                <span className="drawer-stat-label">Total Invoice Value</span>
                <span className="drawer-stat-value cell-amount" style={{ fontSize: '1.25rem' }}>
                  ${drawerInvoice.totalAmount.toLocaleString()} {drawerInvoice.currency}
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Remitted (Paid)</span>
                <span className="drawer-stat-value cell-amount" style={{ fontSize: '1.25rem', color: 'var(--success)' }}>
                  ${drawerInvoice.paidAmount.toLocaleString()} USD
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Outstanding Balance</span>
                <span
                  className="drawer-stat-value cell-amount"
                  style={{
                    fontSize: '1.25rem',
                    color: drawerInvoice.balanceDue > 0 ? 'var(--warning)' : 'var(--text-muted)',
                  }}
                >
                  ${drawerInvoice.balanceDue.toLocaleString()} USD
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Payment Maturity (Due Date)</span>
                <span className="drawer-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} color="var(--text-muted)" />
                  {drawerInvoice.dueDate}
                </span>
              </div>
              <div className="drawer-stat" style={{ gridColumn: 'span 2' }}>
                <span className="drawer-stat-label">Update Invoice Status</span>
                <div style={{ marginTop: '0.4rem' }}>
                  <select
                    value={drawerInvoice.status}
                    onChange={(e) => handleUpdateStatus(drawerInvoice.id, e.target.value)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      fontWeight: 600,
                    }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="ISSUED">ISSUED</option>
                    <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                    <option value="PAID">PAID</option>
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* SUPPLIER BILL DETAIL DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerBill)}
        onClose={() => setDrawerBill(null)}
        title={drawerBill?.billNumber || 'Supplier Bill Reconciliation'}
        subtitle={`Supplier: ${drawerBill?.supplierName} • Purchase Order: ${drawerBill?.poNumber}`}
        badge={
          drawerBill ? (
            <span
              className={`badge ${
                drawerBill.status === 'PAID'
                  ? 'badge-success'
                  : drawerBill.status === 'PARTIALLY_PAID'
                  ? 'badge-warning'
                  : 'badge-outline'
              }`}
            >
              <span className="badge-dot" />
              {drawerBill.status}
            </span>
          ) : null
        }
        footer={
          drawerBill ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
              <button
                onClick={() => downloadCommercialInvoice({
                  invoiceNumber: drawerBill.billNumber,
                  orderNumber: drawerBill.poNumber,
                  supplierName: drawerBill.supplierName,
                  totalAmount: drawerBill.totalAmount,
                  paidAmount: drawerBill.paidAmount,
                  balanceDue: drawerBill.balanceDue,
                  currency: drawerBill.currency,
                  type: 'SUPPLIER_BILL',
                  status: drawerBill.status,
                  dueDate: drawerBill.dueDate,
                })}
                className="btn btn-primary"
              >
                <Download size={15} />
                <span>Download Bill</span>
              </button>
              {drawerBill.balanceDue > 0 && (
                <button
                  onClick={() => {
                    setSelectedBill(drawerBill);
                    setDisburseAmount(String(drawerBill.balanceDue));
                    setShowDisburseModal(true);
                  }}
                  className="btn btn-outline"
                >
                  <Send size={15} />
                  <span>Disburse Wire</span>
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {drawerBill && (
          <div className="drawer-section">
            <div className="drawer-section-title">
              <ShoppingCart size={14} color="#f59e0b" />
              Accounts Payable Liability Status
            </div>
            <div className="drawer-grid">
              <div className="drawer-stat">
                <span className="drawer-stat-label">Total Sourcing Cost</span>
                <span className="drawer-stat-value cell-amount" style={{ fontSize: '1.25rem' }}>
                  ${drawerBill.totalAmount.toLocaleString()} {drawerBill.currency}
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Disbursed (Paid to Supplier)</span>
                <span className="drawer-stat-value cell-amount" style={{ fontSize: '1.25rem', color: 'var(--success)' }}>
                  ${drawerBill.paidAmount.toLocaleString()} USD
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Outstanding Payable Balance</span>
                <span
                  className="drawer-stat-value cell-amount"
                  style={{
                    fontSize: '1.25rem',
                    color: drawerBill.balanceDue > 0 ? 'var(--danger)' : 'var(--text-muted)',
                  }}
                >
                  ${drawerBill.balanceDue.toLocaleString()} USD
                </span>
              </div>
              <div className="drawer-stat">
                <span className="drawer-stat-label">Credit Maturity (Due Date)</span>
                <span className="drawer-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} color="var(--text-muted)" />
                  {drawerBill.dueDate}
                </span>
              </div>
              <div className="drawer-stat" style={{ gridColumn: 'span 2' }}>
                <span className="drawer-stat-label">Linked Procurement PO</span>
                <span className="drawer-stat-value" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {drawerBill.poNumber} — Supplier: {drawerBill.supplierName}
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Create Commercial Invoice Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Create Commercial Invoice</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Invoice # (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={newInvNumber}
                    onChange={(e) => setNewInvNumber(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Sales Order Ref *
                  </label>
                  <select
                    value={isCustomOrderRef ? '__OTHER__' : newOrderRef}
                    onChange={(e) => handleSelectOrderForInvoice(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  >
                    <optgroup label="Confirmed Sales Orders">
                      {availableOrders.map((so) => (
                        <option key={so.orderNumber} value={so.orderNumber}>
                          {so.orderNumber} — {so.customerName} (${so.totalAmount.toLocaleString()})
                        </option>
                      ))}
                    </optgroup>
                    <option value="__OTHER__">✨ + Other (Enter Reference Manually)</option>
                  </select>
                </div>
              </div>

              {isCustomOrderRef && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--primary-light)' }}>
                    Custom Sales Order Ref *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SO-2026-999"
                    value={customOrderRef}
                    onChange={(e) => setCustomOrderRef(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Customer / Buyer Name</label>
                <input
                  type="text"
                  required
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Total Invoiced ($ USD)</label>
                  <input
                    type="number"
                    required
                    value={newTotal}
                    onChange={(e) => setNewTotal(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Initial Paid ($ USD)</label>
                  <input
                    type="number"
                    value={newPaid}
                    onChange={(e) => setNewPaid(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Initial Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as InvoiceItem['status'])}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="ISSUED">ISSUED</option>
                    <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                    <option value="PAID">PAID</option>
                    <option value="OVERDUE">OVERDUE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingCreate}>
                  {isSubmittingCreate ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Commercial Invoice Modal */}
      {editingInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pencil size={18} color="var(--primary-light)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Edit Commercial Invoice ({editingInvoice.invoiceNumber})</h3>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditingInvoice(null)}>✕</button>
            </div>

            <form onSubmit={handleUpdateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Invoice #</label>
                  <input
                    type="text"
                    required
                    value={editInvNumber}
                    onChange={(e) => setEditInvNumber(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Sales Order Ref</label>
                  <input
                    type="text"
                    required
                    value={editOrderRef}
                    onChange={(e) => setEditOrderRef(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Customer / Buyer Name</label>
                <input
                  type="text"
                  required
                  value={editCustomer}
                  onChange={(e) => setEditCustomer(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Total Invoiced ($ USD)</label>
                  <input
                    type="number"
                    required
                    value={editTotal}
                    onChange={(e) => setEditTotal(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Paid Amount ($ USD)</label>
                  <input
                    type="number"
                    required
                    value={editPaid}
                    onChange={(e) => setEditPaid(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Due Date</label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as InvoiceItem['status'])}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="ISSUED">ISSUED</option>
                    <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                    <option value="PAID">PAID</option>
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingInvoice(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                  {isUpdating ? 'Saving Changes...' : 'Update Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && selectedInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Record Inward SWIFT Payment</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowPayModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Target Invoice & Customer:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedInvoice.invoiceNumber} • {selectedInvoice.customerName}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '0.35rem', fontWeight: 600 }}>
                  Current Outstanding: ${selectedInvoice.balanceDue.toLocaleString()} USD
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Payment Amount Received ($ USD)</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Bank SWIFT / Wire Reference</label>
                <input
                  type="text"
                  required
                  value={swiftRef}
                  onChange={(e) => setSwiftRef(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingPayment}>
                  {isSubmittingPayment ? 'Allocating...' : 'Allocate & Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Outward Wire to Supplier Modal */}
      {showDisburseModal && selectedBill && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} color="var(--primary-light)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Disburse Outward Wire to Supplier</h3>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowDisburseModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRecordDisbursement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Target Bill & Sourcing Partner:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedBill.billNumber} • {selectedBill.supplierName} ({selectedBill.poNumber})
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '0.35rem', fontWeight: 600 }}>
                  Current Outstanding Payable: ${selectedBill.balanceDue.toLocaleString()} USD
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Disbursement Amount ($ USD)</label>
                <input
                  type="number"
                  required
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Bank Outward Wire / RTGS Reference</label>
                <input
                  type="text"
                  required
                  value={disburseRef}
                  onChange={(e) => setDisburseRef(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDisburseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingDisburse}>
                  {isSubmittingDisburse ? 'Disbursing...' : 'Confirm Outward Wire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
