import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle,
  ArrowRightCircle,
  Eye,
  Calendar,
  Globe,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  ShoppingBag,
  Pencil,
  Trash2,
  FileText,
  Download,
  ExternalLink,
} from 'lucide-react';
import { TableToolbar } from '../common/TableToolbar.js';
import { DetailDrawer } from '../common/DetailDrawer.js';
import { exportToCsv } from '../../utils/csvExport.js';
import { downloadCommercialInvoice } from '../../utils/invoiceDownload.js';
import { TradeDocumentVault } from '../common/TradeDocumentVault.js';

interface QuoteLine {
  id: string;
  productSku: string;
  productName: string;
  quantity: number;
  uom: string;
  unitCost: number;
  unitPrice: number;
  lineTotal: number;
  marginPercent: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  version: number;
  customerName: string;
  country: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  totalAmount: number;
  totalCost: number;
  marginPercent: number;
  currency: string;
  exchangeRateToUsd?: number;
  totalAmountUsd?: number;
  validUntil: string;
  createdAt: string;
  lines: QuoteLine[];
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPo: string;
  quoteRef: string;
  status: 'CONFIRMED' | 'SOURCING' | 'PROCESSING' | 'IN_TRANSIT' | 'FULFILLED' | 'CANCELLED';
  totalAmount: number;
  currency: string;
  exchangeRateToUsd?: number;
  totalAmountUsd?: number;
  deliveryTerm: string;
  destinationPort: string;
  createdAt: string;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceStatus?: string;
}

interface MarketCurrency {
  id: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  exchangeRateToUsd: number;
  isBaseCurrency: boolean;
}

interface BuyerOption {
  name: string;
  country: string;
}

const DEFAULT_BUYERS: BuyerOption[] = [
  { name: 'Al-Madina Foodstuff Wholesalers LLC', country: 'United Arab Emirates' },
  { name: 'Gulf Commodities Trading LLC', country: 'United Arab Emirates' },
  { name: 'Bordeaux Agro Services', country: 'France' },
  { name: 'Accra Packaging & Supplies Ltd', country: 'Ghana' },
  { name: 'Nordic Spices & Produce AS', country: 'Netherlands' },
];

type QuoteSortField = 'quoteNumber' | 'customerName' | 'country' | 'totalAmount' | 'marginPercent' | 'status' | 'validUntil';
type OrderSortField = 'orderNumber' | 'customerName' | 'destinationPort' | 'totalAmount' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface QuotesModuleProps {
  onNavigateToFinance?: () => void;
}

