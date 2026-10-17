import { getPrismaClient } from "./infrastructure/database/prisma.js";

export async function runSeed() {
  const prisma = getPrismaClient();
  console.info(
    "[Seed] Starting Polybridge Ventures business seed data insertion...",
  );

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: "PBV-INDIA" },
    update: {},
    create: {
      name: "Polybridge Ventures LLP",
      code: "PBV-INDIA",
      baseCurrency: "USD",
      isActive: true,
    },
  });

  console.info(`[Seed] Organization ready: ${org.name} (${org.id})`);

  // 2. Departments
  const deptSales = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "DEPT-SALES" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "International Sales & Trading",
      code: "DEPT-SALES",
    },
  });

  const deptProc = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "DEPT-PROC" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Sourcing & Supplier Coordination",
      code: "DEPT-PROC",
    },
  });

  const deptOps = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "DEPT-OPS" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Logistics & Fulfilment Operations",
      code: "DEPT-OPS",
    },
  });

  const deptFin = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "DEPT-FIN" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Finance & Trade Accounting",
      code: "DEPT-FIN",
    },
  });

  const deptCompliance = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "DEPT-COMPLIANCE" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Governance & Compliance",
      code: "DEPT-COMPLIANCE",
    },
  });

  // 3. Subdepartments
  const subSpice = await prisma.subdepartment.upsert({
    where: {
      departmentId_code: { departmentId: deptSales.id, code: "SUB-SPICE" },
    },
    update: {},
    create: {
      departmentId: deptSales.id,
      name: "Spices & Ground Powders Desk",
      code: "SUB-SPICE",
    },
  });

  await prisma.subdepartment.upsert({
    where: {
      departmentId_code: { departmentId: deptSales.id, code: "SUB-PRODUCE" },
    },
    update: {},
    create: {
      departmentId: deptSales.id,
      name: "Fresh Produce (Fruits & Veg) Desk",
      code: "SUB-PRODUCE",
    },
  });

  await prisma.subdepartment.upsert({
    where: {
      departmentId_code: { departmentId: deptSales.id, code: "SUB-PACK" },
    },
    update: {},
    create: {
      departmentId: deptSales.id,
      name: "Industrial Packaging Desk",
      code: "SUB-PACK",
    },
  });

  const subVendor = await prisma.subdepartment.upsert({
    where: {
      departmentId_code: { departmentId: deptProc.id, code: "SUB-VENDOR" },
    },
    update: {},
    create: {
      departmentId: deptProc.id,
      name: "Vendor Relations & APMC Sourcing",
      code: "SUB-VENDOR",
    },
  });

  const subShipping = await prisma.subdepartment.upsert({
    where: {
      departmentId_code: { departmentId: deptOps.id, code: "SUB-SHIPPING" },
    },
    update: {},
    create: {
      departmentId: deptOps.id,
      name: "Shipping Operations & Customs",
      code: "SUB-SHIPPING",
    },
  });

  const subTreasury = await prisma.subdepartment.upsert({
    where: {
      departmentId_code: { departmentId: deptFin.id, code: "SUB-TREASURY" },
    },
    update: {},
    create: {
      departmentId: deptFin.id,
      name: "Letter of Credit & Treasury",
      code: "SUB-TREASURY",
    },
  });

  const subKyc = await prisma.subdepartment.upsert({
    where: {
      departmentId_code: { departmentId: deptCompliance.id, code: "SUB-KYC" },
    },
    update: {},
    create: {
      departmentId: deptCompliance.id,
      name: "Sanctions & KYC Screening",
      code: "SUB-KYC",
    },
  });

  // 4. Designations
  const desPartner = await prisma.designation.upsert({
    where: {
      departmentId_title: {
        departmentId: deptSales.id,
        title: "Managing Partner",
      },
    },
    update: {},
    create: {
      departmentId: deptSales.id,
      title: "Managing Partner",
      seniorityLevel: 5,
      defaultApprovalLimit: 500000,
    },
  });

  const desTrader = await prisma.designation.upsert({
    where: {
      departmentId_title: {
        departmentId: deptSales.id,
        title: "Senior Export Trader",
      },
    },
    update: {},
    create: {
      departmentId: deptSales.id,
      title: "Senior Export Trader",
      seniorityLevel: 4,
      defaultApprovalLimit: 100000,
    },
  });

  const desSourcing = await prisma.designation.upsert({
    where: {
      departmentId_title: {
        departmentId: deptProc.id,
        title: "Sourcing Specialist",
      },
    },
    update: {},
    create: {
      departmentId: deptProc.id,
      title: "Sourcing Specialist",
      seniorityLevel: 3,
      defaultApprovalLimit: 50000,
    },
  });

  const desLogistics = await prisma.designation.upsert({
    where: {
      departmentId_title: {
        departmentId: deptOps.id,
        title: "Logistics Officer",
      },
    },
    update: {},
    create: {
      departmentId: deptOps.id,
      title: "Logistics Officer",
      seniorityLevel: 2,
      defaultApprovalLimit: 25000,
    },
  });

  const desFinance = await prisma.designation.upsert({
    where: {
      departmentId_title: {
        departmentId: deptSales.id,
        title: "Finance Controller",
      },
    },
    update: {},
    create: {
      departmentId: deptSales.id,
      title: "Finance Controller",
      seniorityLevel: 4,
      defaultApprovalLimit: 250000,
    },
  });

  const desCompliance = await prisma.designation.upsert({
    where: {
      departmentId_title: {
        departmentId: deptCompliance.id,
        title: "Compliance Officer",
      },
    },
    update: {},
    create: {
      departmentId: deptCompliance.id,
      title: "Compliance Officer",
      seniorityLevel: 3,
      defaultApprovalLimit: 0,
    },
  });

  // 5. System Roles
  const roleAdmin = await prisma.role.upsert({
    where: { name: "ADMINISTRATOR" },
    update: {},
    create: {
      name: "ADMINISTRATOR",
      description: "Full firm-wide executive access",
      isSystem: true,
    },
  });

  const roleSales = await prisma.role.upsert({
    where: { name: "SALES_MANAGER" },
    update: {},
    create: {
      name: "SALES_MANAGER",
      description: "Commercial sales and accounts lead",
      isSystem: true,
    },
  });

  const roleProc = await prisma.role.upsert({
    where: { name: "PROCUREMENT_MANAGER" },
    update: {},
    create: {
      name: "PROCUREMENT_MANAGER",
      description: "Sourcing and supplier agreements",
      isSystem: true,
    },
  });

  const roleOps = await prisma.role.upsert({
    where: { name: "OPERATIONS_SPECIALIST" },
    update: {},
    create: {
      name: "OPERATIONS_SPECIALIST",
      description: "Logistics and freight fulfilment",
      isSystem: true,
    },
  });

  const roleFin = await prisma.role.upsert({
    where: { name: "FINANCE_CONTROLLER" },
    update: {},
    create: {
      name: "FINANCE_CONTROLLER",
      description: "Trade treasury, letters of credit and invoices",
      isSystem: true,
    },
  });

  const roleAudit = await prisma.role.upsert({
    where: { name: "AUDITOR" },
    update: {},
    create: {
      name: "AUDITOR",
      description: "Sanctions, KYC and regulatory auditor",
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: "TRADER" },
    update: {},
    create: {
      name: "TRADER",
      description: "Standard trade execution desk",
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: "VIEWER" },
    update: {},
    create: { name: "VIEWER", description: "Read only access", isSystem: true },
  });

  // 6. Users
  const demoHash =
    "$argon2id$v=19$m=65536,t=3,p=1$fakehasheddemokey$validmockhashforlocaldev";

  const userPartner = await prisma.user.upsert({
    where: { email: "partner@polybridgeventures.com" },
    update: {},
    create: {
      organizationId: org.id,
      departmentId: deptSales.id,
      subdepartmentId: subSpice.id,
      designationId: desPartner.id,
      email: "partner@polybridgeventures.com",
      passwordHash: demoHash,
      firstName: "Rahul",
      lastName: "Patel",
      phoneNumber: "+91 98201 44211",
      isActive: true,
      isMfaEnabled: true,
    },
  });

  const userTrader = await prisma.user.upsert({
    where: { email: "trader@polybridgeventures.com" },
    update: {},
    create: {
      organizationId: org.id,
      departmentId: deptSales.id,
      subdepartmentId: subSpice.id,
      designationId: desTrader.id,
      reportingToId: userPartner.id,
      email: "trader@polybridgeventures.com",
      passwordHash: demoHash,
      firstName: "Amit",
      lastName: "Sharma",
      phoneNumber: "+91 98112 55301",
      isActive: true,
      isMfaEnabled: true,
    },
  });

  const userSourcing = await prisma.user.upsert({
    where: { email: "sourcing@polybridgeventures.com" },
    update: {},
    create: {
      organizationId: org.id,
      departmentId: deptProc.id,
      subdepartmentId: subVendor.id,
      designationId: desSourcing.id,
      reportingToId: userPartner.id,
      email: "sourcing@polybridgeventures.com",
      passwordHash: demoHash,
      firstName: "Priya",
      lastName: "Desai",
      phoneNumber: "+91 98334 77120",
      isActive: true,
      isMfaEnabled: true,
    },
  });

  const userLogistics = await prisma.user.upsert({
    where: { email: "logistics@polybridgeventures.com" },
    update: {},
    create: {
      organizationId: org.id,
      departmentId: deptOps.id,
      subdepartmentId: subShipping.id,
      designationId: desLogistics.id,
      reportingToId: userPartner.id,
      email: "logistics@polybridgeventures.com",
      passwordHash: demoHash,
      firstName: "Vikram",
      lastName: "Joshi",
      phoneNumber: "+91 98450 66890",
      isActive: true,
      isMfaEnabled: false,
    },
  });

  const userFinance = await prisma.user.upsert({
    where: { email: "finance@polybridgeventures.com" },
    update: {},
    create: {
      organizationId: org.id,
      departmentId: deptSales.id,
      subdepartmentId: subTreasury.id,
      designationId: desFinance.id,
      reportingToId: userPartner.id,
      email: "finance@polybridgeventures.com",
      passwordHash: demoHash,
      firstName: "Neha",
      lastName: "Singhania",
      phoneNumber: "+91 98710 33441",
      isActive: true,
      isMfaEnabled: true,
    },
  });

  const userCompliance = await prisma.user.upsert({
    where: { email: "compliance@polybridgeventures.com" },
    update: {},
    create: {
      organizationId: org.id,
      departmentId: deptCompliance.id,
      subdepartmentId: subKyc.id,
      designationId: desCompliance.id,
      reportingToId: userPartner.id,
      email: "compliance@polybridgeventures.com",
      passwordHash: demoHash,
      firstName: "Ananya",
      lastName: "Verma",
      phoneNumber: "+91 98920 88712",
      isActive: true,
      isMfaEnabled: true,
    },
  });

  // Assign user roles
  const ensureRole = async (userId: string, roleId: string) => {
    const existing = await prisma.userRole.findFirst({
      where: { userId, roleId },
    });
    if (!existing) {
      await prisma.userRole.create({ data: { userId, roleId } });
    }
  };

  await ensureRole(userPartner.id, roleAdmin.id);
  await ensureRole(userTrader.id, roleSales.id);
  await ensureRole(userSourcing.id, roleProc.id);
  await ensureRole(userLogistics.id, roleOps.id);
  await ensureRole(userFinance.id, roleFin.id);
  await ensureRole(userCompliance.id, roleAudit.id);

  console.info(`[Seed] 6 Staff Users initialized with roles and designations.`);

  // 6. Categories
  const catSpice = await prisma.category.upsert({
    where: { code: "CAT-SPICES" },
    update: {},
    create: {
      name: "Indian Spices – Whole & Ground",
      code: "CAT-SPICES",
      description:
        "Export-grade whole and powdered spices sourced directly from trusted Indian farms and processors.",
    },
  });

  const catFruit = await prisma.category.upsert({
    where: { code: "CAT-FRUITS" },
    update: {},
    create: {
      name: "Fresh Fruits from India",
      code: "CAT-FRUITS",
      description:
        "Carefully selected, graded, and temperature-controlled fresh export fruits.",
    },
  });

  const catVeg = await prisma.category.upsert({
    where: { code: "CAT-VEGETABLES" },
    update: {},
    create: {
      name: "Fresh Vegetables from India",
      code: "CAT-VEGETABLES",
      description:
        "Fresh agricultural produce including onions, green chillies, and ginger.",
    },
  });

  const catPack = await prisma.category.upsert({
    where: { code: "CAT-PACKAGING" },
    update: {},
    create: {
      name: "Industrial & Commercial Packaging",
      code: "CAT-PACKAGING",
      description:
        "Heavy-duty FIBC Jumbo bags, PP woven sacks, and bulk cargo container liners.",
    },
  });

  // 7. Units of Measure
  const uomMT = await prisma.unitOfMeasure.upsert({
    where: { code: "MT" },
    update: {},
    create: { code: "MT", name: "Metric Ton" },
  });

  await prisma.unitOfMeasure.upsert({
    where: { code: "KG" },
    update: {},
    create: { code: "KG", name: "Kilogram" },
  });

  const uomBAG = await prisma.unitOfMeasure.upsert({
    where: { code: "BAG" },
    update: {},
    create: { code: "BAG", name: "Standard Bag (25kg/50kg)" },
  });

  const uomBOX = await prisma.unitOfMeasure.upsert({
    where: { code: "BOX" },
    update: {},
    create: { code: "BOX", name: "Corrugated Box" },
  });

  const uomPCS = await prisma.unitOfMeasure.upsert({
    where: { code: "PCS" },
    update: {},
    create: { code: "PCS", name: "Pieces" },
  });

  // 8. Products
  const products = [
    {
      sku: "SPICE-TUR-WHOLE",
      name: "Turmeric Whole Dried Fingers (Salem Grade)",
      category: catSpice,
      uom: uomMT,
      standardCost: 1650.0,
      standardPrice: 2050.0,
      description:
        "Natural dried turmeric fingers, deep yellow color, Curcumin 3.2% min, moisture < 10%.",
    },
    {
      sku: "SPICE-TUR-POW",
      name: "Turmeric Powder (Fine Mesh 80-100)",
      category: catSpice,
      uom: uomMT,
      standardCost: 1850.0,
      standardPrice: 2300.0,
      description:
        "Pure ground turmeric powder, steam sterilized, no artificial coloring.",
    },
    {
      sku: "SPICE-CUM-SEEDS",
      name: "Cumin Seeds (Machine Cleaned 99% Purity)",
      category: catSpice,
      uom: uomMT,
      standardCost: 3100.0,
      standardPrice: 3850.0,
      description:
        "Export quality bold cumin seeds (Jeera) from Gujarat/Rajasthan with strong aroma.",
    },
    {
      sku: "SPICE-PEP-BLACK",
      name: "Black Pepper (Malabar Garbled 550GL)",
      category: catSpice,
      uom: uomMT,
      standardCost: 6200.0,
      standardPrice: 7400.0,
      description:
        "Whole dried black peppercorns from Kerala, density 550 g/L minimum, piperine rich.",
    },
    {
      sku: "SPICE-CHI-TEJA",
      name: "Dry Red Chilli (S17 Teja Stemless)",
      category: catSpice,
      uom: uomMT,
      standardCost: 2800.0,
      standardPrice: 3450.0,
      description:
        "High pungency dry red chillies (Guntur/Byadgi), 70,000 to 90,000 SHU heat value.",
    },
    {
      sku: "FRUIT-BAN-CAV",
      name: "Fresh Cavendish Bananas (Class A Premium)",
      category: catFruit,
      uom: uomBOX,
      standardCost: 7.5,
      standardPrice: 11.2,
      description:
        "Export quality fresh green bananas packed in 13kg net weight cartons, calibrated length 18cm+.",
    },
    {
      sku: "FRUIT-POM-BHAG",
      name: "Fresh Pomegranates (Bhagwa Variety)",
      category: catFruit,
      uom: uomBOX,
      standardCost: 9.0,
      standardPrice: 14.5,
      description:
        "Ruby red arils, sweet flavor, calibrated sizes 250g-350g in 3.5kg export boxes.",
    },
    {
      sku: "VEG-ONI-NASHIK",
      name: "Fresh Red Onions (Medium 45-55mm)",
      category: catVeg,
      uom: uomMT,
      standardCost: 320.0,
      standardPrice: 480.0,
      description:
        "Well-cured red onions from Nashik, packed in 25kg red mesh breathable bags.",
    },
    {
      sku: "PACK-FIBC-1000",
      name: "FIBC Jumbo Bags (1000kg Capacity, 4-Loop Coated)",
      category: catPack,
      uom: uomPCS,
      standardCost: 9.2,
      standardPrice: 13.8,
      description:
        "UV stabilized PP woven big bags with discharge spout, safety factor 5:1.",
    },
    {
      sku: "PACK-PP-50KG",
      name: "PP Woven Sacks (50kg Agri & Chemical Packaging)",
      category: catPack,
      uom: uomBAG,
      standardCost: 0.35,
      standardPrice: 0.58,
      description:
        "Laminated white PP woven sacks with anti-slip weave, size 24x38 inches.",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        organizationId: org.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        categoryId: p.category.id,
        uomId: p.uom.id,
        standardCost: p.standardCost,
        standardPrice: p.standardPrice,
        currency: "USD",
        isActive: true,
      },
    });
  }

  console.info(`[Seed] Products seeded (${products.length} commodities)`);

  // 9. Suppliers in India
  const supGujarat = await prisma.supplier.upsert({
    where: { supplierCode: "SUP-GJ-001" },
    update: {},
    create: {
      organizationId: org.id,
      supplierCode: "SUP-GJ-001",
      name: "Gujarat Agro & Spice Processors Ltd",
      country: "India",
      state: "Gujarat",
      taxIdentifier: "24AAACG1234F1Z5",
      paymentTermsDays: 15,
      currency: "USD",
      address: { city: "Unjha", state: "Gujarat", postalCode: "384170" },
      isActive: true,
    },
  });

  await prisma.supplier.upsert({
    where: { supplierCode: "SUP-MH-002" },
    update: {},
    create: {
      organizationId: org.id,
      supplierCode: "SUP-MH-002",
      name: "Deccan Fresh Produce Producers Co-op",
      country: "India",
      state: "Maharashtra",
      taxIdentifier: "27AABBD9876K1ZQ",
      paymentTermsDays: 10,
      currency: "USD",
      address: { city: "Nashik", state: "Maharashtra", postalCode: "422001" },
      isActive: true,
    },
  });

  await prisma.supplier.upsert({
    where: { supplierCode: "SUP-GJ-003" },
    update: {},
    create: {
      organizationId: org.id,
      supplierCode: "SUP-GJ-003",
      name: "Saurashtra Polytex Packaging LLP",
      country: "India",
      state: "Gujarat",
      taxIdentifier: "24AACSP5555L1Z8",
      paymentTermsDays: 30,
      currency: "USD",
      address: { city: "Rajkot", state: "Gujarat", postalCode: "360002" },
      isActive: true,
    },
  });

  console.info("[Seed] Suppliers seeded (Gujarat, Maharashtra)");

  // 10. Buyer Accounts (International Buyers)
  const accDubai = await prisma.account.upsert({
    where: { accountNumber: "ACC-DXB-101" },
    update: {},
    create: {
      organizationId: org.id,
      accountNumber: "ACC-DXB-101",
      name: "Al-Madina Foodstuff Wholesalers LLC",
      country: "United Arab Emirates",
      taxIdentifier: "TRN-100293847500003",
      paymentTermsDays: 30,
      billingAddress: { city: "Dubai", country: "UAE", poBox: "12450" },
      shippingAddress: { port: "Jebel Ali Port", country: "UAE" },
      assignedToId: userTrader.id,
      isActive: true,
    },
  });

  const accRotterdam = await prisma.account.upsert({
    where: { accountNumber: "ACC-NL-202" },
    update: {},
    create: {
      organizationId: org.id,
      accountNumber: "ACC-NL-202",
      name: "EuroSpice Imports B.V.",
      country: "Netherlands",
      taxIdentifier: "NL859403921B01",
      paymentTermsDays: 30,
      billingAddress: {
        city: "Rotterdam",
        country: "Netherlands",
        postal: "3011 WN",
      },
      shippingAddress: { port: "Port of Rotterdam", country: "Netherlands" },
      assignedToId: userTrader.id,
      isActive: true,
    },
  });

  await prisma.account.upsert({
    where: { accountNumber: "ACC-NO-303" },
    update: {},
    create: {
      organizationId: org.id,
      accountNumber: "ACC-NO-303",
      name: "Nordic Fresh Direct AS",
      country: "Norway",
      taxIdentifier: "NO987654321MVA",
      paymentTermsDays: 14,
      billingAddress: { city: "Oslo", country: "Norway", postal: "0150" },
      shippingAddress: { port: "Oslo Havn", country: "Norway" },
      assignedToId: userTrader.id,
      isActive: true,
    },
  });

  console.info("[Seed] International Accounts seeded (Dubai, Rotterdam, Oslo)");

  // 11. Leads
  await prisma.lead.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: org.id,
      firstName: "Tariq",
      lastName: "Mansoor",
      companyName: "Gulf Commodities Trading",
      email: "tariq@gulfcommodities.ae",
      phone: "+971501234567",
      country: "United Arab Emirates",
      leadSource: "Website Quote Request",
      status: "QUALIFIED",
      notes:
        "Interested in 2 FCL (56 MT) of Salem Turmeric Whole Fingers CIF Jebel Ali.",
      assignedToId: userTrader.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      organizationId: org.id,
      firstName: "Jean",
      lastName: "Dupont",
      companyName: "Bordeaux Agro Services",
      email: "j.dupont@bordeauxagro.fr",
      phone: "+33556012345",
      country: "France",
      leadSource: "Trade Fair Dubai",
      status: "NEW",
      notes:
        "Requires technical specification sheet for Cumin seeds and Red Chilli Teja.",
      assignedToId: userTrader.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      organizationId: org.id,
      firstName: "Kwame",
      lastName: "Mensah",
      companyName: "Accra Packaging & Supplies Ltd",
      email: "kmensah@accrapack.com",
      phone: "+233245557890",
      country: "Ghana",
      leadSource: "Referral",
      status: "CONTACTED",
      notes:
        "Inquiry for 10,000 units of FIBC 1000kg jumbo bags for mining bulk cargo.",
      assignedToId: userTrader.id,
    },
  });

  // 12. Quotations (Commercial Quotes with realistic lines)
  const productTurmeric = await prisma.product.findUniqueOrThrow({
    where: { sku: "SPICE-TUR-WHOLE" },
  });
  const productCumin = await prisma.product.findUniqueOrThrow({
    where: { sku: "SPICE-CUM-SEEDS" },
  });

  const quote1 = await prisma.quote.upsert({
    where: { quoteNumber_version: { quoteNumber: "Q-2026-001", version: 1 } },
    update: {},
    create: {
      organizationId: org.id,
      quoteNumber: "Q-2026-001",
      version: 1,
      accountId: accDubai.id,
      status: "ACCEPTED",
      currency: "USD",
      subtotalAmount: 114800.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      totalAmount: 114800.0,
      totalCost: 92400.0,
      grossMarginPercent: 19.51,
      validUntil: new Date(Date.now() + 15 * 86400000),
      createdById: userTrader.id,
      approvedById: userPartner.id,
    },
  });

  await prisma.quoteLine.createMany({
    data: [
      {
        quoteId: quote1.id,
        productId: productTurmeric.id,
        uomId: uomMT.id,
        quantity: 28.0,
        unitCost: 1650.0,
        unitPrice: 2050.0,
        discountPercent: 0,
        lineTotal: 57400.0,
        lineMarginPercent: 19.51,
      },
      {
        quoteId: quote1.id,
        productId: productCumin.id,
        uomId: uomMT.id,
        quantity: 15.0,
        unitCost: 3100.0,
        unitPrice: 3826.67,
        discountPercent: 0,
        lineTotal: 57400.0,
        lineMarginPercent: 18.99,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.quote.upsert({
    where: { quoteNumber_version: { quoteNumber: "Q-2026-002", version: 1 } },
    update: {},
    create: {
      organizationId: org.id,
      quoteNumber: "Q-2026-002",
      version: 1,
      accountId: accRotterdam.id,
      status: "SENT",
      currency: "USD",
      subtotalAmount: 41000.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      totalAmount: 41000.0,
      totalCost: 33000.0,
      grossMarginPercent: 19.51,
      validUntil: new Date(Date.now() + 10 * 86400000),
      createdById: userTrader.id,
    },
  });

  console.info(
    "[Seed] Quotations seeded: Q-2026-001 (Accepted), Q-2026-002 (Sent)",
  );

  // 13. Sales Orders (Converted from Accepted Quote)
  const salesOrder1 = await prisma.salesOrder.upsert({
    where: { orderNumber: "SO-2026-001" },
    update: {},
    create: {
      organizationId: org.id,
      orderNumber: "SO-2026-001",
      accountId: accDubai.id,
      originatingQuoteId: quote1.id,
      customerPoReference: "PO-ALMADINA-9941",
      status: "CONFIRMED",
      currency: "USD",
      subtotalAmount: 114800.0,
      taxAmount: 0.0,
      totalAmount: 114800.0,
      shippingAddress: {
        port: "Jebel Ali Port",
        deliveryTerm: "CIF Jebel Ali",
      },
      createdById: userTrader.id,
    },
  });

  const soLine1 = await prisma.salesOrderLine.create({
    data: {
      salesOrderId: salesOrder1.id,
      productId: productTurmeric.id,
      uomId: uomMT.id,
      quantity: 28.0,
      unitPrice: 2050.0,
      lineTotal: 57400.0,
      fulfilledQuantity: 28.0,
    },
  });

  // 14. Purchase Orders (Procurement from Gujarat Agro)
  const po1 = await prisma.purchaseOrder.upsert({
    where: { poNumber: "PO-2026-001" },
    update: {},
    create: {
      organizationId: org.id,
      poNumber: "PO-2026-001",
      supplierId: supGujarat.id,
      status: "ISSUED",
      currency: "USD",
      totalCost: 46200.0,
      expectedDeliveryDate: new Date(Date.now() + 12 * 86400000),
      createdById: userTrader.id,
      approvedById: userPartner.id,
      issuedAt: new Date(),
    },
  });

  await prisma.purchaseOrderLine.create({
    data: {
      purchaseOrderId: po1.id,
      salesOrderLineId: soLine1.id,
      productId: productTurmeric.id,
      uomId: uomMT.id,
      quantity: 28.0,
      unitCost: 1650.0,
      lineTotal: 46200.0,
      receivedOrDeliveredQty: 28.0,
    },
  });

  // 15. Fulfilment (Supplier-Direct Drop-shipment)
  await prisma.fulfilmentShipment.upsert({
    where: { shipmentReference: "SH-2026-001" },
    update: {},
    create: {
      organizationId: org.id,
      shipmentReference: "SH-2026-001",
      purchaseOrderId: po1.id,
      salesOrderId: salesOrder1.id,
      isSupplierDirect: true,
      carrierName: "Maersk Line Container Shipping",
      trackingNumber: "MSKU928401923",
      status: "IN_TRANSIT",
      dispatchedAt: new Date(Date.now() - 3 * 86400000),
      expectedDeliveryAt: new Date(Date.now() + 7 * 86400000),
      podMetadata: {
        vessel: "Maersk Mc-Kinney Moller",
        voy: "2604W",
        dischargePort: "Jebel Ali",
      },
    },
  });

  // 16. Finance (Customer Invoice & Payment Receipt)
  const invoice1 = await prisma.customerInvoice.upsert({
    where: { invoiceNumber: "INV-2026-001" },
    update: {},
    create: {
      organizationId: org.id,
      invoiceNumber: "INV-2026-001",
      salesOrderId: salesOrder1.id,
      accountId: accDubai.id,
      status: "PARTIALLY_PAID",
      currency: "USD",
      subtotalAmount: 114800.0,
      taxAmount: 0.0,
      totalAmount: 114800.0,
      balanceDue: 57400.0,
      dueDate: new Date(Date.now() + 25 * 86400000),
    },
  });

  const receipt1 = await prisma.paymentReceipt.upsert({
    where: { receiptNumber: "REC-2026-001" },
    update: {},
    create: {
      organizationId: org.id,
      receiptNumber: "REC-2026-001",
      accountId: accDubai.id,
      amount: 57400.0,
      unallocatedAmount: 0.0,
      currency: "USD",
      paymentMethod: "wire_transfer",
      bankReference: "ENBD-SWIFT-9948201",
      paymentDate: new Date(),
      createdById: userTrader.id,
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentReceiptId: receipt1.id,
      customerInvoiceId: invoice1.id,
      amount: 57400.0,
    },
  });

  console.info(
    "[Seed] Finance seeded: Invoice INV-2026-001, Advance Payment REC-2026-001",
  );
  console.info(
    "[Seed] Polybridge Ventures trade seeding finished successfully!",
  );
}

runSeed()
  .catch((err) => {
    console.error("[Seed Error]", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
