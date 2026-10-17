// Realistic seed data reflecting Polybridge Ventures LLP business operations
// India-based international trading, export, and sourcing partner

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department: string;
  subdepartment: string;
  designation: string;
  role: string;
  dataScope: string;
  approvalLimit: number;
  reportingTo?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  isMfaEnabled?: boolean;
  createdAt?: string;
}

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    email: 'partner@polybridgeventures.com',
    name: 'Rahul Patel',
    firstName: 'Rahul',
    lastName: 'Patel',
    department: 'Executive Management',
    subdepartment: 'Managing Desk',
    designation: 'Managing Partner',
    role: 'ADMINISTRATOR',
    dataScope: 'GLOBAL',
    approvalLimit: 500000,
    phone: '+91 98201 44211',
    reportingTo: 'Board of Partners',
    status: 'ACTIVE',
    isMfaEnabled: true,
    createdAt: '2026-01-05T09:00:00.000Z',
  },
  {
    id: 'usr-2',
    email: 'trader@polybridgeventures.com',
    name: 'Amit Sharma',
    firstName: 'Amit',
    lastName: 'Sharma',
    department: 'International Sales',
    subdepartment: 'Spices & Agro Desk',
    designation: 'Senior Export Trader',
    role: 'SALES_MANAGER',
    dataScope: 'TEAM_AND_SUBORDINATES',
    approvalLimit: 100000,
    phone: '+91 98112 55301',
    reportingTo: 'Rahul Patel',
    status: 'ACTIVE',
    isMfaEnabled: true,
    createdAt: '2026-01-10T10:30:00.000Z',
  },
  {
    id: 'usr-3',
    email: 'sourcing@polybridgeventures.com',
    name: 'Priya Desai',
    firstName: 'Priya',
    lastName: 'Desai',
    department: 'Sourcing & Procurement',
    subdepartment: 'Vendor Relations',
    designation: 'Sourcing Specialist',
    role: 'PROCUREMENT_MANAGER',
    dataScope: 'DEPARTMENT',
    approvalLimit: 50000,
    phone: '+91 98334 77120',
    reportingTo: 'Rahul Patel',
    status: 'ACTIVE',
    isMfaEnabled: true,
    createdAt: '2026-01-15T11:15:00.000Z',
  },
  {
    id: 'usr-4',
    email: 'logistics@polybridgeventures.com',
    name: 'Vikram Joshi',
    firstName: 'Vikram',
    lastName: 'Joshi',
    department: 'Logistics & Fulfilment',
    subdepartment: 'Shipping Operations',
    designation: 'Logistics Officer',
    role: 'OPERATIONS_SPECIALIST',
    dataScope: 'DEPARTMENT',
    approvalLimit: 25000,
    phone: '+91 98450 66890',
    reportingTo: 'Rahul Patel',
    status: 'ACTIVE',
    isMfaEnabled: false,
    createdAt: '2026-02-01T08:45:00.000Z',
  },
  {
    id: 'usr-5',
    email: 'finance@polybridgeventures.com',
    name: 'Neha Singhania',
    firstName: 'Neha',
    lastName: 'Singhania',
    department: 'Trade Finance',
    subdepartment: 'Letter of Credit & Treasury',
    designation: 'Finance Controller',
    role: 'FINANCE_CONTROLLER',
    dataScope: 'GLOBAL',
    approvalLimit: 250000,
    phone: '+91 98710 33441',
    reportingTo: 'Rahul Patel',
    status: 'ACTIVE',
    isMfaEnabled: true,
    createdAt: '2026-02-10T09:20:00.000Z',
  },
  {
    id: 'usr-6',
    email: 'compliance@polybridgeventures.com',
    name: 'Ananya Verma',
    firstName: 'Ananya',
    lastName: 'Verma',
    department: 'Governance & Compliance',
    subdepartment: 'Sanctions & KYC Screening',
    designation: 'Compliance Officer',
    role: 'AUDITOR',
    dataScope: 'GLOBAL',
    approvalLimit: 0,
    phone: '+91 98920 88712',
    reportingTo: 'Rahul Patel',
    status: 'ACTIVE',
    isMfaEnabled: true,
    createdAt: '2026-02-20T14:00:00.000Z',
  },
];