export const QuotesModule: React.FC<QuotesModuleProps> = ({ onNavigateToFinance }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'quotes' | 'orders'>('quotes');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // FX Markets & Currency Selection State
  const [markets, setMarkets] = useState<MarketCurrency[]>([]);
  const [quoteCurrency, setQuoteCurrency] = useState('USD');
  const [orderCurrency, setOrderCurrency] = useState('USD');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sorting
  const [quoteSortField, setQuoteSortField] = useState<QuoteSortField>('quoteNumber');
  const [quoteSortDir, setQuoteSortDir] = useState<SortDirection>('desc');
  const [orderSortField, setOrderSortField] = useState<OrderSortField>('orderNumber');
  const [orderSortDir, setOrderSortDir] = useState<SortDirection>('desc');

  // Inspection Drawer
  const [drawerQuote, setDrawerQuote] = useState<Quote | null>(null);
  const [drawerOrder, setDrawerOrder] = useState<SalesOrder | null>(null);

  // Quote Create & Edit Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditQuoteModal, setShowEditQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  // Sales Order Create & Edit Modals
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);

  // Create Order Form State
  const [orderCustomer, setOrderCustomer] = useState('Al-Madina Foodstuff Wholesalers LLC');
  const [orderPo, setOrderPo] = useState('');
  const [orderQuoteRef, setOrderQuoteRef] = useState('Direct Order');
  const [orderAmount, setOrderAmount] = useState('50000');
  const [orderDeliveryTerm, setOrderDeliveryTerm] = useState('CIF Destination Port');
  const [orderDestinationPort, setOrderDestinationPort] = useState('Jebel Ali Port, UAE');

  // Buyers List & Selection
  const [buyers, setBuyers] = useState<BuyerOption[]>(DEFAULT_BUYERS);
  const [selectedBuyer, setSelectedBuyer] = useState<string>('Al-Madina Foodstuff Wholesalers LLC');
  const [isOtherBuyer, setIsOtherBuyer] = useState(false);
  const [customBuyerName, setCustomBuyerName] = useState('');
  const [newCountry, setNewCountry] = useState('United Arab Emirates');

  // Product Selection Form State
  const [newProductSku, setNewProductSku] = useState('SPICE-TUR-WHOLE');
  const [newQty, setNewQty] = useState('28');
  const [newUnitPrice, setNewUnitPrice] = useState('2050');
  const [newUnitCost, setNewUnitCost] = useState('1650');

  const getCurrencyForCountry = (countryStr: string) => {
    if (!countryStr) return 'USD';
    const c = countryStr.toLowerCase().trim();
    const found = markets.find(
      (m) =>
        m.countryName.toLowerCase() === c ||
        m.countryCode.toLowerCase() === c ||
        ((c.includes('emirates') || c.includes('uae')) && m.countryCode === 'AE') ||
        (c.includes('united states') && m.countryCode === 'US') ||
        (c.includes('japan') && m.countryCode === 'JP') ||
        (c.includes('saudi') && m.countryCode === 'SA') ||
        (c.includes('sri lanka') && m.countryCode === 'LK') ||
        (c.includes('oman') && m.countryCode === 'OM') ||
        (c.includes('kuwait') && m.countryCode === 'KW') ||
        (c.includes('chile') && m.countryCode === 'CL') ||
        (c.includes('canada') && m.countryCode === 'CA') ||
        (c.includes('brazil') && m.countryCode === 'BR') ||
        (c.includes('australia') && m.countryCode === 'AU') ||
        (c.includes('india') && m.countryCode === 'IN')
    );
    return found ? found.currencyCode : 'USD';
  };

  const fetchTradeSales = async () => {
    setIsLoading(true);
    try {
      const [resQuotes, resOrders, resAccounts, resMarkets] = await Promise.all([
        fetch('/api/v1/sales/quotes'),
        fetch('/api/v1/sales/orders'),
        fetch('/api/v1/crm/accounts'),
        fetch('/api/v1/fx/markets'),
      ]);

      if (resQuotes.ok && resOrders.ok) {
        const qData = await resQuotes.json();
        const oData = await resOrders.json();
        setQuotes(qData.quotes || []);
        setOrders(oData.orders || []);
      }

      if (resMarkets && resMarkets.ok) {
        const mData = await resMarkets.json();
        if (Array.isArray(mData.markets)) {
          setMarkets(mData.markets);
        }
      }

      if (resAccounts.ok) {
        const aData = await resAccounts.json();
        if (Array.isArray(aData.accounts) && aData.accounts.length > 0) {
          const list: BuyerOption[] = aData.accounts.map((acc: { name: string; country: string }) => ({
            name: acc.name,
            country: acc.country || 'United Arab Emirates',
          }));
          setBuyers(list);
          if (list[0]) {
            setSelectedBuyer(list[0].name);
            setNewCountry(list[0].country);
            setQuoteCurrency(list[0].country.includes('Emirates') ? 'AED' : 'USD');
          }
        }
      }
    } catch (err) {
      console.warn('API fetch fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTradeSales();
  }, []);

  const handleBuyerChange = (value: string) => {
    if (value === '__OTHER__') {
      setIsOtherBuyer(true);
      setCustomBuyerName('');
      setNewCountry('');
    } else {
      setIsOtherBuyer(false);
      setSelectedBuyer(value);
      const found = buyers.find((i) => i.name === value);
      if (found) {
        setNewCountry(found.country);
        const autoCur = getCurrencyForCountry(found.country);
        if (autoCur) {
          setQuoteCurrency(autoCur);
        }
      }
    }
  };

  const handleApprove = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/v1/sales/quotes/${quoteId}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchTradeSales();
        if (drawerQuote && drawerQuote.id === quoteId) {
          setDrawerQuote((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvert = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/v1/sales/quotes/${quoteId}/convert`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchTradeSales();
        setDrawerQuote(null);
        setActiveTab('orders');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCustomer = isOtherBuyer ? customBuyerName.trim() : selectedBuyer;
    if (!finalCustomer) return;

    setIsSubmitting(true);
    const qty = parseFloat(newQty) || 1;
    const price = parseFloat(newUnitPrice) || 100;
    const cost = parseFloat(newUnitCost) || 80;
    const lineTotal = qty * price;
    const margin = lineTotal > 0 ? Number((((price - cost) / price) * 100).toFixed(2)) : 0;

    const payload = {
      customerName: finalCustomer,
      country: newCountry.trim() || 'United Arab Emirates',
      currency: quoteCurrency,
      lines: [
        {
          id: `ql-${Date.now()}`,
          productSku: newProductSku,
          productName: newProductSku.includes('TUR') ? 'Turmeric Dried Fingers' : newProductSku,
          quantity: qty,
          uom: 'MT',
          unitCost: cost,
          unitPrice: price,
          lineTotal,
          marginPercent: margin,
        },
      ],
    };

    try {
      const res = await fetch('/api/v1/sales/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setIsOtherBuyer(false);
        setCustomBuyerName('');
        fetchTradeSales();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditQuote = (q: Quote) => {
    setEditingQuote({ ...q });
    setShowEditQuoteModal(true);
  };

  const handleSaveEditQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;
    try {
      const res = await fetch(`/api/v1/sales/quotes/${editingQuote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQuote),
      });
      if (res.ok) {
        setShowEditQuoteModal(false);
        const data = await res.json();
        const updated = data.quote || editingQuote;
        setEditingQuote(null);
        await fetchTradeSales();
        if (drawerQuote && drawerQuote.id === updated.id) {
          setDrawerQuote(updated);
        }
      }
    } catch (err) {
      console.error('Failed to update quote:', err);
    }
  };

  const handleDeleteQuote = async (quoteId: string, quoteNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${quoteNumber}?`)) return;
    try {
      const res = await fetch(`/api/v1/sales/quotes/${quoteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (drawerQuote && drawerQuote.id === quoteId) {
          setDrawerQuote(null);
        }
        await fetchTradeSales();
      }
    } catch (err) {
      console.error('Failed to delete quote:', err);
    }
  };

  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: Quote['status']) => {
    if (newStatus === 'CONVERTED') {
      await handleConvert(quoteId);
      return;
    }
    try {
      const res = await fetch(`/api/v1/sales/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchTradeSales();
        if (drawerQuote && drawerQuote.id === quoteId) {
          setDrawerQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update quote status:', err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: orderCustomer,
          customerPo: orderPo || `PO-${Math.floor(1000 + Math.random() * 9000)}`,
          quoteRef: orderQuoteRef,
          currency: orderCurrency,
          totalAmount: parseFloat(orderAmount) || 50000,
          deliveryTerm: orderDeliveryTerm,
          destinationPort: orderDestinationPort,
          status: 'CONFIRMED',
        }),
      });
      if (res.ok) {
        setShowCreateOrderModal(false);
        setOrderPo('');
        setOrderAmount('50000');
        await fetchTradeSales();
      }
    } catch (err) {
      console.error('Failed to create sales order:', err);
    }
  };

  const handleOpenEditOrder = (o: SalesOrder) => {
    setEditingOrder({ ...o });
    setShowEditOrderModal(true);
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      const res = await fetch(`/api/v1/sales/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingOrder),
      });
      if (res.ok) {
        setShowEditOrderModal(false);
        const data = await res.json();
        const updated = data.order || editingOrder;
        setEditingOrder(null);
        await fetchTradeSales();
        if (drawerOrder && drawerOrder.id === updated.id) {
          setDrawerOrder(updated);
        }
      }
    } catch (err) {
      console.error('Failed to update sales order:', err);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete sales order ${orderNumber}?`)) return;
    try {
      const res = await fetch(`/api/v1/sales/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (drawerOrder && drawerOrder.id === orderId) {
          setDrawerOrder(null);
        }
        await fetchTradeSales();
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: SalesOrder['status']) => {
    try {
      const res = await fetch(`/api/v1/sales/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchTradeSales();
        if (drawerOrder && drawerOrder.id === orderId) {
          setDrawerOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const handleDownloadInvoice = (order: SalesOrder) => {
    if (!order.invoiceNumber) return;
    downloadCommercialInvoice({
      invoiceNumber: order.invoiceNumber,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      destinationPort: order.destinationPort,
      deliveryTerm: order.deliveryTerm,
      customerPo: order.customerPo,
      totalAmount: order.totalAmount,
      currency: order.currency,
      issueDate: order.createdAt,
      status: order.invoiceStatus || 'ISSUED',
    });
  };

  const handleGenerateInvoice = async (order: SalesOrder) => {
    setIsGeneratingInvoice(true);
    setInvoiceSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/sales/orders/${order.id}/generate-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.invoice) {
        setInvoiceSuccessMsg(`Commercial Invoice ${data.invoice.invoiceNumber} generated successfully! Finance module updated.`);
        await fetchTradeSales();
        if (drawerOrder && drawerOrder.id === order.id) {
          setDrawerOrder((prev) =>
            prev
              ? {
                  ...prev,
                  invoiceId: data.invoice.id,
                  invoiceNumber: data.invoice.invoiceNumber,
                  invoiceStatus: data.invoice.status,
                }
              : null
          );
        }
        // Immediately trigger download of the newly generated invoice
        downloadCommercialInvoice({
          invoiceNumber: data.invoice.invoiceNumber,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          destinationPort: order.destinationPort,
          deliveryTerm: order.deliveryTerm,
          customerPo: order.customerPo,
          totalAmount: order.totalAmount,
          currency: order.currency,
          issueDate: new Date().toISOString().split('T')[0],
          status: data.invoice.status || 'ISSUED',
        });
      } else {
        alert(data.error || data.message || 'Failed to generate invoice');
      }
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      alert('Network error while generating invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Sort handlers
  const handleSortQuote = (field: QuoteSortField) => {
    if (quoteSortField === field) {
      setQuoteSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setQuoteSortField(field);
      setQuoteSortDir('asc');
    }
  };

  const handleSortOrder = (field: OrderSortField) => {
    if (orderSortField === field) {
      setOrderSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderSortField(field);
      setOrderSortDir('asc');
    }
  };

  // Filtered & Sorted Quotes
  const filteredQuotes = useMemo(() => {
    return quotes
      .filter((q) => {
        const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          q.quoteNumber.toLowerCase().includes(query) ||
          q.customerName.toLowerCase().includes(query) ||
          q.country.toLowerCase().includes(query) ||
          q.currency.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[quoteSortField];
        const valB = b[quoteSortField];
        if (valA < valB) return quoteSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return quoteSortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [quotes, statusFilter, searchQuery, quoteSortField, quoteSortDir]);

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          o.orderNumber.toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query) ||
          o.customerPo.toLowerCase().includes(query) ||
          o.destinationPort.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[orderSortField];
        const valB = b[orderSortField];
        if (valA < valB) return orderSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return orderSortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [orders, statusFilter, searchQuery, orderSortField, orderSortDir]);

  // Export CSV
  const handleExportQuotesCsv = () => {
    exportToCsv(
      'polybridge-export-quotes',
      filteredQuotes as unknown as Record<string, unknown>[],
      [
        { key: 'quoteNumber', header: 'Quote #' },
        { key: 'version', header: 'Version' },
        { key: 'customerName', header: 'Customer' },
        { key: 'country', header: 'Destination' },
        { key: 'totalAmount', header: 'Total Amount ($)' },
        { key: 'marginPercent', header: 'Margin %' },
        { key: 'status', header: 'Status' },
        { key: 'validUntil', header: 'Valid Until' },
      ]
    );
  };

  const handleExportOrdersCsv = () => {
    exportToCsv(
      'polybridge-sales-orders',
      filteredOrders as unknown as Record<string, unknown>[],
      [
        { key: 'orderNumber', header: 'Order #' },
        { key: 'customerName', header: 'Customer' },
        { key: 'customerPo', header: 'Customer PO' },
        { key: 'quoteRef', header: 'Quote Ref' },
        { key: 'destinationPort', header: 'Destination Port' },
        { key: 'deliveryTerm', header: 'Delivery Term' },
        { key: 'totalAmount', header: 'Total Amount ($)' },
        { key: 'status', header: 'Status' },
        { key: 'createdAt', header: 'Date Confirmed' },
      ]
    );
  };

  // Filter chips
  const quoteFilterOptions = [
    { id: 'ALL', label: 'All Quotes', count: quotes.length },
    { id: 'APPROVED', label: 'Approved', count: quotes.filter((q) => q.status === 'APPROVED').length },
    { id: 'PENDING_APPROVAL', label: 'Pending Approval', count: quotes.filter((q) => q.status === 'PENDING_APPROVAL').length },
    { id: 'CONVERTED', label: 'Converted to SO', count: quotes.filter((q) => q.status === 'CONVERTED').length },
  ];

  const orderFilterOptions = [
    { id: 'ALL', label: 'All Orders', count: orders.length },
    { id: 'CONFIRMED', label: 'Confirmed', count: orders.filter((o) => o.status === 'CONFIRMED').length },
    { id: 'IN_TRANSIT', label: 'In Transit', count: orders.filter((o) => o.status === 'IN_TRANSIT').length },
    { id: 'FULFILLED', label: 'Fulfilled', count: orders.filter((o) => o.status === 'FULFILLED').length },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'CONFIRMED':
        return (
          <span className="badge badge-success">
            <span className="badge-dot" />
            {status}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="badge badge-primary">
            <span className="badge-dot" />
            {status}
          </span>
        );
      case 'SENT':
      case 'IN_TRANSIT':
        return (
          <span className="badge badge-warning">
            <span className="badge-dot" />
            {status}
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="badge badge-danger">
            <span className="badge-dot" />
            PENDING APPROVAL
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="badge badge-info">
            <span className="badge-dot" />
            CONVERTED
          </span>
        );
      default:
        return (
          <span className="badge badge-subtle">
            <span className="badge-dot" />
            {status}
          </span>
        );
    }
  };

  const renderSortIndicator = (currentField: string, targetField: string, dir: SortDirection) => {
    if (currentField !== targetField) {
      return <ArrowUpDown size={12} className="sort-icon-indicator" />;
    }
    return dir === 'asc' ? (
      <ArrowUp size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    ) : (
      <ArrowDown size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Module Controls Bar (Tabs & Action) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="segmented-control">
          <button
            onClick={() => {
              setActiveTab('quotes');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className={`segmented-btn ${activeTab === 'quotes' ? 'active' : ''}`}
          >
            <span>Export Quotes</span>
            <span className="segmented-btn-count">{quotes.length}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('orders');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className={`segmented-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <span>Sales Orders</span>
            <span className="segmented-btn-count">{orders.length}</span>
          </button>
        </div>

        {activeTab === 'quotes' ? (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setIsOtherBuyer(false);
              setCustomBuyerName('');
              if (buyers[0]) {
                setSelectedBuyer(buyers[0].name);
                setNewCountry(buyers[0].country);
              }
            }}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Create Quote</span>
          </button>
        ) : (
          <button
            onClick={() => setShowCreateOrderModal(true)}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Create Sales Order</span>
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="table-card">

        {/* Toolbar */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={activeTab === 'quotes' ? 'Search by quote #, customer, country...' : 'Search by order #, customer, PO ref, port...'}
          filterOptions={activeTab === 'quotes' ? quoteFilterOptions : orderFilterOptions}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onExportCsv={activeTab === 'quotes' ? handleExportQuotesCsv : handleExportOrdersCsv}
        />

        {/* Quotes View */}
        {activeTab === 'quotes' && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`th-sortable ${quoteSortField === 'quoteNumber' ? 'sorted' : ''}`}
                    onClick={() => handleSortQuote('quoteNumber')}
                  >
                    Quote # {renderSortIndicator(quoteSortField, 'quoteNumber', quoteSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${quoteSortField === 'customerName' ? 'sorted' : ''}`}
                    onClick={() => handleSortQuote('customerName')}
                  >
                    Buyer / Customer {renderSortIndicator(quoteSortField, 'customerName', quoteSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${quoteSortField === 'country' ? 'sorted' : ''}`}
                    onClick={() => handleSortQuote('country')}
                  >
                    Destination {renderSortIndicator(quoteSortField, 'country', quoteSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${quoteSortField === 'totalAmount' ? 'sorted' : ''}`}
                    onClick={() => handleSortQuote('totalAmount')}
                  >
                    Total Amount {renderSortIndicator(quoteSortField, 'totalAmount', quoteSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${quoteSortField === 'marginPercent' ? 'sorted' : ''}`}
                    onClick={() => handleSortQuote('marginPercent')}
                  >
                    Margin % {renderSortIndicator(quoteSortField, 'marginPercent', quoteSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${quoteSortField === 'status' ? 'sorted' : ''}`}
                    onClick={() => handleSortQuote('status')}
                  >
                    Status {renderSortIndicator(quoteSortField, 'status', quoteSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${quoteSortField === 'validUntil' ? 'sorted' : ''}`}
                    onClick={() => handleSortQuote('validUntil')}
                  >
                    Valid Until {renderSortIndicator(quoteSortField, 'validUntil', quoteSortDir)}
                  </th>
                  <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-loading-state">
                        <div className="table-spinner" />
                        <span className="table-loading-text">Loading export quotes from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty-state">
                        <div className="table-empty-state-icon">
                          <FileSpreadsheet size={24} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>No quotes match your filter</h4>
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ marginTop: '0.5rem' }}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <tr
                      key={q.id}
                      className="clickable-row"
                      onClick={() => setDrawerQuote(q)}
                    >
                      <td className="cell-code">
                        {q.quoteNumber}{' '}
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          v{q.version}
                        </span>
                      </td>
                      <td>
                        <div className="cell-primary">{q.customerName}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                          <Globe size={13} color="var(--primary-light)" />
                          <span>{q.country}</span>
                        </div>
                      </td>
                      <td className="cell-amount">
                        <div>
                          {q.currency === 'USD' ? '$' : ''}{q.totalAmount.toLocaleString()} {q.currency}
                        </div>
                        {q.currency !== 'USD' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', fontWeight: 500, marginTop: '2px' }}>
                            ≈ ${(q.totalAmountUsd ?? (q.totalAmount / (q.exchangeRateToUsd || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            {q.exchangeRateToUsd && <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>@{q.exchangeRateToUsd}</span>}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: q.marginPercent >= 15 ? 'var(--success)' : 'var(--danger)',
                          }}
                        >
                          {q.marginPercent}%
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="status-select-wrapper">
                          <select
                            value={q.status}
                            onChange={(e) => handleUpdateQuoteStatus(q.id, e.target.value as Quote['status'])}
                            className={`status-select-pill ${
                              q.status === 'APPROVED' || q.status === 'ACCEPTED'
                                ? 'badge-success'
                                : q.status === 'PENDING_APPROVAL'
                                ? 'badge-warning'
                                : q.status === 'CONVERTED'
                                ? 'badge-primary'
                                : q.status === 'REJECTED'
                                ? 'badge-danger'
                                : 'badge-info'
                            }`}
                            title="Click to change status"
                          >
                            <option value="DRAFT">● DRAFT</option>
                            <option value="PENDING_APPROVAL">● PENDING APPROVAL</option>
                            <option value="APPROVED">● APPROVED</option>
                            <option value="SENT">● SENT</option>
                            <option value="ACCEPTED">● ACCEPTED</option>
                            <option value="REJECTED">● REJECTED</option>
                            <option value="CONVERTED">● CONVERTED</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.validUntil}</span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          {q.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApprove(q.id)}
                              className="btn btn-sm btn-success"
                              title="Approve Quote for Export"
                            >
                              <CheckCircle size={13} />
                              <span>Approve</span>
                            </button>
                          )}
                          {(q.status === 'ACCEPTED' || q.status === 'APPROVED') && (
                            <button
                              onClick={() => handleConvert(q.id)}
                              className="btn btn-sm btn-primary"
                              title="Convert to Confirmed Sales Order"
                            >
                              <ArrowRightCircle size={13} />
                              <span>Convert</span>
                            </button>
                          )}
                          {q.status === 'CONVERTED' && (
                            <button
                              onClick={() => {
                                setSearchQuery(q.quoteNumber);
                                setActiveTab('orders');
                              }}
                              className="btn btn-sm btn-outline"
                              style={{ color: 'var(--primary-light)', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                              title="View Confirmed Sales Order in Orders Tab"
                            >
                              <ArrowRightCircle size={13} />
                              <span>View SO</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditQuote(q)}
                            className="btn btn-sm btn-ghost btn-icon"
                            title="Edit quotation"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuote(q.id, q.quoteNumber)}
                            className="btn btn-sm btn-ghost btn-icon"
                            style={{ color: 'var(--danger)' }}
                            title="Delete quotation"
                          >
                            <Trash2 size={15} />
                          </button>
                          <button
                            onClick={() => setDrawerQuote(q)}
                            className="btn btn-sm btn-ghost btn-icon"
                            title="Inspect Quote & Line Items"
                          >
                            <Eye size={15} />
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

        {/* Orders View */}
        {activeTab === 'orders' && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className={`th-sortable ${orderSortField === 'orderNumber' ? 'sorted' : ''}`}
                    onClick={() => handleSortOrder('orderNumber')}
                  >
                    Order # {renderSortIndicator(orderSortField, 'orderNumber', orderSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${orderSortField === 'customerName' ? 'sorted' : ''}`}
                    onClick={() => handleSortOrder('customerName')}
                  >
                    Customer Account {renderSortIndicator(orderSortField, 'customerName', orderSortDir)}
                  </th>
                  <th>PO Reference</th>
                  <th
                    className={`th-sortable ${orderSortField === 'destinationPort' ? 'sorted' : ''}`}
                    onClick={() => handleSortOrder('destinationPort')}
                  >
                    Destination Port {renderSortIndicator(orderSortField, 'destinationPort', orderSortDir)}
                  </th>
                  <th>Delivery Terms</th>
                  <th
                    className={`th-sortable ${orderSortField === 'totalAmount' ? 'sorted' : ''}`}
                    onClick={() => handleSortOrder('totalAmount')}
                  >
                    Total Amount {renderSortIndicator(orderSortField, 'totalAmount', orderSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${orderSortField === 'status' ? 'sorted' : ''}`}
                    onClick={() => handleSortOrder('status')}
                  >
                    Status {renderSortIndicator(orderSortField, 'status', orderSortDir)}
                  </th>
                  <th
                    className={`th-sortable ${orderSortField === 'createdAt' ? 'sorted' : ''}`}
                    onClick={() => handleSortOrder('createdAt')}
                  >
                    Confirmed Date {renderSortIndicator(orderSortField, 'createdAt', orderSortDir)}
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
                        <span className="table-loading-text">Loading sales orders from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="table-empty-state">
                        <div className="table-empty-state-icon">
                          <ShoppingBag size={24} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>No confirmed sales orders found</h4>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="clickable-row"
                      onClick={() => setDrawerOrder(o)}
                    >
                      <td className="cell-code">{o.orderNumber}</td>
                      <td>
                        <div className="cell-primary">{o.customerName}</div>
                      </td>
                      <td className="cell-code" style={{ color: 'var(--text-secondary)' }}>
                        {o.customerPo}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={13} color="var(--primary-light)" />
                          <span>{o.destinationPort}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-subtle">{o.deliveryTerm}</span>
                      </td>
                      <td className="cell-amount">
                        <div>
                          {o.currency === 'USD' ? '$' : ''}{o.totalAmount.toLocaleString()} {o.currency}
                        </div>
                        {o.currency !== 'USD' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', fontWeight: 500, marginTop: '2px' }}>
                            ≈ ${(o.totalAmountUsd ?? (o.totalAmount / (o.exchangeRateToUsd || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            {o.exchangeRateToUsd && <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>@{o.exchangeRateToUsd}</span>}
                          </div>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                          <div className="status-select-wrapper">
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as SalesOrder['status'])}
                              className={`status-select-pill ${
                                o.status === 'CONFIRMED'
                                  ? 'badge-success'
                                  : o.status === 'IN_TRANSIT'
                                  ? 'badge-warning'
                                  : o.status === 'FULFILLED'
                                  ? 'badge-primary'
                                  : o.status === 'CANCELLED'
                                  ? 'badge-danger'
                                  : 'badge-info'
                              }`}
                              title="Click to change order status"
                            >
                              <option value="CONFIRMED">● CONFIRMED</option>
                              <option value="SOURCING">● SOURCING</option>
                              <option value="PROCESSING">● PROCESSING</option>
                              <option value="IN_TRANSIT">● IN TRANSIT</option>
                              <option value="FULFILLED">● FULFILLED</option>
                              <option value="CANCELLED">● CANCELLED</option>
                            </select>
                          </div>
                          {o.invoiceNumber ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadInvoice(o);
                              }}
                              className="badge badge-success"
                              style={{
                                fontSize: '0.68rem',
                                padding: '3px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                fontWeight: 600,
                                borderRadius: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Click to download Commercial Invoice ${o.invoiceNumber}`}
                            >
                              <FileText size={11} /> {o.invoiceNumber}
                              <Download size={10} style={{ marginLeft: '2px' }} />
                            </button>
                          ) : o.status === 'FULFILLED' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateInvoice(o);
                              }}
                              disabled={isGeneratingInvoice}
                              className="btn btn-xs btn-primary"
                              style={{ fontSize: '0.68rem', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                              title="Click to generate and download Commercial Invoice"
                            >
                              <Plus size={10} /> Generate Invoice
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.createdAt}</td>
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenEditOrder(o)}
                            className="btn btn-sm btn-ghost btn-icon"
                            title="Edit sales order"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(o.id, o.orderNumber)}
                            className="btn btn-sm btn-ghost btn-icon"
                            style={{ color: 'var(--danger)' }}
                            title="Delete sales order"
                          >
                            <Trash2 size={15} />
                          </button>
                          <button
                            onClick={() => setDrawerOrder(o)}
                            className="btn btn-sm btn-outline"
                            title="Inspect Order Details"
                          >
                            <Eye size={13} />
                            <span>Details</span>
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
            Showing {activeTab === 'quotes' ? filteredQuotes.length : filteredOrders.length} records
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Click any row to view breakdown and execution actions.
          </span>
        </div>
      </div>

      {/* QUOTE INSPECTION DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerQuote)}
        onClose={() => setDrawerQuote(null)}
        title={drawerQuote?.quoteNumber || 'Export Quotation'}
        subtitle={`Customer: ${drawerQuote?.customerName} • Destination: ${drawerQuote?.country}`}
        badge={drawerQuote ? getStatusBadge(drawerQuote.status) : null}
        footer={
          drawerQuote ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleOpenEditQuote(drawerQuote)}
                  className="btn btn-sm btn-outline"
                  title="Edit quotation"
                >
                  <Pencil size={14} />
                  <span>Edit Quote</span>
                </button>
                <button
                  onClick={() => handleDeleteQuote(drawerQuote.id, drawerQuote.quoteNumber)}
                  className="btn btn-sm btn-outline"
                  style={{ color: 'var(--danger)' }}
                  title="Delete quotation"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {drawerQuote.status === 'PENDING_APPROVAL' && (
                  <button
                    onClick={() => handleApprove(drawerQuote.id)}
                    className="btn btn-sm btn-success"
                  >
                    <CheckCircle size={14} />
                    <span>Approve</span>
                  </button>
                )}
                {(drawerQuote.status === 'ACCEPTED' || drawerQuote.status === 'APPROVED') && (
                  <button
                    onClick={() => handleConvert(drawerQuote.id)}
                    className="btn btn-sm btn-primary"
                  >
                    <ArrowRightCircle size={14} />
                    <span>Convert to Order</span>
                  </button>
                )}
                {drawerQuote.status === 'CONVERTED' && (
                  <button
                    onClick={() => {
                      setSearchQuery(drawerQuote.quoteNumber);
                      setDrawerQuote(null);
                      setActiveTab('orders');
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    <ArrowRightCircle size={14} />
                    <span>View Confirmed Order</span>
                  </button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {drawerQuote && (
          <>
            <div className="drawer-section">
              <div className="drawer-section-title">
                <DollarSign size={14} color="var(--primary-light)" />
                Financial & Commercial Summary
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Total Commercial Price</span>
                  <span className="drawer-stat-value cell-amount" style={{ fontSize: '1.25rem', color: 'var(--primary-light)' }}>
                    {drawerQuote.currency === 'USD' ? '$' : ''}{drawerQuote.totalAmount.toLocaleString()} {drawerQuote.currency}
                  </span>
                  {drawerQuote.currency !== 'USD' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', marginTop: '2px' }}>
                      ≈ ${(drawerQuote.totalAmountUsd ?? (drawerQuote.totalAmount / (drawerQuote.exchangeRateToUsd || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      {drawerQuote.exchangeRateToUsd && <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>@{drawerQuote.exchangeRateToUsd}</span>}
                    </div>
                  )}
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Calculated Profit Margin</span>
                  <span
                    className="drawer-stat-value"
                    style={{
                      fontSize: '1.25rem',
                      fontFamily: 'var(--font-mono)',
                      color: drawerQuote.marginPercent >= 15 ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {drawerQuote.marginPercent}%
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Total Procurement Cost</span>
                  <span className="drawer-stat-value cell-amount">${drawerQuote.totalCost.toLocaleString()}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Quotation Validity</span>
                  <span className="drawer-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} color="var(--text-muted)" />
                    {drawerQuote.validUntil}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Layers size={14} color="var(--primary-light)" />
                Quotation Line Items Breakdown
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table compact" style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>SKU & Description</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                      <th>Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerQuote.lines?.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.productName}</div>
                          <div className="cell-code" style={{ fontSize: '0.72rem' }}>{line.productSku}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {line.quantity} {line.uom}
                        </td>
                        <td className="cell-amount">${line.unitCost}</td>
                        <td className="cell-amount">${line.unitPrice}</td>
                        <td className="cell-amount" style={{ color: 'var(--primary-light)' }}>
                          ${line.lineTotal?.toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: line.marginPercent >= 15 ? 'var(--success)' : 'var(--danger)' }}>
                          {line.marginPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trade Documents Vault for Quote */}
            <div style={{ marginTop: '1.25rem' }}>
              <TradeDocumentVault
                entityType="QUOTE"
                entityId={drawerQuote.id}
                entityReference={drawerQuote.quoteNumber}
                title="Quotation Specifications & Inquiry Documents"
                subtitle="Attach Buyer RFQ, Technical Data Sheet (TDS/CoA), Supplier Offer Sheet, and Signed Acceptance"
              />
            </div>
          </>
        )}
      </DetailDrawer>

      {/* SALES ORDER INSPECTION DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerOrder)}
        onClose={() => setDrawerOrder(null)}
        title={drawerOrder?.orderNumber || 'Confirmed Sales Order'}
        subtitle={`Customer: ${drawerOrder?.customerName} • PO: ${drawerOrder?.customerPo}`}
        badge={drawerOrder ? getStatusBadge(drawerOrder.status) : null}
        footer={
          drawerOrder ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleOpenEditOrder(drawerOrder)}
                className="btn btn-sm btn-outline"
                title="Edit sales order"
              >
                <Pencil size={14} />
                <span>Edit Order</span>
              </button>
              <button
                onClick={() => handleDeleteOrder(drawerOrder.id, drawerOrder.orderNumber)}
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--danger)' }}
                title="Delete sales order"
              >
                <Trash2 size={14} />
                <span>Delete Order</span>
              </button>
              {!drawerOrder.invoiceNumber && drawerOrder.status === 'FULFILLED' ? (
                <button
                  type="button"
                  onClick={() => handleGenerateInvoice(drawerOrder)}
                  disabled={isGeneratingInvoice}
                  className="btn btn-sm btn-primary"
                  title="Generate Commercial Invoice in Finance"
                >
                  <FileText size={14} />
                  <span>{isGeneratingInvoice ? 'Generating Invoice...' : 'Generate Invoice'}</span>
                </button>
              ) : drawerOrder.invoiceNumber ? (
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(drawerOrder)}
                  className="btn btn-sm btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="Download Commercial Invoice"
                >
                  <Download size={14} />
                  <span>Download Invoice ({drawerOrder.invoiceNumber})</span>
                </button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {drawerOrder && (
          <>
            <div className="drawer-section">
              <div className="drawer-section-title">
                <ShoppingBag size={14} color="var(--primary-light)" />
                Sales Contract Execution Terms
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Sales Order #</span>
                  <span className="drawer-stat-value cell-code">{drawerOrder.orderNumber}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Associated Quote Ref</span>
                  <span className="drawer-stat-value cell-code">{drawerOrder.quoteRef}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Total Commercial Value</span>
                  <span className="drawer-stat-value cell-amount" style={{ fontSize: '1.2rem', color: 'var(--primary-light)' }}>
                    {drawerOrder.currency === 'USD' ? '$' : ''}{drawerOrder.totalAmount.toLocaleString()} {drawerOrder.currency}
                  </span>
                  {drawerOrder.currency !== 'USD' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', marginTop: '2px' }}>
                      ≈ ${(drawerOrder.totalAmountUsd ?? (drawerOrder.totalAmount / (drawerOrder.exchangeRateToUsd || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      {drawerOrder.exchangeRateToUsd && <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>@{drawerOrder.exchangeRateToUsd}</span>}
                    </div>
                  )}
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Destination Discharge Port</span>
                  <span className="drawer-stat-value">{drawerOrder.destinationPort}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Delivery Incoterm</span>
                  <span className="drawer-stat-value">
                    <span className="badge badge-subtle">{drawerOrder.deliveryTerm}</span>
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Date Confirmed</span>
                  <span className="drawer-stat-value">{drawerOrder.createdAt}</span>
                </div>
              </div>
            </div>

            {/* Commercial Invoicing & Finance Receivables */}
            <div className="drawer-section" style={{ marginTop: '1.25rem' }}>
              <div className="drawer-section-title">
                <FileText size={14} color="var(--primary-light)" />
                Commercial Invoicing & Accounts Receivable
              </div>

              {drawerOrder.invoiceNumber ? (
                <div className="card" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={16} color="var(--success)" />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Official Commercial Invoice Issued</span>
                    </div>
                    <span className="badge badge-success">{drawerOrder.invoiceStatus || 'ISSUED'}</span>
                  </div>
                  <div className="drawer-grid" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <div className="drawer-stat">
                      <span className="drawer-stat-label">Invoice Number</span>
                      <span className="drawer-stat-value cell-code">{drawerOrder.invoiceNumber}</span>
                    </div>
                    <div className="drawer-stat">
                      <span className="drawer-stat-label">Total Invoiced</span>
                      <span className="drawer-stat-value cell-amount" style={{ color: 'var(--success)' }}>
                        ${drawerOrder.totalAmount.toLocaleString()} {drawerOrder.currency}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Commercial invoice is active in <strong>Finance & Invoices</strong>. Track inward SWIFT wire remittance and settlement there.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(drawerOrder)}
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center', gap: '0.4rem', fontWeight: 600 }}
                  >
                    <Download size={14} />
                    <span>Download Commercial Invoice ({drawerOrder.invoiceNumber})</span>
                  </button>
                  {onNavigateToFinance && (
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOrder(null);
                        onNavigateToFinance();
                      }}
                      className="btn btn-sm btn-outline"
                      style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <ExternalLink size={13} />
                      <span>Open in Finance & Invoices Module</span>
                    </button>
                  )}
                </div>
              ) : drawerOrder.status === 'FULFILLED' ? (
                <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      Pending Customer Invoice
                    </span>
                    <span className="badge badge-primary">● Ready for Billing</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0.85rem', lineHeight: 1.45 }}>
                    Order fulfillment is complete! Click below to issue the official Commercial Invoice. This records ${drawerOrder.totalAmount.toLocaleString()} {drawerOrder.currency} in Finance as an Account Receivable.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateInvoice(drawerOrder)}
                    disabled={isGeneratingInvoice}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1rem', gap: '0.5rem', fontWeight: 600 }}
                  >
                    <FileText size={15} />
                    <span>
                      {isGeneratingInvoice
                        ? 'Generating Commercial Invoice...'
                        : `Generate Commercial Invoice ($${drawerOrder.totalAmount.toLocaleString()} ${drawerOrder.currency})`}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      Commercial Invoicing
                    </span>
                    <span className="badge badge-subtle">{drawerOrder.status}</span>
                  </div>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Order is currently <strong>{drawerOrder.status}</strong>. Commercial invoice generation becomes available once the order reaches <strong>FULFILLED</strong> status.
                  </p>
                </div>
              )}

              {invoiceSuccessMsg && (
                <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <CheckCircle size={15} />
                  <span>{invoiceSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Trade Documents Vault for Sales Order */}
            <div style={{ marginTop: '1.25rem' }}>
              <TradeDocumentVault
                entityType="SALES_ORDER"
                entityId={drawerOrder.id}
                entityReference={drawerOrder.orderNumber}
                title="Sales Order Contracts & Trade Documents"
                subtitle="Upload & manage Customer Purchase Order (PO), Sales Contract, Letter of Credit, and Advance Payment SWIFT"
              />
            </div>
          </>
        )}
      </DetailDrawer>

      {/* Create Quote Modal */}
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Create Commercial Export Quote</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Buyer Company Name *
                </label>
                <select
                  value={isOtherBuyer ? '__OTHER__' : selectedBuyer}
                  onChange={(e) => handleBuyerChange(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                >
                  <optgroup label="Verified Existing Buyers">
                    {buyers.map((imp) => (
                      <option key={imp.name} value={imp.name}>
                        {imp.name} ({imp.country})
                      </option>
                    ))}
                  </optgroup>
                  <option value="__OTHER__">✨ + Other (Enter New Buyer Manually)</option>
                </select>
                {!isOtherBuyer && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>✓ Verified Buyer Selected</span>
                  </div>
                )}
              </div>

              {isOtherBuyer && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--primary-light)' }}>
                    Type New Buyer Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tokyo Spice Imports Co."
                    value={customBuyerName}
                    onChange={(e) => setCustomBuyerName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Destination Country *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. United Arab Emirates"
                  value={newCountry}
                  onChange={(e) => {
                    setNewCountry(e.target.value);
                    const autoCur = getCurrencyForCountry(e.target.value);
                    if (autoCur && autoCur !== 'USD') {
                      setQuoteCurrency(autoCur);
                    }
                  }}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              {/* Multi-Currency & Live FX Rate Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--primary-light)' }}>
                    Commercial Currency *
                  </label>
                  <select
                    value={quoteCurrency}
                    onChange={(e) => setQuoteCurrency(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                  >
                    <option value="USD">USD — US Dollar (Base Benchmark)</option>
                    {markets.filter(m => m.currencyCode !== 'USD').map((m) => (
                      <option key={m.id || m.currencyCode} value={m.currencyCode}>
                        {m.currencyCode} — {m.countryName} ({m.currencyName})
                      </option>
                    ))}
                    <option value="EUR">EUR — Eurozone (Euro)</option>
                    <option value="GBP">GBP — United Kingdom (Pound)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Live Exchange Rate to USD
                  </label>
                  <div style={{
                    padding: '0.55rem 0.65rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '38px',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>1 USD =</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-light)' }}>
                      {quoteCurrency === 'USD'
                        ? '1.0000 USD'
                        : `${(markets.find(m => m.currencyCode === quoteCurrency)?.exchangeRateToUsd ?? 1).toFixed(4)} ${quoteCurrency}`}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Product SKU</label>
                  <select
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="SPICE-TUR-WHOLE">SPICE-TUR-WHOLE (Turmeric Whole Dried Fingers)</option>
                    <option value="SPICE-CUM-SEEDS">SPICE-CUM-SEEDS (Cumin Seeds Machine Cleaned)</option>
                    <option value="SPICE-CHI-TEJA">SPICE-CHI-TEJA (Red Chilli Teja Stemless)</option>
                    <option value="FRUIT-POM-BHAGWA">FRUIT-POM-BHAGWA (Bhagwa Fresh Pomegranates)</option>
                    <option value="PKG-FIBC-1000">PKG-FIBC-1000 (FIBC Jumbo Bags 1000kg)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Quantity (MT)</label>
                  <input
                    type="number"
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>FOB Unit Cost ({quoteCurrency}/MT)</label>
                  <input
                    type="number"
                    required
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Quotation Price ({quoteCurrency}/MT)</label>
                  <input
                    type="number"
                    required
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              {/* Real-time FX Calculation & Normalized USD Equivalent */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Total Contract Value:</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {((parseFloat(newQty) || 0) * (parseFloat(newUnitPrice) || 0)).toLocaleString()} {quoteCurrency}
                  </div>
                </div>
                {quoteCurrency !== 'USD' && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Normalized USD Base:</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-light)', fontFamily: 'var(--font-mono)' }}>
                      ≈ ${(((parseFloat(newQty) || 0) * (parseFloat(newUnitPrice) || 0)) / (markets.find(m => m.currencyCode === quoteCurrency)?.exchangeRateToUsd || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Gross Margin:</div>
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: (((parseFloat(newUnitPrice) || 0) - (parseFloat(newUnitCost) || 0)) / (parseFloat(newUnitPrice) || 1)) >= 0.15 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {(((parseFloat(newUnitPrice) || 0) - (parseFloat(newUnitCost) || 0)) / (parseFloat(newUnitPrice) || 1) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Calculating...' : 'Create & Calculate Margin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Quote Modal */}
      {showEditQuoteModal && editingQuote && (
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
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Edit Quotation ({editingQuote.quoteNumber})</h3>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowEditQuoteModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveEditQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Buyer Company Name *</label>
                <input
                  type="text"
                  required
                  value={editingQuote.customerName}
                  onChange={(e) => setEditingQuote({ ...editingQuote, customerName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Destination Country</label>
                  <input
                    type="text"
                    required
                    value={editingQuote.country}
                    onChange={(e) => setEditingQuote({ ...editingQuote, country: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Status</label>
                  <select
                    value={editingQuote.status}
                    onChange={(e) => setEditingQuote({ ...editingQuote, status: e.target.value as Quote['status'] })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="SENT">SENT</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="CONVERTED">CONVERTED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Total Commercial Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={editingQuote.totalAmount}
                    onChange={(e) => setEditingQuote({ ...editingQuote, totalAmount: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Valid Until Date</label>
                  <input
                    type="date"
                    required
                    value={editingQuote.validUntil}
                    onChange={(e) => setEditingQuote({ ...editingQuote, validUntil: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditQuoteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Sales Order Modal */}
      {showCreateOrderModal && (
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
          <div className="card" style={{ maxWidth: '520px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} color="var(--primary-light)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Create Direct Sales Order</h3>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowCreateOrderModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Customer Account Name</label>
                <input
                  type="text"
                  required
                  value={orderCustomer}
                  onChange={(e) => setOrderCustomer(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Customer PO Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-ALMADINA-9912"
                    value={orderPo}
                    onChange={(e) => setOrderPo(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Quote Ref (optional)</label>
                  <input
                    type="text"
                    value={orderQuoteRef}
                    onChange={(e) => setOrderQuoteRef(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              {/* Multi-Currency & Live FX Rate Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--primary-light)' }}>
                    Contract Currency *
                  </label>
                  <select
                    value={orderCurrency}
                    onChange={(e) => setOrderCurrency(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                  >
                    <option value="USD">USD — US Dollar (Base Benchmark)</option>
                    {markets.filter(m => m.currencyCode !== 'USD').map((m) => (
                      <option key={m.id || m.currencyCode} value={m.currencyCode}>
                        {m.currencyCode} — {m.countryName} ({m.currencyName})
                      </option>
                    ))}
                    <option value="EUR">EUR — Eurozone (Euro)</option>
                    <option value="GBP">GBP — United Kingdom (Pound)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Exchange Rate to USD
                  </label>
                  <div style={{
                    padding: '0.55rem 0.65rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '38px',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>1 USD =</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-light)' }}>
                      {orderCurrency === 'USD'
                        ? '1.0000 USD'
                        : `${(markets.find(m => m.currencyCode === orderCurrency)?.exchangeRateToUsd ?? 1).toFixed(4)} ${orderCurrency}`}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Total Commercial Amount ({orderCurrency})
                  </label>
                  <input
                    type="number"
                    required
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                  {orderCurrency !== 'USD' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', marginTop: '4px', fontWeight: 500 }}>
                      ≈ ${((parseFloat(orderAmount) || 0) / (markets.find(m => m.currencyCode === orderCurrency)?.exchangeRateToUsd || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Destination Port</label>
                  <input
                    type="text"
                    value={orderDestinationPort}
                    onChange={(e) => setOrderDestinationPort(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Delivery Term</label>
                <input
                  type="text"
                  value={orderDeliveryTerm}
                  onChange={(e) => setOrderDeliveryTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateOrderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sales Order Modal */}
      {showEditOrderModal && editingOrder && (
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
          <div className="card" style={{ maxWidth: '520px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pencil size={18} color="var(--primary-light)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Edit Order ({editingOrder.orderNumber})</h3>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowEditOrderModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveEditOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Customer Account Name</label>
                <input
                  type="text"
                  required
                  value={editingOrder.customerName}
                  onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Customer PO Ref</label>
                  <input
                    type="text"
                    value={editingOrder.customerPo}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerPo: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Order Status</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as SalesOrder['status'] })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="SOURCING">SOURCING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="IN_TRANSIT">IN TRANSIT</option>
                    <option value="FULFILLED">FULFILLED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Total Commercial Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={editingOrder.totalAmount}
                    onChange={(e) => setEditingOrder({ ...editingOrder, totalAmount: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Destination Port</label>
                  <input
                    type="text"
                    value={editingOrder.destinationPort}
                    onChange={(e) => setEditingOrder({ ...editingOrder, destinationPort: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Delivery Terms</label>
                <input
                  type="text"
                  value={editingOrder.deliveryTerm}
                  onChange={(e) => setEditingOrder({ ...editingOrder, deliveryTerm: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditOrderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