export interface ProductItem {
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

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    sku: 'SPICE-TUR-WHOLE',
    name: 'Turmeric Whole Dried Fingers (Salem Grade)',
    category: 'Indian Spices – Whole & Ground',
    uom: 'MT',
    standardCost: 1650,
    standardPrice: 2050,
    currency: 'USD',
    description: 'Natural dried turmeric fingers, deep yellow color, Curcumin 3.2% min, moisture < 10%.',
  },
  {
    id: 'prod-2',
    sku: 'SPICE-TUR-POW',
    name: 'Turmeric Powder (Fine Mesh 80-100)',
    category: 'Indian Spices – Whole & Ground',
    uom: 'MT',
    standardCost: 1850,
    standardPrice: 2300,
    currency: 'USD',
    description: 'Pure ground turmeric powder, steam sterilized, no artificial coloring.',
  },
  {
    id: 'prod-3',
    sku: 'SPICE-CUM-SEEDS',
    name: 'Cumin Seeds (Machine Cleaned 99% Purity)',
    category: 'Indian Spices – Whole & Ground',
    uom: 'MT',
    standardCost: 3100,
    standardPrice: 3850,
    currency: 'USD',
    description: 'Export quality bold cumin seeds (Jeera) from Gujarat/Rajasthan with strong aroma.',
  },
  {
    id: 'prod-4',
    sku: 'SPICE-PEP-BLACK',
    name: 'Black Pepper (Malabar Garbled 550GL)',
    category: 'Indian Spices – Whole & Ground',
    uom: 'MT',
    standardCost: 6200,
    standardPrice: 7400,
    currency: 'USD',
    description: 'Whole dried black peppercorns from Kerala, density 550 g/L minimum, piperine rich.',
  },
  {
    id: 'prod-5',
    sku: 'SPICE-CHI-TEJA',
    name: 'Dry Red Chilli (S17 Teja Stemless)',
    category: 'Indian Spices – Whole & Ground',
    uom: 'MT',
    standardCost: 2800,
    standardPrice: 3450,
    currency: 'USD',
    description: 'High pungency dry red chillies (Guntur/Byadgi), 70,000 to 90,000 SHU heat value.',
  },
  {
    id: 'prod-6',
    sku: 'FRUIT-BAN-CAV',
    name: 'Fresh Cavendish Bananas (Class A Premium)',
    category: 'Fresh Fruits from India',
    uom: 'BOX',
    standardCost: 7.5,
    standardPrice: 11.2,
    currency: 'USD',
    description: 'Export quality fresh green bananas packed in 13kg net weight cartons, calibrated length 18cm+.',
  },
  {
    id: 'prod-7',
    sku: 'FRUIT-POM-BHAG',
    name: 'Fresh Pomegranates (Bhagwa Variety)',
    category: 'Fresh Fruits from India',
    uom: 'BOX',
    standardCost: 9.0,
    standardPrice: 14.5,
    currency: 'USD',
    description: 'Ruby red arils, sweet flavor, calibrated sizes 250g-350g in 3.5kg export boxes.',
  },
  {
    id: 'prod-8',
    sku: 'VEG-ONI-NASHIK',
    name: 'Fresh Red Onions (Medium 45-55mm)',
    category: 'Fresh Vegetables from India',
    uom: 'MT',
    standardCost: 320,
    standardPrice: 480,
    currency: 'USD',
    description: 'Well-cured red onions from Nashik, packed in 25kg red mesh breathable bags.',
  },
  {
    id: 'prod-9',
    sku: 'PACK-FIBC-1000',
    name: 'FIBC Jumbo Bags (1000kg Capacity, 4-Loop Coated)',
    category: 'Industrial & Commercial Packaging',
    uom: 'PCS',
    standardCost: 9.2,
    standardPrice: 13.8,
    currency: 'USD',
    description: 'UV stabilized PP woven big bags with discharge spout, safety factor 5:1.',
  },
  {
    id: 'prod-10',
    sku: 'PACK-PP-50KG',
    name: 'PP Woven Sacks (50kg Agri & Chemical Packaging)',
    category: 'Industrial & Commercial Packaging',
    uom: 'BAG',
    standardCost: 0.35,
    standardPrice: 0.58,
    currency: 'USD',
    description: 'Laminated white PP woven sacks with anti-slip weave, size 24x38 inches.',
  },
];

export interface LeadItem {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED';
  notes: string;
  date: string;
  leadType?: 'BUYER' | 'SUPPLIER';
  convertedAccountId?: string;
  convertedType?: 'BUYER' | 'SUPPLIER';
  convertedSupplierCode?: string;
}

export const INITIAL_LEADS: LeadItem[] = [
  {
    id: 'lead-1',
    name: 'Tariq Mansoor',
    company: 'Gulf Commodities Trading LLC',
    email: 'tariq@gulfcommodities.ae',
    phone: '+971 50 123 4567',
    country: 'United Arab Emirates',
    source: 'Website Quote Request',
    status: 'QUALIFIED',
    notes: 'Interested in 2 FCL (56 MT) of Salem Turmeric Whole Fingers CIF Jebel Ali.',
    date: '2026-10-12',
  },
  {
    id: 'lead-2',
    name: 'Jean Dupont',
    company: 'Bordeaux Agro Services',
    email: 'j.dupont@bordeauxagro.fr',
    phone: '+33 556 012 345',
    country: 'France',
    source: 'Trade Fair Dubai',
    status: 'NEW',
    notes: 'Requires technical specification sheet for Cumin seeds and Red Chilli Teja.',
    date: '2026-10-13',
  },
  {
    id: 'lead-3',
    name: 'Kwame Mensah',
    company: 'Accra Packaging & Supplies Ltd',
    email: 'kmensah@accrapack.com',
    phone: '+233 24 555 7890',
    country: 'Ghana',
    source: 'Referral',
    status: 'CONTACTED',
    notes: 'Inquiry for 10,000 units of FIBC 1000kg jumbo bags for mining bulk cargo.',
    date: '2026-10-14',
  },
];

export interface AccountItem {
  id: string;
  accountNumber: string;
  name: string;
  country: string;
  destinationPort: string;
  paymentTerms: string;
  status: 'ACTIVE' | 'ON_HOLD';
  totalOrdersValue: number;
}

export const INITIAL_ACCOUNTS: AccountItem[] = [
  {
    id: 'acc-1',
    accountNumber: 'ACC-DXB-101',
    name: 'Al-Madina Foodstuff Wholesalers LLC',
    country: 'United Arab Emirates',
    destinationPort: 'Jebel Ali Port (UAE)',
    paymentTerms: '30 Days Net',
    status: 'ACTIVE',
    totalOrdersValue: 114800,
  },
  {
    id: 'acc-2',
    accountNumber: 'ACC-NL-202',
    name: 'EuroSpice Imports B.V.',
    country: 'Netherlands',
    destinationPort: 'Port of Rotterdam',
    paymentTerms: '30 Days Net',
    status: 'ACTIVE',
    totalOrdersValue: 41000,
  },
  {
    id: 'acc-3',
    accountNumber: 'ACC-NO-303',
    name: 'Nordic Fresh Direct AS',
    country: 'Norway',
    destinationPort: 'Oslo Havn',
    paymentTerms: '14 Days Net',
    status: 'ACTIVE',
    totalOrdersValue: 28500,
  },
  {
    id: 'acc-4',
    accountNumber: 'ACC-SG-404',
    name: 'SingaTrading Global Pte Ltd',
    country: 'Singapore',
    destinationPort: 'Jurong Port (Singapore)',
    paymentTerms: '100% CAD against BL',
    status: 'ACTIVE',
    totalOrdersValue: 65200,
  },
];

export interface QuoteLineItem {
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

export interface QuoteItem {
  id: string;
  quoteNumber: string;
  version: number;
  customerName: string;
  country: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'ACCEPTED' | 'CONVERTED';
  totalAmount: number;
  totalCost: number;
  marginPercent: number;
  currency: string;
  exchangeRateToUsd?: number;
  totalAmountUsd?: number;
  validUntil: string;
  createdAt: string;
  lines: QuoteLineItem[];
}

export const INITIAL_QUOTES: QuoteItem[] = [
  {
    id: 'q-1',
    quoteNumber: 'Q-2026-001',
    version: 1,
    customerName: 'Al-Madina Foodstuff Wholesalers LLC',
    country: 'United Arab Emirates',
    status: 'ACCEPTED',
    totalAmount: 114800,
    totalCost: 92400,
    marginPercent: 19.51,
    currency: 'USD',
    validUntil: '2026-10-30',
    createdAt: '2026-10-10',
    lines: [
      {
        id: 'ql-1',
        productSku: 'SPICE-TUR-WHOLE',
        productName: 'Turmeric Whole Dried Fingers',
        quantity: 28,
        uom: 'MT',
        unitCost: 1650,
        unitPrice: 2050,
        lineTotal: 57400,
        marginPercent: 19.51,
      },
      {
        id: 'ql-2',
        productSku: 'SPICE-CUM-SEEDS',
        productName: 'Cumin Seeds (Machine Cleaned)',
        quantity: 15,
        uom: 'MT',
        unitCost: 3100,
        unitPrice: 3826.67,
        lineTotal: 57400,
        marginPercent: 18.99,
      },
    ],
  },
  {
    id: 'q-2',
    quoteNumber: 'Q-2026-002',
    version: 1,
    customerName: 'EuroSpice Imports B.V.',
    country: 'Netherlands',
    status: 'SENT',
    totalAmount: 41000,
    totalCost: 33000,
    marginPercent: 19.51,
    currency: 'USD',
    validUntil: '2026-10-25',
    createdAt: '2026-10-12',
    lines: [
      {
        id: 'ql-3',
        productSku: 'SPICE-TUR-POW',
        productName: 'Turmeric Powder (80 Mesh)',
        quantity: 20,
        uom: 'MT',
        unitCost: 1850,
        unitPrice: 2300,
        lineTotal: 46000,
        marginPercent: 19.57,
      },
    ],
  },
  {
    id: 'q-3',
    quoteNumber: 'Q-2026-003',
    version: 1,
    customerName: 'Nordic Fresh Direct AS',
    country: 'Norway',
    status: 'PENDING_APPROVAL',
    totalAmount: 28500,
    totalCost: 24800,
    marginPercent: 12.98,
    currency: 'USD',
    validUntil: '2026-10-28',
    createdAt: '2026-10-14',
    lines: [
      {
        id: 'ql-4',
        productSku: 'FRUIT-POM-BHAG',
        productName: 'Fresh Pomegranates (Bhagwa)',
        quantity: 2000,
        uom: 'BOX',
        unitCost: 9.0,
        unitPrice: 10.35,
        lineTotal: 20700,
        marginPercent: 13.04,
      },
    ],
  },
];

export interface SalesOrderItem {
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

export const INITIAL_ORDERS: SalesOrderItem[] = [
  {
    id: 'so-1',
    orderNumber: 'SO-2026-001',
    customerName: 'Al-Madina Foodstuff Wholesalers LLC',
    customerPo: 'PO-ALMADINA-9941',
    quoteRef: 'Q-2026-001',
    status: 'IN_TRANSIT',
    totalAmount: 114800,
    currency: 'USD',
    deliveryTerm: 'CIF Jebel Ali Port',
    destinationPort: 'Jebel Ali, Dubai',
    createdAt: '2026-10-11',
  },
];

export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  location: string;
  state: string;
  commodities: string;
  paymentTerms: string;
  rating: number;
}

export const INITIAL_SUPPLIERS: SupplierItem[] = [
  {
    id: 'sup-1',
    code: 'SUP-GJ-001',
    name: 'Gujarat Agro & Spice Processors Ltd',
    location: 'Unjha, Mehsana',
    state: 'Gujarat',
    commodities: 'Cumin, Turmeric, Coriander, Fennel',
    paymentTerms: '15 Days Credit',
    rating: 4.9,
  },
  {
    id: 'sup-2',
    code: 'SUP-MH-002',
    name: 'Deccan Fresh Produce Producers Co-op',
    location: 'Nashik, Lasalgaon',
    state: 'Maharashtra',
    commodities: 'Red Onions, Grapes, Pomegranates',
    paymentTerms: '10 Days Net',
    rating: 4.8,
  },
  {
    id: 'sup-3',
    code: 'SUP-GJ-003',
    name: 'Saurashtra Polytex Packaging LLP',
    location: 'Rajkot',
    state: 'Gujarat',
    commodities: 'FIBC Jumbo Bags, PP Woven Bags, Tarpaulins',
    paymentTerms: '30 Days Net',
    rating: 4.9,
  },
  {
    id: 'sup-4',
    code: 'SUP-KL-004',
    name: 'Cochin Spices Origin Exporters',
    location: 'Kochi',
    state: 'Kerala',
    commodities: 'Black Pepper, Cardamom, Cloves, Cinnamon',
    paymentTerms: 'Advance CAD',
    rating: 4.7,
  },
];

export interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  supplierName: string;
  salesOrderRef: string;
  totalCost: number;
  currency: string;
  exchangeRateToUsd?: number;
  totalCostUsd?: number;
  status: 'DRAFT' | 'APPROVED' | 'ISSUED' | 'ACKNOWLEDGED' | 'COMPLETED';
  expectedDispatch: string;
  createdAt: string;
  billId?: string;
  billNumber?: string;
  billStatus?: string;
}

export const INITIAL_POS: PurchaseOrderItem[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-001',
    supplierName: 'Gujarat Agro & Spice Processors Ltd',
    salesOrderRef: 'SO-2026-001',
    totalCost: 46200,
    currency: 'USD',
    status: 'ISSUED',
    expectedDispatch: '2026-10-18',
    createdAt: '2026-10-11',
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-002',
    supplierName: 'Gujarat Agro & Spice Processors Ltd',
    salesOrderRef: 'SO-2026-001',
    totalCost: 46200,
    currency: 'USD',
    status: 'ISSUED',
    expectedDispatch: '2026-10-18',
    createdAt: '2026-10-11',
  },
];

export interface ShipmentItem {
  id: string;
  shipmentReference: string;
  salesOrderRef: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'CUSTOMS_CLEARANCE' | 'DELIVERED';
  originPort: string;
  destinationPort: string;
  dispatchedDate: string;
  estimatedArrival: string;
  isSupplierDirect: boolean;
}

export const INITIAL_SHIPMENTS: ShipmentItem[] = [
  {
    id: 'sh-1',
    shipmentReference: 'SH-2026-001',
    salesOrderRef: 'SO-2026-001',
    customerName: 'Al-Madina Foodstuff Wholesalers LLC',
    carrier: 'Maersk Line Shipping',
    trackingNumber: 'MSKU928401923',
    status: 'IN_TRANSIT',
    originPort: 'Mundra Port, Gujarat, India',
    destinationPort: 'Jebel Ali Port, Dubai, UAE',
    dispatchedDate: '2026-10-12',
    estimatedArrival: '2026-10-21',
    isSupplierDirect: true,
  },
];

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  issueDate: string;
  dueDate: string;
}

export const INITIAL_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    orderNumber: 'SO-2026-001',
    customerName: 'Al-Madina Foodstuff Wholesalers LLC',
    totalAmount: 114800,
    paidAmount: 57400,
    balanceDue: 57400,
    currency: 'USD',
    status: 'PARTIALLY_PAID',
    issueDate: '2026-10-11',
    dueDate: '2026-11-10',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    orderNumber: 'SO-2026-002',
    customerName: 'EuroSpice Imports B.V.',
    totalAmount: 41000,
    paidAmount: 41000,
    balanceDue: 0,
    currency: 'USD',
    status: 'PAID',
    issueDate: '2026-09-28',
    dueDate: '2026-10-28',
  },
];
