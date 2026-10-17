import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../infrastructure/database/prisma.js';
import { logger } from '../../infrastructure/logging/logger.js';
import {
  UserProfile,
  ProductItem,
  LeadItem,
  AccountItem,
  QuoteItem,
  SalesOrderItem,
  SupplierItem,
  PurchaseOrderItem,
  ShipmentItem,
  InvoiceItem,
} from '../../modules/trade-data.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toUuid(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return '00000000-0000-0000-0000-000000000000';
}

let cachedOrgId: string | null = null;
async function getOrganizationId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId;
  const prisma = getPrismaClient();
  const org = await prisma.organization.findFirst();
  if (org) {
    cachedOrgId = org.id;
    return org.id;
  }
  const created = await prisma.organization.create({
    data: {
      name: 'Polybridge Ventures LLP',
      code: 'PBV-INDIA',
      baseCurrency: 'USD',
      isActive: true,
    },
  });
  cachedOrgId = created.id;
  return created.id;
}

async function logAudit(
  actorName: string,
  action: string,
  entity: string,
  entityId: string,
  details: string,
  actorId?: string
) {
  try {
    const prisma = getPrismaClient();
    const orgId = await getOrganizationId();
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorId: actorId && UUID_REGEX.test(actorId) ? actorId : undefined,
        action,
        targetEntityType: entity,
        targetEntityId: toUuid(entityId),
        ipAddress: '127.0.0.1',
        correlationId: `corr-${Date.now()}`,
        changesDiff: { actor: actorName, details },
      },
    });
  } catch (err) {
    logger.warn({ err }, '[Audit] Audit log database persistence failed');
  }
}

// Active session identifier (pure DB pointer)
let currentSessionUserId: string | null = null;

export async function tradeRoutes(server: FastifyInstance): Promise<void> {
  const prisma = getPrismaClient();

  // -------------------------------------------------------------
  // AUTHENTICATION & SESSION (Pure Database)
  // -------------------------------------------------------------
  server.get('/auth/me', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbUsers = await prisma.user.findMany({
        where: { isActive: true },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (dbUsers.length === 0) {
        return reply.send({
          authenticated: false,
          user: null,
          availableUsers: [],
        });
      }

      const mappedUsers: UserProfile[] = dbUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phoneNumber || '',
        department: u.department?.name || 'Executive Management',
        subdepartment: u.subdepartment?.name || 'Managing Desk',
        designation: u.designation?.title || 'Managing Partner',
        role: u.userRoles[0]?.role.name || 'ADMINISTRATOR',
        dataScope: 'GLOBAL',
        approvalLimit: Number(u.designation?.defaultApprovalLimit || 100000),
        status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        isMfaEnabled: u.isMfaEnabled,
        createdAt: u.createdAt.toISOString(),
      }));

      const activeUser =
        (currentSessionUserId && mappedUsers.find((u) => u.id === currentSessionUserId)) ||
        mappedUsers[0]!;

      return reply.send({
        authenticated: true,
        user: activeUser,
        availableUsers: mappedUsers,
      });
    } catch (err) {
      logger.error({ err }, '[Auth] Error loading session users from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/auth/login', async (req: FastifyRequest<{ Body: { email?: string; userId?: string } }>, reply: FastifyReply) => {
    const { email, userId } = req.body || {};
    try {
      let dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email: { equals: email.toLowerCase().trim(), mode: 'insensitive' as const } }] : []),
            ...(userId && UUID_REGEX.test(userId) ? [{ id: userId }] : []),
          ],
        },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
      });

      if (!dbUser) {
        // Fallback to first active DB user if no matching email was provided
        dbUser = await prisma.user.findFirst({
          where: { isActive: true },
          include: {
            department: true,
            subdepartment: true,
            designation: true,
            userRoles: { include: { role: true } },
          },
        });
      }

      if (!dbUser) {
        return reply.status(401).send({ error: 'No active user accounts found in database' });
      }

      currentSessionUserId = dbUser.id;
      const userProfile: UserProfile = {
        id: dbUser.id,
        name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        email: dbUser.email,
        phone: dbUser.phoneNumber || '',
        department: dbUser.department?.name || 'Executive Management',
        subdepartment: dbUser.subdepartment?.name || 'Managing Desk',
        designation: dbUser.designation?.title || 'Managing Partner',
        role: dbUser.userRoles[0]?.role.name || 'ADMINISTRATOR',
        dataScope: 'GLOBAL',
        approvalLimit: Number(dbUser.designation?.defaultApprovalLimit || 100000),
        status: dbUser.isActive ? 'ACTIVE' : 'INACTIVE',
        isMfaEnabled: dbUser.isMfaEnabled,
        createdAt: dbUser.createdAt.toISOString(),
      };

      await logAudit(userProfile.name, 'LOGIN', 'UserSession', dbUser.id, `User signed in: ${userProfile.email}`, dbUser.id);
      return reply.send({ success: true, user: userProfile });
    } catch (err) {
      logger.error({ err }, '[Auth] Login DB error');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/auth/logout', async (_req: FastifyRequest, reply: FastifyReply) => {
    if (currentSessionUserId) {
      await logAudit('User', 'LOGOUT', 'UserSession', currentSessionUserId, 'User signed out', currentSessionUserId);
      currentSessionUserId = null;
    }
    return reply.send({ success: true });
  });

  // -------------------------------------------------------------
  // CRM & PIPELINE (LEADS & ACCOUNTS) - Pure Database
  // -------------------------------------------------------------
  server.get('/crm/leads', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbLeads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const leads: LeadItem[] = dbLeads.map((l) => {
        const isSupplierLead =
          l.notes?.includes('[Type: SUPPLIER]') ||
          l.companyName.toLowerCase().includes('supplier') ||
          l.firstName.toLowerCase().includes('supplier') ||
          l.lastName.toLowerCase().includes('supplier') ||
          l.notes?.toLowerCase().includes('want to sell') ||
          l.notes?.toLowerCase().includes('stock') ||
          l.notes?.toLowerCase().includes('supply') ||
          l.notes?.toLowerCase().includes('manufacturer');
        const leadType: 'BUYER' | 'SUPPLIER' = isSupplierLead ? 'SUPPLIER' : 'BUYER';

        const isSupplierConverted = l.status === 'CONVERTED' && (l.notes?.includes('[Converted to Sourcing Partner:') || !l.convertedAccountId);
        const supplierMatch = l.notes?.match(/\[Converted to Sourcing Partner:\s*([^\]]+)\]/);
        return {
          id: l.id,
          name: `${l.firstName} ${l.lastName}`.trim(),
          company: l.companyName,
          email: l.email,
          phone: l.phone || '',
          country: l.country,
          source: l.leadSource,
          status: (l.status as LeadItem['status']) || 'NEW',
          notes: l.notes || '',
          date: l.createdAt.toISOString().split('T')[0] ?? '',
          leadType,
          convertedAccountId: l.convertedAccountId || undefined,
          convertedType: (l.status === 'CONVERTED' ? (l.convertedAccountId ? 'BUYER' : isSupplierConverted ? 'SUPPLIER' : leadType) : undefined) as LeadItem['convertedType'],
          convertedSupplierCode: supplierMatch?.[1]?.trim(),
        };
      });

      return reply.send({ leads });
    } catch (err) {
      logger.error({ err }, '[CRM] Failed to fetch leads from database');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/crm/leads', async (req: FastifyRequest<{ Body: Partial<LeadItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    const fullName = (data.name || data.company || 'Direct Contact').trim();
    const parts = fullName.split(' ');
    const firstName = parts[0] || 'Direct';
    const isSupplier = data.leadType === 'SUPPLIER' || data.company?.toLowerCase().includes('supplier');
    const lastName = parts.slice(1).join(' ') || (isSupplier ? 'Supplier' : 'Buyer');

    let notesText = data.notes || '';
    if (isSupplier && !notesText.includes('[Type: SUPPLIER]')) {
      notesText = `[Type: SUPPLIER] ${notesText}`.trim();
    }

    try {
      const created = await prisma.lead.create({
        data: {
          organizationId: orgId,
          firstName,
          lastName,
          companyName: data.company || fullName,
          email: data.email || 'inquiry@polybridgeventures.com',
          phone: data.phone || null,
          country: data.country || 'India',
          leadSource: data.source || 'Website Contact Form',
          status: (data.status as string) || 'NEW',
          notes: notesText,
        },
      });

      const newLead: LeadItem = {
        id: created.id,
        name: `${created.firstName} ${created.lastName}`.trim(),
        company: created.companyName,
        email: created.email,
        phone: created.phone || '',
        country: created.country,
        source: created.leadSource,
        status: (created.status as LeadItem['status']) || 'NEW',
        notes: created.notes || '',
        date: created.createdAt.toISOString().split('T')[0] ?? '',
        leadType: isSupplier ? 'SUPPLIER' : 'BUYER',
        convertedAccountId: created.convertedAccountId || undefined,
      };

      await logAudit('System', 'CREATE', 'Lead', created.id, `Created ${newLead.leadType} lead: ${newLead.company} (${newLead.country})`);
      return reply.status(201).send({ lead: newLead });
    } catch (err) {
      logger.error({ err }, '[CRM] Database error creating lead');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/crm/leads/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<LeadItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};

    let firstName: string | undefined;
    let lastName: string | undefined;
    if (data.name) {
      const parts = data.name.trim().split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || '';
    }

    try {
      const updated = await prisma.lead.update({
        where: { id },
        data: {
          ...(firstName ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(data.company ? { companyName: data.company } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.country ? { country: data.country } : {}),
          ...(data.source ? { leadSource: data.source } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
      });

      const mapped: LeadItem = {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`.trim(),
        company: updated.companyName,
        email: updated.email,
        phone: updated.phone || '',
        country: updated.country,
        source: updated.leadSource,
        status: (updated.status as LeadItem['status']) || 'NEW',
        notes: updated.notes || '',
        date: updated.createdAt.toISOString().split('T')[0] ?? '',
        convertedAccountId: updated.convertedAccountId || undefined,
      };

      await logAudit('System', 'UPDATE', 'Lead', updated.id, `Updated lead details for: ${updated.companyName}`);
      return reply.send({ lead: mapped });
    } catch (err) {
      logger.error({ err }, '[CRM] Lead update error');
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.patch('/crm/leads/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<LeadItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const updated = await prisma.lead.update({
        where: { id },
        data: {
          ...(data.company ? { companyName: data.company } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
      });
      const mapped: LeadItem = {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`.trim(),
        company: updated.companyName,
        email: updated.email,
        phone: updated.phone || '',
        country: updated.country,
        source: updated.leadSource,
        status: (updated.status as LeadItem['status']) || 'NEW',
        notes: updated.notes || '',
        date: updated.createdAt.toISOString().split('T')[0] ?? '',
        convertedAccountId: updated.convertedAccountId || undefined,
      };
      return reply.send({ lead: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // Dedicated Core Helper for Converting Lead to Verified Partner (Buyer) or Sourcing Partner (Supplier)
  async function executeLeadConversion(
    leadId: string,
    options?: {
      targetType?: 'BUYER' | 'SUPPLIER';
      // Buyer fields
      accountNumber?: string;
      companyName?: string;
      country?: string;
      destinationPort?: string;
      paymentTerms?: string;
      // Supplier fields
      supplierCode?: string;
      state?: string;
      location?: string;
      commodities?: string;
      rating?: number;
    }
  ) {
    const orgId = await getOrganizationId();
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { convertedAccount: { include: { salesOrders: true } } },
    });

    if (!lead) throw new Error('Lead not found');

    const inferredType: 'BUYER' | 'SUPPLIER' =
      lead.notes?.includes('[Type: SUPPLIER]') ||
      lead.companyName.toLowerCase().includes('supplier') ||
      lead.firstName.toLowerCase().includes('supplier') ||
      lead.lastName.toLowerCase().includes('supplier') ||
      lead.notes?.toLowerCase().includes('want to sell') ||
      lead.notes?.toLowerCase().includes('stock') ||
      lead.notes?.toLowerCase().includes('supply') ||
      lead.notes?.toLowerCase().includes('manufacturer')
        ? 'SUPPLIER'
        : 'BUYER';

    const targetType = options?.targetType || inferredType;

    // -------------------------------------------------------------
    // CONVERT TO SOURCING PARTNER (SUPPLIER)
    // -------------------------------------------------------------
    if (targetType === 'SUPPLIER') {
      const companyName = (options?.companyName || lead.companyName || 'Sourcing Partner LLP').trim();
      const country = (options?.country || lead.country || 'India').trim();
      const stateName = (options?.state || 'Gujarat').trim();
      const location = (options?.location || 'Unjha').trim();
      const stateCode = stateName.slice(0, 2).toUpperCase() || 'IN';
      const supplierCode = (options?.supplierCode || `SUP-${stateCode}-${Math.floor(100 + Math.random() * 900)}`).trim();
      const commodities = (options?.commodities || lead.notes || 'Spices & Agro Commodities').trim();
      const paymentTerms = (options?.paymentTerms || '15 Days Credit').trim();
      const rating = Number(options?.rating) || 4.8;
      const paymentTermsDays = parseInt(String(paymentTerms).replace(/\D/g, '') || '15', 10);

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Supplier in Procurement database
        const supplier = await tx.supplier.create({
          data: {
            organizationId: orgId,
            supplierCode,
            name: companyName,
            country,
            state: stateName,
            paymentTermsDays,
            currency: 'USD',
            address: {
              city: location,
              state: stateName,
              commodities,
              paymentTerms,
              rating,
              contactPerson: `${lead.firstName} ${lead.lastName}`.trim(),
              email: lead.email,
              phone: lead.phone,
            },
            isActive: true,
          },
        });

        // 2. Update Lead status to CONVERTED and tag as Sourcing Partner in notes
        const conversionTag = `[Converted to Sourcing Partner: ${supplier.supplierCode}]`;
        const updatedNotes = lead.notes ? `${lead.notes} ${conversionTag}` : conversionTag;
        const updatedLead = await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: 'CONVERTED',
            notes: updatedNotes,
          },
        });

        return { supplier, updatedLead };
      });

      const mappedSupplier: SupplierItem = {
        id: result.supplier.id,
        code: result.supplier.supplierCode,
        name: result.supplier.name,
        location,
        state: stateName,
        commodities,
        paymentTerms,
        rating,
      };

      const mappedLead: LeadItem = {
        id: result.updatedLead.id,
        name: `${result.updatedLead.firstName} ${result.updatedLead.lastName}`.trim(),
        company: result.updatedLead.companyName,
        email: result.updatedLead.email,
        phone: result.updatedLead.phone || '',
        country: result.updatedLead.country,
        source: result.updatedLead.leadSource,
        status: 'CONVERTED',
        notes: result.updatedLead.notes || '',
        date: result.updatedLead.createdAt.toISOString().split('T')[0] ?? '',
        convertedType: 'SUPPLIER',
        convertedSupplierCode: result.supplier.supplierCode,
      };

      await logAudit(
        'System',
        'CONVERT_LEAD_TO_SUPPLIER',
        'Lead',
        lead.id,
        `Converted lead "${mappedLead.company}" to Sourcing Partner "${mappedSupplier.name}" (${mappedSupplier.code})`
      );

      return {
        targetType: 'SUPPLIER' as const,
        lead: mappedLead,
        supplier: mappedSupplier,
      };
    }

    // -------------------------------------------------------------
    // CONVERT TO VERIFIED COMMERCIAL PARTNER (BUYER)
    // -------------------------------------------------------------
    if (lead.convertedAccountId && lead.convertedAccount) {
      const acc = lead.convertedAccount;
      const port = (acc.shippingAddress as Record<string, string>)?.port || 'Port of Rotterdam';
      return {
        targetType: 'BUYER' as const,
        lead: {
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`.trim(),
          company: lead.companyName,
          email: lead.email,
          phone: lead.phone || '',
          country: lead.country,
          source: lead.leadSource,
          status: 'CONVERTED' as LeadItem['status'],
          notes: lead.notes || '',
          date: lead.createdAt.toISOString().split('T')[0] ?? '',
          convertedAccountId: acc.id,
          convertedType: 'BUYER',
        },
        account: {
          id: acc.id,
          accountNumber: acc.accountNumber,
          name: acc.name,
          country: acc.country,
          destinationPort: port,
          paymentTerms: `${acc.paymentTermsDays} Days Net`,
          status: (acc.isActive ? 'ACTIVE' : 'ON_HOLD') as AccountItem['status'],
          totalOrdersValue: acc.salesOrders.reduce((sum, so) => sum + Number(so.totalAmount), 0),
        },
      };
    }

    const firstUser = await prisma.user.findFirst();
    if (!firstUser) throw new Error('No user found to assign account to');

    const country = (options?.country || lead.country || 'India').trim();
    const companyName = (options?.companyName || lead.companyName || 'Verified Buyer LLC').trim();
    const countryCode = country.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') || 'GLB';
    const accNumber = (options?.accountNumber || `ACC-${countryCode}-${Math.floor(100 + Math.random() * 900)}`).trim();
    const destinationPort = (
      options?.destinationPort ||
      (country.toLowerCase().includes('uae') || country.toLowerCase().includes('emirates')
        ? 'Jebel Ali Port (UAE)'
        : country.toLowerCase().includes('nepal')
        ? 'Birgunj Dry Port (Nepal)'
        : country.toLowerCase().includes('ghana')
        ? 'Tema Port (Ghana)'
        : country.toLowerCase().includes('netherlands')
        ? 'Port of Rotterdam'
        : country.toLowerCase().includes('germany')
        ? 'Port of Hamburg'
        : 'Port of Rotterdam')
    ).trim();
    const paymentTermsDays = parseInt(String(options?.paymentTerms || '30').replace(/\D/g, '') || '30', 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Verified Buyer Account
      const account = await tx.account.create({
        data: {
          organizationId: orgId,
          accountNumber: accNumber,
          name: companyName,
          country: country,
          shippingAddress: { port: destinationPort },
          billingAddress: { country },
          paymentTermsDays,
          assignedToId: lead.assignedToId || firstUser.id,
          isActive: true,
        },
        include: { salesOrders: true },
      });

      // 2. Create primary Contact for the Buyer
      try {
        await tx.contact.create({
          data: {
            accountId: account.id,
            firstName: lead.firstName || 'Direct',
            lastName: lead.lastName || 'Buyer',
            email: lead.email || 'purchasing@buyer.com',
            phone: lead.phone || null,
            roleInCompany: 'Purchasing & Procurement Lead',
            isPrimary: true,
          },
        });
      } catch (cErr) {
        logger.warn({ cErr }, '[CRM] Contact record creation skipped');
      }

      // 3. Mark lead as CONVERTED and link to created Account
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'CONVERTED',
          convertedAccountId: account.id,
        },
      });

      return { account, updatedLead };
    });

    await logAudit(
      'System',
      'CONVERT_LEAD_TO_BUYER',
      'Lead',
      lead.id,
      `Converted lead "${result.updatedLead.companyName}" to Verified Partner "${result.account.name}" (${result.account.accountNumber})`
    );

    return {
      targetType: 'BUYER' as const,
      lead: {
        id: result.updatedLead.id,
        name: `${result.updatedLead.firstName} ${result.updatedLead.lastName}`.trim(),
        company: result.updatedLead.companyName,
        email: result.updatedLead.email,
        phone: result.updatedLead.phone || '',
        country: result.updatedLead.country,
        source: result.updatedLead.leadSource,
        status: 'CONVERTED' as LeadItem['status'],
        notes: result.updatedLead.notes || '',
        date: result.updatedLead.createdAt.toISOString().split('T')[0] ?? '',
        convertedAccountId: result.account.id,
        convertedType: 'BUYER',
      },
      account: {
        id: result.account.id,
        accountNumber: result.account.accountNumber,
        name: result.account.name,
        country: result.account.country,
        destinationPort,
        paymentTerms: `${result.account.paymentTermsDays} Days Net`,
        status: (result.account.isActive ? 'ACTIVE' : 'ON_HOLD') as AccountItem['status'],
        totalOrdersValue: 0,
      },
    };
  }

  // Auto-backfill any leads already in CONVERTED state without an Account
  setTimeout(async () => {
    try {
      const unconverted = await prisma.lead.findMany({
        where: {
          status: 'CONVERTED',
          convertedAccountId: null,
          NOT: {
            notes: { contains: '[Converted to Sourcing Partner:' },
          },
        },
      });
      for (const unc of unconverted) {
        await executeLeadConversion(unc.id, { targetType: 'BUYER' });
        logger.info(`[CRM] Auto-backfilled Buyer Account for converted lead: ${unc.companyName}`);
      }
    } catch (backfillErr) {
      logger.warn({ backfillErr }, '[CRM] Backfill check finished');
    }
  }, 1000);

  // POST /crm/leads/:id/convert - Dedicated Endpoint supporting BUYER and SUPPLIER
  server.post('/crm/leads/:id/convert', async (req: FastifyRequest<{
    Params: { id: string };
    Body: {
      targetType?: 'BUYER' | 'SUPPLIER';
      accountNumber?: string;
      companyName?: string;
      country?: string;
      destinationPort?: string;
      paymentTerms?: string;
      supplierCode?: string;
      state?: string;
      location?: string;
      commodities?: string;
      rating?: number;
    };
  }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const outcome = await executeLeadConversion(id, data);
      return reply.status(201).send({
        success: true,
        targetType: outcome.targetType,
        lead: outcome.lead,
        account: 'account' in outcome ? outcome.account : undefined,
        supplier: 'supplier' in outcome ? outcome.supplier : undefined,
      });
    } catch (err) {
      logger.error({ err }, '[CRM] Error converting lead');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.patch('/crm/leads/:id/status', async (req: FastifyRequest<{ Params: { id: string }; Body: { status: LeadItem['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};

    try {
      // If advancing directly to CONVERTED, ensure an Account is guaranteed to be created!
      if (status === 'CONVERTED') {
        const outcome = await executeLeadConversion(id);
        return reply.send({
          lead: outcome.lead,
          account: 'account' in outcome ? outcome.account : undefined,
          supplier: 'supplier' in outcome ? outcome.supplier : undefined,
        });
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: { status },
      });
      const mapped: LeadItem = {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`.trim(),
        company: updated.companyName,
        email: updated.email,
        phone: updated.phone || '',
        country: updated.country,
        source: updated.leadSource,
        status: (updated.status as LeadItem['status']) || 'NEW',
        notes: updated.notes || '',
        date: updated.createdAt.toISOString().split('T')[0] ?? '',
        convertedAccountId: updated.convertedAccountId || undefined,
      };
      await logAudit('System', 'UPDATE_STATUS', 'Lead', id, `Updated lead status to ${status}`);
      return reply.send({ lead: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.delete('/crm/leads/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.lead.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'Lead', id, `Deleted lead record ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // ACCOUNTS
  server.get('/crm/accounts', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbAccounts = await prisma.account.findMany({
        orderBy: { createdAt: 'desc' },
        include: { salesOrders: true },
      });

      const accounts: AccountItem[] = dbAccounts.map((a) => {
        const port = (a.shippingAddress as Record<string, string>)?.port || 'Port of Rotterdam';
        return {
          id: a.id,
          accountNumber: a.accountNumber,
          name: a.name,
          country: a.country,
          destinationPort: port,
          paymentTerms: `${a.paymentTermsDays} Days Net`,
          status: a.isActive ? 'ACTIVE' : 'ON_HOLD',
          totalOrdersValue: a.salesOrders.reduce((sum, so) => sum + Number(so.totalAmount), 0),
        };
      });

      return reply.send({ accounts });
    } catch (err) {
      logger.error({ err }, '[CRM] Failed to fetch accounts from database');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/crm/accounts', async (req: FastifyRequest<{ Body: Partial<AccountItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();
    const accNumber = data.accountNumber || `ACC-${data.country?.slice(0, 3).toUpperCase() || 'GLB'}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) throw new Error('No user found to assign account to');

      const created = await prisma.account.create({
        data: {
          organizationId: orgId,
          accountNumber: accNumber,
          name: data.name || 'Verified Buyer LLC',
          country: data.country || 'United Arab Emirates',
          shippingAddress: { port: data.destinationPort || 'Port of Rotterdam' },
          billingAddress: { country: data.country || 'United Arab Emirates' },
          paymentTermsDays: parseInt(String(data.paymentTerms || '30').replace(/\D/g, '') || '30', 10),
          assignedToId: firstUser.id,
          isActive: (data.status || 'ACTIVE') === 'ACTIVE',
        },
      });

      const newAccount: AccountItem = {
        id: created.id,
        accountNumber: created.accountNumber,
        name: created.name,
        country: created.country,
        destinationPort: data.destinationPort || 'Port of Rotterdam',
        paymentTerms: `${created.paymentTermsDays} Days Net`,
        status: created.isActive ? 'ACTIVE' : 'ON_HOLD',
        totalOrdersValue: 0,
      };

      await logAudit('System', 'CREATE', 'Account', created.id, `Created account: ${newAccount.name}`);
      return reply.status(201).send({ account: newAccount });
    } catch (err) {
      logger.error({ err }, '[CRM] Database error creating account');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/crm/accounts/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<AccountItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};

    try {
      const updated = await prisma.account.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.country ? { country: data.country } : {}),
          ...(data.destinationPort ? { shippingAddress: { port: data.destinationPort } } : {}),
          ...(data.status ? { isActive: data.status === 'ACTIVE' } : {}),
          ...(data.paymentTerms ? { paymentTermsDays: parseInt(String(data.paymentTerms).replace(/\D/g, '') || '30', 10) } : {}),
        },
        include: { salesOrders: true },
      });

      const port = (updated.shippingAddress as Record<string, string>)?.port || data.destinationPort || 'Port of Rotterdam';
      const mapped: AccountItem = {
        id: updated.id,
        accountNumber: updated.accountNumber,
        name: updated.name,
        country: updated.country,
        destinationPort: port,
        paymentTerms: `${updated.paymentTermsDays} Days Net`,
        status: updated.isActive ? 'ACTIVE' : 'ON_HOLD',
        totalOrdersValue: updated.salesOrders.reduce((sum, so) => sum + Number(so.totalAmount), 0),
      };

      await logAudit('System', 'UPDATE', 'Account', updated.id, `Updated account: ${mapped.name}`);
      return reply.send({ account: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.patch('/crm/accounts/:id/status', async (req: FastifyRequest<{ Params: { id: string }; Body: { status: AccountItem['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};
    try {
      const updated = await prisma.account.update({
        where: { id },
        data: { isActive: status === 'ACTIVE' },
        include: { salesOrders: true },
      });
      const port = (updated.shippingAddress as Record<string, string>)?.port || 'Port of Rotterdam';
      const mapped: AccountItem = {
        id: updated.id,
        accountNumber: updated.accountNumber,
        name: updated.name,
        country: updated.country,
        destinationPort: port,
        paymentTerms: `${updated.paymentTermsDays} Days Net`,
        status: updated.isActive ? 'ACTIVE' : 'ON_HOLD',
        totalOrdersValue: updated.salesOrders.reduce((sum, so) => sum + Number(so.totalAmount), 0),
      };
      return reply.send({ account: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.delete('/crm/accounts/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.account.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'Account', id, `Deleted account ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // -------------------------------------------------------------
  // PRODUCT CATALOGUE (Pure Database)
  // -------------------------------------------------------------
  server.get('/catalogue/products', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbProducts = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true, uom: true },
        orderBy: { createdAt: 'desc' },
      });

      const products: ProductItem[] = dbProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category?.name || 'General Commodity',
        uom: p.uom?.code || 'MT',
        standardCost: Number(p.standardCost),
        standardPrice: Number(p.standardPrice),
        currency: p.currency,
        description: p.description || '',
      }));

      return reply.send({ products });
    } catch (err) {
      logger.error({ err }, '[Catalogue] Failed to fetch products from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/catalogue/products', async (req: FastifyRequest<{ Body: Partial<ProductItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    try {
      let cat = await prisma.category.findFirst({
        where: data.category ? { name: { equals: data.category, mode: 'insensitive' } } : undefined,
      });
      if (!cat) {
        cat = await prisma.category.findFirst();
        if (!cat) {
          cat = await prisma.category.create({
            data: { name: data.category || 'General Commodities', code: `CAT-${Date.now().toString().slice(-4)}` },
          });
        }
      }

      let uom = await prisma.unitOfMeasure.findFirst({
        where: data.uom ? { code: { equals: data.uom, mode: 'insensitive' } } : undefined,
      });
      if (!uom) {
        uom = await prisma.unitOfMeasure.findFirst();
        if (!uom) {
          uom = await prisma.unitOfMeasure.create({
            data: { name: 'Metric Ton', code: data.uom || 'MT' },
          });
        }
      }

      const sku = data.sku || `PROD-${Date.now().toString().slice(-4)}`;

      const created = await prisma.product.create({
        data: {
          organizationId: orgId,
          sku,
          name: data.name || 'New Commodity',
          categoryId: cat.id,
          uomId: uom.id,
          standardCost: Number(data.standardCost || 0),
          standardPrice: Number(data.standardPrice || 0),
          currency: data.currency || 'USD',
          description: data.description || '',
          isActive: true,
        },
        include: { category: true, uom: true },
      });

      const newProduct: ProductItem = {
        id: created.id,
        sku: created.sku,
        name: created.name,
        category: created.category.name,
        uom: created.uom.code,
        standardCost: Number(created.standardCost),
        standardPrice: Number(created.standardPrice),
        currency: created.currency,
        description: created.description || '',
      };

      await logAudit('System', 'CREATE', 'Product', created.id, `Created catalogue item: ${newProduct.name} (${newProduct.sku})`);
      return reply.status(201).send({ product: newProduct });
    } catch (err) {
      logger.error({ err }, '[Catalogue] Error creating product in DB');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/catalogue/products/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<ProductItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const updated = await prisma.product.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.standardCost !== undefined ? { standardCost: Number(data.standardCost) } : {}),
          ...(data.standardPrice !== undefined ? { standardPrice: Number(data.standardPrice) } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
        },
        include: { category: true, uom: true },
      });
      const mapped: ProductItem = {
        id: updated.id,
        sku: updated.sku,
        name: updated.name,
        category: updated.category.name,
        uom: updated.uom.code,
        standardCost: Number(updated.standardCost),
        standardPrice: Number(updated.standardPrice),
        currency: updated.currency,
        description: updated.description || '',
      };
      return reply.send({ product: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.delete('/catalogue/products/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.product.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'Product', id, `Deleted catalogue product ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // -------------------------------------------------------------
  // SALES, QUOTES & ORDERS (Pure Database)
  // -------------------------------------------------------------
  server.get('/sales/quotes', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbQuotes = await prisma.quote.findMany({
        orderBy: { createdAt: 'desc' },
        include: { account: true, lines: { include: { product: true, uom: true } } },
      });

      const quotes: QuoteItem[] = dbQuotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        version: q.version,
        customerName: q.account?.name || 'Verified Buyer LLC',
        country: q.account?.country || 'United Arab Emirates',
        status: (q.status as QuoteItem['status']) || 'DRAFT',
        totalAmount: Number(q.totalAmount),
        totalCost: Number(q.totalCost || q.subtotalAmount),
        currency: q.currency,
        marginPercent: Number(q.grossMarginPercent),
        validUntil: q.validUntil ? q.validUntil.toISOString().split('T')[0] ?? '' : '',
        createdAt: q.createdAt ? q.createdAt.toISOString().split('T')[0] ?? '' : '',
        lines: q.lines.map((l) => ({
          id: l.id,
          productSku: l.product?.sku || 'SKU-001',
          productName: l.product?.name || 'Commodity Line',
          quantity: Number(l.quantity),
          uom: l.uom?.code || 'MT',
          unitCost: Number(l.unitCost),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
          marginPercent: Number(l.lineMarginPercent || q.grossMarginPercent),
        })),
      }));

      return reply.send({ quotes });
    } catch (err) {
      logger.error({ err }, '[Sales] Failed to fetch quotes from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/sales/quotes', async (req: FastifyRequest<{ Body: Partial<QuoteItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    try {
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No system user found to associate quote creation');

      const customerName = (data.customerName || 'Verified Buyer LLC').trim();
      const country = (data.country || 'United Arab Emirates').trim();

      // Find or create account matching the exact customerName entered by user
      let acc = await prisma.account.findFirst({
        where: { name: { equals: customerName, mode: 'insensitive' } },
      });

      if (!acc) {
        const accNumber = `ACC-${country.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        acc = await prisma.account.create({
          data: {
            organizationId: orgId,
            accountNumber: accNumber,
            name: customerName,
            country: country,
            shippingAddress: { port: 'Port of Rotterdam' },
            billingAddress: { country: country },
            paymentTermsDays: 30,
            assignedToId: user.id,
            isActive: true,
          },
        });
      }

      // Compute exact line totals and margins from actual user input
      const lines = data.lines || [];
      const computedTotalAmount = lines.length > 0
        ? lines.reduce((accVal, l) => accVal + (Number(l.lineTotal) || (Number(l.quantity) * Number(l.unitPrice)) || 0), 0)
        : Number(data.totalAmount || 0);

      const computedTotalCost = lines.length > 0
        ? lines.reduce((accVal, l) => accVal + ((Number(l.quantity) * Number(l.unitCost)) || 0), 0)
        : Number(data.totalCost || computedTotalAmount * 0.8);

      const computedMargin = computedTotalAmount > 0
        ? Number((((computedTotalAmount - computedTotalCost) / computedTotalAmount) * 100).toFixed(2))
        : Number(data.marginPercent || 15);

      const qNumber = data.quoteNumber || `Q-2026-${Math.floor(100 + Math.random() * 900)}`;

      const created = await prisma.quote.create({
        data: {
          organizationId: orgId,
          quoteNumber: qNumber,
          version: 1,
          accountId: acc.id,
          createdById: user.id,
          status: data.status || 'DRAFT',
          currency: data.currency || 'USD',
          subtotalAmount: computedTotalAmount,
          totalAmount: computedTotalAmount,
          totalCost: computedTotalCost,
          grossMarginPercent: computedMargin,
          validUntil: data.validUntil ? new Date(data.validUntil) : new Date(Date.now() + 30 * 86400000),
        },
        include: { account: true },
      });

      // Save line items in Prisma
      if (lines.length > 0) {
        const defaultUom = await prisma.unitOfMeasure.findFirst();
        const defaultProduct = await prisma.product.findFirst();
        for (const line of lines) {
          const prod = line.productSku
            ? await prisma.product.findUnique({ where: { sku: line.productSku } })
            : defaultProduct;
          if (prod && defaultUom) {
            await prisma.quoteLine.create({
              data: {
                quoteId: created.id,
                productId: prod.id,
                uomId: prod.uomId || defaultUom.id,
                quantity: Number(line.quantity) || 1,
                unitCost: Number(line.unitCost) || Number(prod.standardCost),
                unitPrice: Number(line.unitPrice) || Number(prod.standardPrice),
                lineTotal: Number(line.lineTotal) || (Number(line.quantity || 1) * Number(line.unitPrice || 1)),
                lineMarginPercent: Number(line.marginPercent) || computedMargin,
              },
            });
          }
        }
      }

      // Re-query created quote to get full DB entity with line items
      const fullQuote = await prisma.quote.findUniqueOrThrow({
        where: { id: created.id },
        include: { account: true, lines: { include: { product: true, uom: true } } },
      });

      const newQuote: QuoteItem = {
        id: fullQuote.id,
        quoteNumber: fullQuote.quoteNumber,
        version: fullQuote.version,
        customerName: fullQuote.account.name,
        country: fullQuote.account.country,
        status: fullQuote.status as QuoteItem['status'],
        totalAmount: Number(fullQuote.totalAmount),
        totalCost: Number(fullQuote.totalCost),
        currency: fullQuote.currency,
        marginPercent: Number(fullQuote.grossMarginPercent),
        validUntil: fullQuote.validUntil.toISOString().split('T')[0] ?? '',
        createdAt: fullQuote.createdAt.toISOString().split('T')[0] ?? '',
        lines: fullQuote.lines.map((l) => ({
          id: l.id,
          productSku: l.product?.sku || 'SKU',
          productName: l.product?.name || 'Line Item',
          quantity: Number(l.quantity),
          uom: l.uom?.code || 'MT',
          unitCost: Number(l.unitCost),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
          marginPercent: Number(l.lineMarginPercent),
        })),
      };

      await logAudit('System', 'CREATE', 'Quote', created.id, `Generated quotation ${created.quoteNumber} for ${acc.name}`);
      return reply.status(201).send({ quote: newQuote });
    } catch (err) {
      logger.error({ err }, '[Sales] Quote creation database error');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/sales/quotes/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<QuoteItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const updated = await prisma.quote.update({
        where: { id },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.totalAmount !== undefined ? { totalAmount: Number(data.totalAmount) } : {}),
          ...(data.totalCost !== undefined ? { totalCost: Number(data.totalCost) } : {}),
          ...(data.marginPercent !== undefined ? { grossMarginPercent: Number(data.marginPercent) } : {}),
        },
        include: { account: true, lines: { include: { product: true, uom: true } } },
      });

      const mapped: QuoteItem = {
        id: updated.id,
        quoteNumber: updated.quoteNumber,
        version: updated.version,
        customerName: updated.account.name,
        country: updated.account.country,
        status: updated.status as QuoteItem['status'],
        totalAmount: Number(updated.totalAmount),
        totalCost: Number(updated.totalCost),
        currency: updated.currency,
        marginPercent: Number(updated.grossMarginPercent),
        validUntil: updated.validUntil.toISOString().split('T')[0] ?? '',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
        lines: updated.lines.map((l) => ({
          id: l.id,
          productSku: l.product?.sku || 'SKU',
          productName: l.product?.name || 'Line Item',
          quantity: Number(l.quantity),
          uom: l.uom?.code || 'MT',
          unitCost: Number(l.unitCost),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
          marginPercent: Number(l.lineMarginPercent),
        })),
      };

      return reply.send({ quote: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // Dual handler for APPROVE quote (handles both PATCH and POST /sales/quotes/:id/approve)
  const approveQuoteHandler = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      const updated = await prisma.quote.update({
        where: { id },
        data: { status: 'APPROVED' },
        include: { account: true, lines: { include: { product: true, uom: true } } },
      });
      const mapped: QuoteItem = {
        id: updated.id,
        quoteNumber: updated.quoteNumber,
        version: updated.version,
        customerName: updated.account.name,
        country: updated.account.country,
        status: 'APPROVED',
        totalAmount: Number(updated.totalAmount),
        totalCost: Number(updated.totalCost),
        currency: updated.currency,
        marginPercent: Number(updated.grossMarginPercent),
        validUntil: updated.validUntil.toISOString().split('T')[0] ?? '',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
        lines: updated.lines.map((l) => ({
          id: l.id,
          productSku: l.product?.sku || 'SKU',
          productName: l.product?.name || 'Line Item',
          quantity: Number(l.quantity),
          uom: l.uom?.code || 'MT',
          unitCost: Number(l.unitCost),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
          marginPercent: Number(l.lineMarginPercent),
        })),
      };
      await logAudit('System', 'APPROVE', 'Quote', id, `Approved quotation ${updated.quoteNumber}`);
      return reply.send({ quote: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  };
  server.patch('/sales/quotes/:id/approve', approveQuoteHandler);
  server.post('/sales/quotes/:id/approve', approveQuoteHandler);

  async function performQuoteConversion(id: string, orgId: string): Promise<SalesOrderItem> {
    const q = await prisma.quote.findUnique({
      where: { id },
      include: { account: true, lines: true },
    });

    if (!q) {
      throw new Error('Quote not found in database');
    }

    await prisma.quote.update({
      where: { id },
      data: { status: 'CONVERTED' },
    });

    // Check if sales order already exists for this quote
    const existingOrder = await prisma.salesOrder.findFirst({
      where: { originatingQuoteId: id },
      include: { account: true },
    });

    if (existingOrder) {
      return {
        id: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        customerName: existingOrder.account.name,
        customerPo: existingOrder.customerPoReference || 'N/A',
        quoteRef: q.quoteNumber,
        status: existingOrder.status as SalesOrderItem['status'],
        totalAmount: Number(existingOrder.totalAmount),
        currency: existingOrder.currency,
        deliveryTerm: 'CIF Destination Port',
        destinationPort: (existingOrder.shippingAddress as Record<string, string>)?.port || 'Jebel Ali Port',
        createdAt: existingOrder.createdAt.toISOString().split('T')[0] ?? '',
      };
    }

    const user = await prisma.user.findFirst();
    const newOrderNum = `SO-2026-${Math.floor(100 + Math.random() * 900)}`;

    const createdOrder = await prisma.salesOrder.create({
      data: {
        organizationId: orgId,
        orderNumber: newOrderNum,
        accountId: q.accountId,
        originatingQuoteId: id,
        customerPoReference: `PO-${newOrderNum.replace('SO-', '')}`,
        status: 'CONFIRMED',
        currency: q.currency,
        subtotalAmount: q.totalAmount,
        totalAmount: q.totalAmount,
        shippingAddress: { port: (q.account.shippingAddress as Record<string, string>)?.port || q.account.country || 'Jebel Ali Port' },
        createdById: user?.id || q.createdById,
      },
      include: { account: true },
    });

    // Transfer quote lines to sales order lines if present
    if (q.lines.length > 0) {
      for (const line of q.lines) {
        await prisma.salesOrderLine.create({
          data: {
            salesOrderId: createdOrder.id,
            productId: line.productId,
            uomId: line.uomId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          },
        });
      }
    }

    await logAudit('System', 'CONVERT', 'SalesOrder', createdOrder.id, `Converted Quote ${q.quoteNumber} into Sales Order ${createdOrder.orderNumber}`);

    return {
      id: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      customerName: createdOrder.account.name,
      customerPo: createdOrder.customerPoReference || 'N/A',
      quoteRef: q.quoteNumber,
      status: 'CONFIRMED',
      totalAmount: Number(createdOrder.totalAmount),
      currency: createdOrder.currency,
      deliveryTerm: 'CIF Destination Port',
      destinationPort: (createdOrder.shippingAddress as Record<string, string>)?.port || 'Jebel Ali Port',
      createdAt: createdOrder.createdAt.toISOString().split('T')[0] ?? '',
    };
  }

  server.post('/sales/quotes/:id/convert', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const orgId = await getOrganizationId();

    try {
      const mappedOrder = await performQuoteConversion(id, orgId);
      return reply.send({ success: true, order: mappedOrder });
    } catch (err) {
      logger.error({ err }, '[Sales] Failed to convert quote to sales order');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.patch('/sales/quotes/:id/status', async (req: FastifyRequest<{ Params: { id: string }; Body: { status: QuoteItem['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const orgId = await getOrganizationId();

    try {
      let createdOrder: SalesOrderItem | undefined;
      if (status === 'CONVERTED') {
        createdOrder = await performQuoteConversion(id, orgId);
      } else {
        await prisma.quote.update({
          where: { id },
          data: { status },
        });
      }

      const updated = await prisma.quote.findUniqueOrThrow({
        where: { id },
        include: { account: true, lines: { include: { product: true, uom: true } } },
      });

      const mapped: QuoteItem = {
        id: updated.id,
        quoteNumber: updated.quoteNumber,
        version: updated.version,
        customerName: updated.account.name,
        country: updated.account.country,
        status: updated.status as QuoteItem['status'],
        totalAmount: Number(updated.totalAmount),
        totalCost: Number(updated.totalCost),
        currency: updated.currency,
        marginPercent: Number(updated.grossMarginPercent),
        validUntil: updated.validUntil.toISOString().split('T')[0] ?? '',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
        lines: updated.lines.map((l) => ({
          id: l.id,
          productSku: l.product?.sku || 'SKU',
          productName: l.product?.name || 'Line Item',
          quantity: Number(l.quantity),
          uom: l.uom?.code || 'MT',
          unitCost: Number(l.unitCost),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
          marginPercent: Number(l.lineMarginPercent),
        })),
      };
      await logAudit('System', 'UPDATE_STATUS', 'Quote', id, `Updated quote status to ${status}`);
      return reply.send({ quote: mapped, order: createdOrder });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.delete('/sales/quotes/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.quoteLine.deleteMany({ where: { quoteId: id } });
      await prisma.quote.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'Quote', id, `Deleted quotation ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // SALES ORDERS
  server.get('/sales/orders', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbOrders = await prisma.salesOrder.findMany({
        orderBy: { createdAt: 'desc' },
        include: { account: true, originatingQuote: true, invoices: true },
      });

      const orders: SalesOrderItem[] = dbOrders.map((o) => {
        const inv = o.invoices && o.invoices.length > 0 ? o.invoices[0] : undefined;
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.account?.name || 'Unknown Account',
          customerPo: o.customerPoReference || 'PO-CLIENT',
          quoteRef: o.originatingQuote?.quoteNumber || 'Q-DIRECT',
          status: o.status as SalesOrderItem['status'],
          totalAmount: Number(o.totalAmount),
          currency: o.currency,
          deliveryTerm: 'CIF Destination Port',
          destinationPort: (o.shippingAddress as Record<string, any>)?.port || 'Port of Destination',
          createdAt: o.createdAt.toISOString().split('T')[0] ?? '',
          invoiceId: inv?.id,
          invoiceNumber: inv?.invoiceNumber,
          invoiceStatus: inv?.status,
        };
      });

      return reply.send({ orders });
    } catch (err) {
      logger.error({ err }, '[Sales] Failed to fetch orders from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/sales/orders', async (req: FastifyRequest<{ Body: Partial<SalesOrderItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    try {
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No user found to create order');

      const customerName = (data.customerName || 'Direct Buyer LLC').trim();
      let acc = await prisma.account.findFirst({
        where: { name: { equals: customerName, mode: 'insensitive' } },
      });

      if (!acc) {
        acc = await prisma.account.create({
          data: {
            organizationId: orgId,
            accountNumber: `ACC-ORD-${Math.floor(100 + Math.random() * 900)}`,
            name: customerName,
            country: 'Netherlands',
            shippingAddress: { port: data.destinationPort || 'Port of Rotterdam' },
            billingAddress: { country: 'Netherlands' },
            paymentTermsDays: 30,
            assignedToId: user.id,
            isActive: true,
          },
        });
      }

      const oNum = data.orderNumber || `SO-2026-${Math.floor(100 + Math.random() * 900)}`;
      const totalAmount = Number(data.totalAmount || 50000);

      const created = await prisma.salesOrder.create({
        data: {
          organizationId: orgId,
          orderNumber: oNum,
          accountId: acc.id,
          createdById: user.id,
          customerPoReference: data.customerPo || 'PO-CLIENT-991',
          status: data.status || 'CONFIRMED',
          currency: data.currency || 'USD',
          subtotalAmount: totalAmount,
          totalAmount: totalAmount,
          shippingAddress: { port: data.destinationPort || 'Port of Rotterdam' },
        },
        include: { account: true, originatingQuote: true },
      });

      const newOrder: SalesOrderItem = {
        id: created.id,
        orderNumber: created.orderNumber,
        customerName: created.account.name,
        customerPo: created.customerPoReference || 'PO-CLIENT-991',
        quoteRef: created.originatingQuote?.quoteNumber || data.quoteRef || 'Q-DIRECT',
        status: created.status as SalesOrderItem['status'],
        totalAmount: Number(created.totalAmount),
        currency: created.currency,
        deliveryTerm: data.deliveryTerm || 'CIF Port of Rotterdam',
        destinationPort: data.destinationPort || 'Port of Rotterdam',
        createdAt: created.createdAt.toISOString().split('T')[0] ?? '',
      };

      await logAudit('System', 'CREATE', 'SalesOrder', created.id, `Created sales order ${created.orderNumber} for ${created.account.name}`);
      return reply.status(201).send({ order: newOrder });
    } catch (err) {
      logger.error({ err }, '[Sales] Database error creating order');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/sales/orders/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<SalesOrderItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const updated = await prisma.salesOrder.update({
        where: { id },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.totalAmount !== undefined ? { totalAmount: Number(data.totalAmount) } : {}),
          ...(data.destinationPort ? { shippingAddress: { port: data.destinationPort } } : {}),
          ...(data.customerPo ? { customerPoReference: data.customerPo } : {}),
        },
        include: { account: true, originatingQuote: true },
      });

      const mapped: SalesOrderItem = {
        id: updated.id,
        orderNumber: updated.orderNumber,
        customerName: updated.account.name,
        customerPo: updated.customerPoReference || 'PO-CLIENT',
        quoteRef: updated.originatingQuote?.quoteNumber || 'Q-DIRECT',
        status: updated.status as SalesOrderItem['status'],
        totalAmount: Number(updated.totalAmount),
        currency: updated.currency,
        deliveryTerm: data.deliveryTerm || 'CIF Destination Port',
        destinationPort: (updated.shippingAddress as Record<string, string>)?.port || 'Destination Port',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
      };

      return reply.send({ order: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.patch('/sales/orders/:id/status', async (req: FastifyRequest<{ Params: { id: string }; Body: { status: SalesOrderItem['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};
    try {
      const updated = await prisma.salesOrder.update({
        where: { id },
        data: { status },
        include: { account: true, originatingQuote: true },
      });
      const mapped: SalesOrderItem = {
        id: updated.id,
        orderNumber: updated.orderNumber,
        customerName: updated.account.name,
        customerPo: updated.customerPoReference || 'PO-CLIENT',
        quoteRef: updated.originatingQuote?.quoteNumber || 'Q-DIRECT',
        status: updated.status as SalesOrderItem['status'],
        totalAmount: Number(updated.totalAmount),
        currency: updated.currency,
        deliveryTerm: 'CIF Destination Port',
        destinationPort: (updated.shippingAddress as Record<string, string>)?.port || 'Destination Port',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
      };
      await logAudit('System', 'UPDATE_STATUS', 'SalesOrder', id, `Updated order status to ${status}`);
      return reply.send({ order: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.post('/sales/orders/:id/generate-invoice', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const orgId = await getOrganizationId();

    try {
      const so = await prisma.salesOrder.findUnique({
        where: { id },
        include: { account: true, invoices: true },
      });

      if (!so) {
        return reply.status(404).send({ error: 'Sales order not found' });
      }

      // Check if invoice already exists
      const existing = so.invoices && so.invoices.length > 0 ? so.invoices[0] : null;
      if (existing) {
        return reply.send({
          success: true,
          message: 'Invoice already exists for this order',
          invoice: {
            id: existing.id,
            invoiceNumber: existing.invoiceNumber,
            customerName: so.account.name,
            orderNumber: so.orderNumber,
            totalAmount: Number(existing.totalAmount),
            paidAmount: Number(existing.totalAmount) - Number(existing.balanceDue),
            balanceDue: Number(existing.balanceDue),
            currency: existing.currency,
            status: existing.status,
            dueDate: existing.dueDate.toISOString().split('T')[0],
            issueDate: existing.issuedAt.toISOString().split('T')[0],
          },
        });
      }

      const invCount = await prisma.customerInvoice.count();
      const invNum = `INV-2026-${String(invCount + 1).padStart(3, '0')}`;
      const totalAmount = Number(so.totalAmount);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (so.account?.paymentTermsDays || 30));

      const created = await prisma.customerInvoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: invNum,
          accountId: so.accountId,
          salesOrderId: so.id,
          status: 'ISSUED',
          currency: so.currency || 'USD',
          subtotalAmount: totalAmount,
          totalAmount: totalAmount,
          balanceDue: totalAmount,
          dueDate: dueDate,
          issuedAt: new Date(),
        },
        include: { account: true, salesOrder: true },
      });

      await logAudit('Finance', 'CREATE_INVOICE', 'Invoice', created.id, `Generated commercial invoice ${created.invoiceNumber} for order ${so.orderNumber}`);

      return reply.status(201).send({
        success: true,
        message: 'Commercial invoice created successfully',
        invoice: {
          id: created.id,
          invoiceNumber: created.invoiceNumber,
          customerName: created.account.name,
          orderNumber: created.salesOrder.orderNumber,
          totalAmount: Number(created.totalAmount),
          paidAmount: 0,
          balanceDue: Number(created.balanceDue),
          currency: created.currency,
          status: created.status,
          dueDate: created.dueDate.toISOString().split('T')[0],
          issueDate: created.issuedAt.toISOString().split('T')[0],
        },
      });
    } catch (err) {
      logger.error({ err }, '[Finance] Failed to generate invoice for sales order');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.delete('/sales/orders/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.salesOrderLine.deleteMany({ where: { salesOrderId: id } });
      await prisma.salesOrder.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'SalesOrder', id, `Deleted sales order ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // -------------------------------------------------------------
  // PROCUREMENT & POs (Pure Database)
  // -------------------------------------------------------------
  server.get('/procurement/suppliers', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbSuppliers = await prisma.supplier.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const suppliers: SupplierItem[] = dbSuppliers.map((s) => {
        const meta = (s.address as Record<string, any>) || {};
        return {
          id: s.id,
          code: s.supplierCode,
          name: s.name,
          location: meta.city || s.state || 'Gujarat',
          state: s.state || 'Gujarat',
          commodities: meta.commodities || 'Spices, Agro Products & Packaging',
          paymentTerms: meta.paymentTerms || `${s.paymentTermsDays} Days Net`,
          rating: Number(meta.rating) || 4.8,
        };
      });

      return reply.send({ suppliers });
    } catch (err) {
      logger.error({ err }, '[Procurement] Failed to fetch suppliers from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/procurement/suppliers', async (req: FastifyRequest<{ Body: Partial<SupplierItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    try {
      const code = data.code || `SUP-IN-${Math.floor(100 + Math.random() * 900)}`;
      const location = data.location || 'Gujarat';
      const stateName = data.state || 'Gujarat';
      const commodities = data.commodities || 'Spices & Agro Commodities';
      const paymentTerms = data.paymentTerms || '15 Days Credit';
      const rating = Number(data.rating) || 4.8;

      const created = await prisma.supplier.create({
        data: {
          organizationId: orgId,
          supplierCode: code,
          name: (data.name || 'Agro Processor LLP').trim(),
          country: 'India',
          state: stateName,
          paymentTermsDays: parseInt(String(paymentTerms).replace(/\D/g, '') || '15', 10),
          currency: 'USD',
          address: {
            city: location,
            state: stateName,
            commodities,
            paymentTerms,
            rating,
          },
          isActive: true,
        },
      });

      const newSup: SupplierItem = {
        id: created.id,
        code: created.supplierCode,
        name: created.name,
        location,
        state: stateName,
        commodities,
        paymentTerms,
        rating,
      };

      await logAudit('System', 'CREATE', 'Supplier', created.id, `Created supplier ${newSup.name} (${newSup.code})`);
      return reply.status(201).send({ supplier: newSup });
    } catch (err) {
      logger.error({ err }, '[Procurement] Database error creating supplier');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/procurement/suppliers/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<SupplierItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const location = data.location;
      const stateName = data.state;
      const commodities = data.commodities;
      const paymentTerms = data.paymentTerms;
      const rating = data.rating;

      const updated = await prisma.supplier.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(stateName ? { state: stateName } : {}),
          address: {
            city: location || 'Gujarat',
            state: stateName || 'Gujarat',
            commodities: commodities || 'Spices & Agro',
            paymentTerms: paymentTerms || '15 Days Net',
            rating: Number(rating) || 4.8,
          },
        },
      });

      const meta = (updated.address as Record<string, any>) || {};
      const mapped: SupplierItem = {
        id: updated.id,
        code: updated.supplierCode,
        name: updated.name,
        location: meta.city || updated.state || 'Gujarat',
        state: updated.state || 'Gujarat',
        commodities: meta.commodities || 'Spices & Agro',
        paymentTerms: meta.paymentTerms || `${updated.paymentTermsDays} Days Net`,
        rating: Number(meta.rating) || 4.8,
      };

      return reply.send({ supplier: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.delete('/procurement/suppliers/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.supplier.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'Supplier', id, `Deleted supplier ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // PURCHASE ORDERS (Dual endpoints: /procurement/purchase-orders AND /procurement/pos)
  const getPurchaseOrdersHandler = async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbPOs = await prisma.purchaseOrder.findMany({
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, bills: true },
      });

      const purchaseOrders: PurchaseOrderItem[] = dbPOs.map((p) => {
        const bill = p.bills && p.bills.length > 0 ? p.bills[0] : undefined;
        return {
          id: p.id,
          poNumber: p.poNumber,
          supplierName: p.supplier?.name || 'Verified Supplier LLP',
          salesOrderRef: 'SO-2026-001',
          status: p.status as PurchaseOrderItem['status'],
          totalCost: Number(p.totalCost),
          currency: p.currency,
          expectedDispatch: p.expectedDeliveryDate.toISOString().split('T')[0] ?? '',
          createdAt: p.createdAt.toISOString().split('T')[0] ?? '',
          billId: bill?.id,
          billNumber: bill?.supplierInvoiceRef,
          billStatus: bill?.status,
        };
      });

      return reply.send({ purchaseOrders, pos: purchaseOrders });
    } catch (err) {
      logger.error({ err }, '[Procurement] Failed to fetch purchase orders from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  };

  server.get('/procurement/purchase-orders', getPurchaseOrdersHandler);
  server.get('/procurement/pos', getPurchaseOrdersHandler);

  const createPurchaseOrderHandler = async (req: FastifyRequest<{ Body: Partial<PurchaseOrderItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    try {
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No system user found to create purchase order');

      const supName = (data.supplierName || 'Gujarat Agro & Spice Processors Ltd').trim();

      let sup = await prisma.supplier.findFirst({
        where: { name: { contains: supName, mode: 'insensitive' } },
      });
      if (!sup) {
        sup = await prisma.supplier.findFirst();
      }
      if (!sup) {
        sup = await prisma.supplier.create({
          data: {
            organizationId: orgId,
            supplierCode: `SUP-${Date.now().toString().slice(-4)}`,
            name: supName,
            country: 'India',
            address: { city: 'Gujarat' },
          },
        });
      }

      const poNum = data.poNumber || `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
      const cost = Number(data.totalCost || 40000);

      const created = await prisma.purchaseOrder.create({
        data: {
          organizationId: orgId,
          poNumber: poNum,
          supplierId: sup.id,
          createdById: user.id,
          status: data.status || 'ISSUED',
          currency: data.currency || 'USD',
          totalCost: cost,
          expectedDeliveryDate: data.expectedDispatch ? new Date(data.expectedDispatch) : new Date(Date.now() + 20 * 86400000),
        },
        include: { supplier: true },
      });

      const newPO: PurchaseOrderItem = {
        id: created.id,
        poNumber: created.poNumber,
        supplierName: created.supplier.name,
        salesOrderRef: data.salesOrderRef || 'SO-2026-001',
        status: created.status as PurchaseOrderItem['status'],
        totalCost: cost,
        currency: created.currency,
        expectedDispatch: created.expectedDeliveryDate.toISOString().split('T')[0] ?? '',
        createdAt: created.createdAt.toISOString().split('T')[0] ?? '',
      };

      await logAudit('System', 'CREATE', 'PurchaseOrder', created.id, `Created PO ${created.poNumber} to ${created.supplier.name}`);
      return reply.status(201).send({ purchaseOrder: newPO, po: newPO });
    } catch (err) {
      logger.error({ err }, '[Procurement] Database error creating purchase order');
      return reply.status(400).send({ error: (err as Error).message });
    }
  };

  server.post('/procurement/purchase-orders', createPurchaseOrderHandler);
  server.post('/procurement/pos', createPurchaseOrderHandler);

  const updatePurchaseOrderHandler = async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<PurchaseOrderItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.totalCost !== undefined ? { totalCost: Number(data.totalCost) } : {}),
          ...(data.expectedDispatch ? { expectedDeliveryDate: new Date(data.expectedDispatch) } : {}),
        },
        include: { supplier: true },
      });

      const mapped: PurchaseOrderItem = {
        id: updated.id,
        poNumber: updated.poNumber,
        supplierName: updated.supplier.name,
        salesOrderRef: data.salesOrderRef || 'SO-2026-001',
        status: updated.status as PurchaseOrderItem['status'],
        totalCost: Number(updated.totalCost),
        currency: updated.currency,
        expectedDispatch: updated.expectedDeliveryDate.toISOString().split('T')[0] ?? '',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
      };

      return reply.send({ purchaseOrder: mapped, po: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  };

  server.put('/procurement/purchase-orders/:id', updatePurchaseOrderHandler);
  server.put('/procurement/pos/:id', updatePurchaseOrderHandler);

  const updatePoStatusHandler = async (req: FastifyRequest<{ Params: { id: string }; Body: { status: PurchaseOrderItem['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};
    try {
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status },
        include: { supplier: true },
      });
      const mapped: PurchaseOrderItem = {
        id: updated.id,
        poNumber: updated.poNumber,
        supplierName: updated.supplier.name,
        salesOrderRef: 'SO-2026-001',
        status: updated.status as PurchaseOrderItem['status'],
        totalCost: Number(updated.totalCost),
        currency: updated.currency,
        expectedDispatch: updated.expectedDeliveryDate.toISOString().split('T')[0] ?? '',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
      };
      await logAudit('System', 'UPDATE_STATUS', 'PurchaseOrder', id, `Updated PO status to ${status}`);
      return reply.send({ purchaseOrder: mapped, po: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  };

  server.patch('/procurement/purchase-orders/:id/status', updatePoStatusHandler);
  server.patch('/procurement/pos/:id/status', updatePoStatusHandler);

  const issuePoHandler = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'ISSUED', issuedAt: new Date() },
        include: { supplier: true },
      });
      const mapped: PurchaseOrderItem = {
        id: updated.id,
        poNumber: updated.poNumber,
        supplierName: updated.supplier.name,
        salesOrderRef: 'SO-2026-001',
        status: 'ISSUED',
        totalCost: Number(updated.totalCost),
        currency: updated.currency,
        expectedDispatch: updated.expectedDeliveryDate.toISOString().split('T')[0] ?? '',
        createdAt: updated.createdAt.toISOString().split('T')[0] ?? '',
      };
      await logAudit('System', 'ISSUE', 'PurchaseOrder', id, `Issued PO ${updated.poNumber} to supplier`);
      return reply.send({ purchaseOrder: mapped, po: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  };

  server.patch('/procurement/purchase-orders/:id/issue', issuePoHandler);
  server.patch('/procurement/pos/:id/issue', issuePoHandler);

  const deletePurchaseOrderHandler = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
      await prisma.purchaseOrder.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'PurchaseOrder', id, `Deleted PO ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  };

  server.delete('/procurement/purchase-orders/:id', deletePurchaseOrderHandler);
  server.delete('/procurement/pos/:id', deletePurchaseOrderHandler);

  const generatePoBillHandler = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const orgId = await getOrganizationId();

    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { supplier: true, bills: true },
      });

      if (!po) {
        return reply.status(404).send({ error: 'Purchase Order not found' });
      }

      let bill = po.bills && po.bills.length > 0 ? po.bills[0] : null;

      if (!bill) {
        const billCount = await prisma.supplierBill.count();
        const billNumber = `BILL-2026-${String(billCount + 1).padStart(3, '0')}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        bill = await prisma.supplierBill.create({
          data: {
            organizationId: orgId,
            supplierId: po.supplierId,
            purchaseOrderId: po.id,
            supplierInvoiceRef: billNumber,
            status: 'PENDING',
            currency: po.currency || 'USD',
            totalAmount: po.totalCost,
            balanceDue: po.totalCost,
            dueDate,
          },
        });

        await logAudit('System', 'GENERATE_BILL', 'SupplierBill', bill.id, `Generated Supplier Bill ${billNumber} for PO ${po.poNumber}`);
      }

      return reply.send({
        success: true,
        bill: {
          id: bill.id,
          billNumber: bill.supplierInvoiceRef,
          status: bill.status,
          totalAmount: Number(bill.totalAmount),
          balanceDue: Number(bill.balanceDue),
          currency: bill.currency,
        },
      });
    } catch (err) {
      logger.error({ err }, '[Procurement] Failed to generate bill for PO');
      return reply.status(500).send({ error: (err as Error).message });
    }
  };

  server.post('/procurement/purchase-orders/:id/generate-bill', generatePoBillHandler);
  server.post('/procurement/pos/:id/generate-bill', generatePoBillHandler);

  // -------------------------------------------------------------
  // FULFILMENT & DIRECT SHIPMENTS (Pure Database)
  // -------------------------------------------------------------
  server.get('/fulfilment/shipments', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbShipments = await prisma.fulfilmentShipment.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          salesOrder: { include: { account: true } },
          purchaseOrder: { include: { supplier: true } },
        },
      });

      const shipments: ShipmentItem[] = dbShipments.map((s) => ({
        id: s.id,
        shipmentReference: s.shipmentReference,
        salesOrderRef: s.salesOrder.orderNumber,
        customerName: s.salesOrder.account.name,
        carrier: s.carrierName,
        trackingNumber: s.trackingNumber || '',
        status: s.status as ShipmentItem['status'],
        originPort: 'Mundra Port, Gujarat, India',
        destinationPort: (s.salesOrder.shippingAddress as Record<string, string>)?.port || 'Jebel Ali Port, Dubai, UAE',
        dispatchedDate: s.dispatchedAt.toISOString().split('T')[0] ?? '',
        estimatedArrival: s.expectedDeliveryAt.toISOString().split('T')[0] ?? '',
        isSupplierDirect: s.isSupplierDirect,
      }));

      return reply.send({ shipments });
    } catch (err) {
      logger.error({ err }, '[Fulfilment] Failed to fetch shipments from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/fulfilment/shipments', async (req: FastifyRequest<{ Body: Partial<ShipmentItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    try {
      const so = await prisma.salesOrder.findFirst({
        where: data.salesOrderRef ? { orderNumber: data.salesOrderRef } : undefined,
      }) || await prisma.salesOrder.findFirst();

      const po = await prisma.purchaseOrder.findFirst();

      if (!so || !po) {
        throw new Error('A valid sales order and purchase order are required to dispatch shipment');
      }

      const ref = data.shipmentReference || `SHP-2026-${Math.floor(100 + Math.random() * 900)}`;

      const created = await prisma.fulfilmentShipment.create({
        data: {
          organizationId: orgId,
          shipmentReference: ref,
          salesOrderId: so.id,
          purchaseOrderId: po.id,
          carrierName: data.carrier || 'Maersk Line',
          trackingNumber: data.trackingNumber || 'MSKU-8874129',
          status: data.status || 'DISPATCHED',
          isSupplierDirect: data.isSupplierDirect ?? true,
          dispatchedAt: data.dispatchedDate ? new Date(data.dispatchedDate) : new Date(),
          expectedDeliveryAt: data.estimatedArrival ? new Date(data.estimatedArrival) : new Date(Date.now() + 18 * 86400000),
        },
        include: {
          salesOrder: { include: { account: true } },
          purchaseOrder: { include: { supplier: true } },
        },
      });

      const newShipment: ShipmentItem = {
        id: created.id,
        shipmentReference: created.shipmentReference,
        salesOrderRef: created.salesOrder.orderNumber,
        customerName: created.salesOrder.account.name,
        carrier: created.carrierName,
        trackingNumber: created.trackingNumber || '',
        status: created.status as ShipmentItem['status'],
        originPort: data.originPort || 'Mundra Port, Gujarat, India',
        destinationPort: data.destinationPort || 'Jebel Ali Port, Dubai, UAE',
        dispatchedDate: created.dispatchedAt.toISOString().split('T')[0] ?? '',
        estimatedArrival: created.expectedDeliveryAt.toISOString().split('T')[0] ?? '',
        isSupplierDirect: created.isSupplierDirect,
      };

      await logAudit('System', 'CREATE', 'Shipment', created.id, `Created shipment ${created.shipmentReference} (${created.carrierName})`);
      return reply.status(201).send({ shipment: newShipment });
    } catch (err) {
      logger.error({ err }, '[Fulfilment] Database error creating shipment');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/fulfilment/shipments/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<ShipmentItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const updated = await prisma.fulfilmentShipment.update({
        where: { id },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.carrier ? { carrierName: data.carrier } : {}),
          ...(data.trackingNumber ? { trackingNumber: data.trackingNumber } : {}),
        },
        include: {
          salesOrder: { include: { account: true } },
          purchaseOrder: { include: { supplier: true } },
        },
      });

      const mapped: ShipmentItem = {
        id: updated.id,
        shipmentReference: updated.shipmentReference,
        salesOrderRef: updated.salesOrder.orderNumber,
        customerName: updated.salesOrder.account.name,
        carrier: updated.carrierName,
        trackingNumber: updated.trackingNumber || '',
        status: updated.status as ShipmentItem['status'],
        originPort: data.originPort || 'Mundra Port, Gujarat, India',
        destinationPort: data.destinationPort || 'Jebel Ali Port, Dubai, UAE',
        dispatchedDate: updated.dispatchedAt.toISOString().split('T')[0] ?? '',
        estimatedArrival: updated.expectedDeliveryAt.toISOString().split('T')[0] ?? '',
        isSupplierDirect: updated.isSupplierDirect,
      };

      return reply.send({ shipment: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.patch('/fulfilment/shipments/:id/deliver', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      const updated = await prisma.fulfilmentShipment.update({
        where: { id },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
        include: {
          salesOrder: { include: { account: true } },
          purchaseOrder: { include: { supplier: true } },
        },
      });
      const mapped: ShipmentItem = {
        id: updated.id,
        shipmentReference: updated.shipmentReference,
        salesOrderRef: updated.salesOrder.orderNumber,
        customerName: updated.salesOrder.account.name,
        carrier: updated.carrierName,
        trackingNumber: updated.trackingNumber || '',
        status: 'DELIVERED',
        originPort: 'Mundra Port, Gujarat, India',
        destinationPort: 'Jebel Ali Port, Dubai, UAE',
        dispatchedDate: updated.dispatchedAt.toISOString().split('T')[0] ?? '',
        estimatedArrival: updated.expectedDeliveryAt.toISOString().split('T')[0] ?? '',
        isSupplierDirect: updated.isSupplierDirect,
      };
      await logAudit('System', 'DELIVER', 'Shipment', id, `Confirmed delivery of shipment ${updated.shipmentReference}`);
      return reply.send({ shipment: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.patch('/fulfilment/shipments/:id/status', async (req: FastifyRequest<{ Params: { id: string }; Body: { status: ShipmentItem['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};
    try {
      const updated = await prisma.fulfilmentShipment.update({
        where: { id },
        data: { status },
        include: {
          salesOrder: { include: { account: true } },
          purchaseOrder: { include: { supplier: true } },
        },
      });
      const mapped: ShipmentItem = {
        id: updated.id,
        shipmentReference: updated.shipmentReference,
        salesOrderRef: updated.salesOrder.orderNumber,
        customerName: updated.salesOrder.account.name,
        carrier: updated.carrierName,
        trackingNumber: updated.trackingNumber || '',
        status: updated.status as ShipmentItem['status'],
        originPort: 'Mundra Port, Gujarat, India',
        destinationPort: 'Jebel Ali Port, Dubai, UAE',
        dispatchedDate: updated.dispatchedAt.toISOString().split('T')[0] ?? '',
        estimatedArrival: updated.expectedDeliveryAt.toISOString().split('T')[0] ?? '',
        isSupplierDirect: updated.isSupplierDirect,
      };
      await logAudit('System', 'UPDATE_STATUS', 'Shipment', id, `Updated shipment status to ${status}`);
      return reply.send({ shipment: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.delete('/fulfilment/shipments/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.shipmentLine.deleteMany({ where: { shipmentId: id } });
      await prisma.fulfilmentShipment.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'Shipment', id, `Deleted shipment record ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // -------------------------------------------------------------
  // FINANCE & INVOICES (Pure Database)
  // -------------------------------------------------------------
  server.get('/finance/invoices', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbInvoices = await prisma.customerInvoice.findMany({
        orderBy: { createdAt: 'desc' },
        include: { account: true, salesOrder: true },
      });

      const invoices: InvoiceItem[] = dbInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.account.name,
        orderNumber: inv.salesOrder.orderNumber,
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.totalAmount) - Number(inv.balanceDue),
        balanceDue: Number(inv.balanceDue),
        currency: inv.currency,
        status: inv.status as InvoiceItem['status'],
        issueDate: inv.issuedAt.toISOString().split('T')[0] ?? '',
        dueDate: inv.dueDate.toISOString().split('T')[0] ?? '',
      }));

      return reply.send({ invoices });
    } catch (err) {
      logger.error({ err }, '[Finance] Failed to fetch invoices from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/finance/invoices', async (req: FastifyRequest<{ Body: Partial<InvoiceItem> }>, reply: FastifyReply) => {
    const data = req.body || {};
    const orgId = await getOrganizationId();

    try {
      let so = null;
      if (data.orderNumber) {
        so = await prisma.salesOrder.findFirst({
          where: { orderNumber: data.orderNumber },
          include: { account: true },
        });
      }
      if (!so && data.customerName) {
        so = await prisma.salesOrder.findFirst({
          where: { account: { name: { contains: data.customerName, mode: 'insensitive' } } },
          include: { account: true },
        });
      }
      if (!so) {
        so = await prisma.salesOrder.findFirst({
          orderBy: { createdAt: 'desc' },
          include: { account: true },
        });
      }
      if (!so) {
        throw new Error('A sales order must exist before generating an invoice');
      }

      const acc = so.account || (await prisma.account.findFirst());
      if (!acc) {
        throw new Error('A buyer account must exist before generating an invoice');
      }

      const invNum = data.invoiceNumber || `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
      const totalAmount = Number(data.totalAmount !== undefined ? data.totalAmount : so.totalAmount);
      const paidAmount = Number(data.paidAmount || 0);
      const balanceDue = Math.max(0, totalAmount - paidAmount);

      const created = await prisma.customerInvoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: invNum,
          accountId: acc.id,
          salesOrderId: so.id,
          status: data.status || (paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'ISSUED'),
          currency: data.currency || so.currency || 'USD',
          subtotalAmount: totalAmount,
          totalAmount,
          balanceDue,
          dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 86400000),
          issuedAt: data.issueDate ? new Date(data.issueDate) : new Date(),
        },
        include: { account: true, salesOrder: true },
      });

      const newInv: InvoiceItem = {
        id: created.id,
        invoiceNumber: created.invoiceNumber,
        customerName: created.account.name,
        orderNumber: created.salesOrder.orderNumber,
        totalAmount: Number(created.totalAmount),
        paidAmount,
        balanceDue: Number(created.balanceDue),
        currency: created.currency,
        status: created.status as InvoiceItem['status'],
        issueDate: created.issuedAt.toISOString().split('T')[0] ?? '',
        dueDate: created.dueDate.toISOString().split('T')[0] ?? '',
      };

      await logAudit('System', 'CREATE', 'Invoice', created.id, `Generated invoice ${created.invoiceNumber} for ${created.account.name}`);
      return reply.status(201).send({ invoice: newInv });
    } catch (err) {
      logger.error({ err }, '[Finance] Database error creating invoice');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/finance/invoices/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<InvoiceItem> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const current = await prisma.customerInvoice.findUnique({ where: { id } });
      if (!current) return reply.status(404).send({ error: 'Invoice not found' });

      let soId = current.salesOrderId;
      let accId = current.accountId;
      if (data.orderNumber) {
        const foundSo = await prisma.salesOrder.findFirst({
          where: { orderNumber: data.orderNumber },
          include: { account: true },
        });
        if (foundSo) {
          soId = foundSo.id;
          accId = foundSo.accountId;
        }
      }

      const newTotal = data.totalAmount !== undefined ? Number(data.totalAmount) : Number(current.totalAmount);
      const currentPaid = Number(current.totalAmount) - Number(current.balanceDue);
      const newPaid = data.paidAmount !== undefined ? Number(data.paidAmount) : currentPaid;
      const newBalance = Math.max(0, newTotal - newPaid);

      let calculatedStatus = data.status || current.status;
      if (!data.status) {
        if (newBalance === 0 && newTotal > 0) calculatedStatus = 'PAID';
        else if (newPaid > 0 && newBalance > 0) calculatedStatus = 'PARTIALLY_PAID';
      }

      const updated = await prisma.customerInvoice.update({
        where: { id },
        data: {
          salesOrderId: soId,
          accountId: accId,
          status: calculatedStatus,
          totalAmount: newTotal,
          subtotalAmount: newTotal,
          balanceDue: newBalance,
          ...(data.invoiceNumber ? { invoiceNumber: data.invoiceNumber } : {}),
          ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        },
        include: { account: true, salesOrder: true },
      });

      const mapped: InvoiceItem = {
        id: updated.id,
        invoiceNumber: updated.invoiceNumber,
        customerName: updated.account.name,
        orderNumber: updated.salesOrder.orderNumber,
        totalAmount: Number(updated.totalAmount),
        paidAmount: Number(updated.totalAmount) - Number(updated.balanceDue),
        balanceDue: Number(updated.balanceDue),
        currency: updated.currency,
        status: updated.status as InvoiceItem['status'],
        issueDate: updated.issuedAt.toISOString().split('T')[0] ?? '',
        dueDate: updated.dueDate.toISOString().split('T')[0] ?? '',
      };

      return reply.send({ invoice: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.patch('/finance/invoices/:id/status', async (req: FastifyRequest<{ Params: { id: string }; Body: { status: InvoiceItem['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};
    try {
      const updated = await prisma.customerInvoice.update({
        where: { id },
        data: { status },
        include: { account: true, salesOrder: true },
      });
      const mapped: InvoiceItem = {
        id: updated.id,
        invoiceNumber: updated.invoiceNumber,
        customerName: updated.account.name,
        orderNumber: updated.salesOrder.orderNumber,
        totalAmount: Number(updated.totalAmount),
        paidAmount: Number(updated.totalAmount) - Number(updated.balanceDue),
        balanceDue: Number(updated.balanceDue),
        currency: updated.currency,
        status: updated.status as InvoiceItem['status'],
        issueDate: updated.issuedAt.toISOString().split('T')[0] ?? '',
        dueDate: updated.dueDate.toISOString().split('T')[0] ?? '',
      };
      await logAudit('System', 'UPDATE_STATUS', 'Invoice', id, `Updated invoice status to ${status}`);
      return reply.send({ invoice: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.post('/finance/payments', async (req: FastifyRequest<{ Body: { invoiceId: string; amount: number; bankReference?: string } }>, reply: FastifyReply) => {
    const { invoiceId, amount, bankReference } = req.body || {};
    const payAmount = Number(amount) || 0;

    try {
      const dbInv = await prisma.customerInvoice.findUnique({
        where: { id: invoiceId },
        include: { account: true, salesOrder: true },
      });

      if (!dbInv) {
        return reply.status(404).send({ error: 'Invoice not found in database' });
      }

      const firstUser = await prisma.user.findFirst();
      const newBalance = Math.max(0, Number(dbInv.balanceDue) - payAmount);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

      // Record receipt in database
      await prisma.paymentReceipt.create({
        data: {
          organizationId: dbInv.organizationId,
          receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
          accountId: dbInv.accountId,
          amount: payAmount,
          unallocatedAmount: 0,
          currency: dbInv.currency,
          paymentMethod: 'WIRE_TRANSFER',
          bankReference: bankReference || `SWIFT-${Date.now()}`,
          paymentDate: new Date(),
          createdById: firstUser?.id || dbInv.salesOrder.createdById,
        },
      });

      const updated = await prisma.customerInvoice.update({
        where: { id: invoiceId },
        data: { balanceDue: newBalance, status: newStatus },
        include: { account: true, salesOrder: true },
      });

      const mapped: InvoiceItem = {
        id: updated.id,
        invoiceNumber: updated.invoiceNumber,
        customerName: updated.account.name,
        orderNumber: updated.salesOrder.orderNumber,
        totalAmount: Number(updated.totalAmount),
        paidAmount: Number(updated.totalAmount) - Number(updated.balanceDue),
        balanceDue: Number(updated.balanceDue),
        currency: updated.currency,
        status: updated.status as InvoiceItem['status'],
        issueDate: updated.issuedAt.toISOString().split('T')[0] ?? '',
        dueDate: updated.dueDate.toISOString().split('T')[0] ?? '',
      };

      await logAudit(
        'System',
        'RECORD_PAYMENT',
        'Invoice',
        invoiceId,
        `Recorded payment of $${payAmount.toLocaleString()} against invoice ${updated.invoiceNumber}`
      );

      return reply.send({ invoice: mapped });
    } catch (err) {
      logger.error({ err }, '[Finance] Failed to record payment in DB');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.delete('/finance/invoices/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    try {
      await prisma.paymentAllocation.deleteMany({ where: { customerInvoiceId: id } });
      await prisma.customerInvoice.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'Invoice', id, `Deleted invoice ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // SUPPLIER BILLS (Accounts Payable)
  server.get('/finance/supplier-bills', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbBills = await prisma.supplierBill.findMany({
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, purchaseOrder: true },
      });

      const bills = dbBills.map((b) => ({
        id: b.id,
        billNumber: b.supplierInvoiceRef,
        supplierName: b.supplier?.name || 'Verified Supplier LLP',
        poNumber: b.purchaseOrder?.poNumber || 'PO-2026',
        totalAmount: Number(b.totalAmount),
        paidAmount: Number(b.totalAmount) - Number(b.balanceDue),
        balanceDue: Number(b.balanceDue),
        currency: b.currency,
        status: b.status,
        dueDate: b.dueDate.toISOString().split('T')[0] ?? '',
        createdAt: b.createdAt.toISOString().split('T')[0] ?? '',
      }));

      return reply.send({ bills });
    } catch (err) {
      logger.error({ err }, '[Finance] Failed to fetch supplier bills');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.patch('/finance/supplier-bills/:id/pay', async (req: FastifyRequest<{ Params: { id: string }; Body: { amount?: number; bankReference?: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const body = req.body || {};
    try {
      const bill = await prisma.supplierBill.findUnique({ where: { id } });
      if (!bill) return reply.status(404).send({ error: 'Bill not found' });

      const payAmt = Number(body.amount) || Number(bill.balanceDue);
      const newBal = Math.max(0, Number(bill.balanceDue) - payAmt);
      const newStatus = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';

      const updated = await prisma.supplierBill.update({
        where: { id },
        data: {
          balanceDue: newBal,
          status: newStatus,
        },
      });

      await logAudit('Finance Officer', 'DISBURSEMENT', 'SupplierBill', id, `Recorded outward wire of $${payAmt} for ${bill.supplierInvoiceRef}`);
      return reply.send({ success: true, bill: updated });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // -------------------------------------------------------------
  // INTERNAL USERS MANAGEMENT (Pure Database)
  // -------------------------------------------------------------
  server.get('/users', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbUsers = await prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
      });

      const users: UserProfile[] = dbUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phoneNumber || '',
        department: u.department?.name || 'Executive Management',
        subdepartment: u.subdepartment?.name || 'Managing Desk',
        designation: u.designation?.title || 'Staff',
        role: u.userRoles[0]?.role.name || 'TRADER',
        dataScope: 'GLOBAL',
        approvalLimit: Number(u.designation?.defaultApprovalLimit || 0),
        reportingTo: 'Rahul Patel',
        status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        isMfaEnabled: u.isMfaEnabled,
        createdAt: u.createdAt.toISOString(),
      }));

      return reply.send({ users });
    } catch (err) {
      logger.error({ err }, '[Users] Failed to fetch users from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  server.post('/users', async (req: FastifyRequest<{ Body: Partial<UserProfile> }>, reply: FastifyReply) => {
    const data = req.body || {};
    if (!data.name && (!data.firstName && !data.lastName)) {
      return reply.status(400).send({ error: 'User name is required' });
    }
    if (!data.email) {
      return reply.status(400).send({ error: 'User email is required' });
    }

    const orgId = await getOrganizationId();
    const fullName = (data.name || `${data.firstName || ''} ${data.lastName || ''}`).trim();
    const nameParts = fullName.split(' ');
    const firstName = data.firstName || nameParts[0] || 'Staff';
    const lastName = data.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Member');

    try {
      let dept = await prisma.department.findFirst({
        where: data.department ? { name: { contains: data.department, mode: 'insensitive' } } : undefined,
      });
      if (!dept) dept = await prisma.department.findFirst();

      let des = await prisma.designation.findFirst({
        where: data.designation ? { title: { contains: data.designation, mode: 'insensitive' } } : undefined,
      });
      if (!des) des = await prisma.designation.findFirst();

      if (!dept || !des) {
        throw new Error('Valid department and designation are required');
      }

      const demoHash = '$argon2id$v=19$m=65536,t=3,p=1$fakehasheddemokey$validmockhashforlocaldev';

      const created = await prisma.user.create({
        data: {
          organizationId: orgId,
          email: data.email.toLowerCase().trim(),
          passwordHash: demoHash,
          firstName,
          lastName,
          phoneNumber: data.phone || '+91 98000 00000',
          departmentId: dept.id,
          designationId: des.id,
          isActive: data.status !== 'INACTIVE',
          isMfaEnabled: data.isMfaEnabled !== false,
        },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
      });

      // Link requested role if found
      const requestedRole = data.role || 'TRADER';
      const roleRecord = await prisma.role.findFirst({
        where: { name: { equals: requestedRole, mode: 'insensitive' } },
      });
      if (roleRecord) {
        await prisma.userRole.create({
          data: {
            userId: created.id,
            roleId: roleRecord.id,
          },
        });
      }

      const newUser: UserProfile = {
        id: created.id,
        name: `${created.firstName} ${created.lastName}`.trim(),
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        phone: created.phoneNumber || '',
        department: created.department?.name || 'Executive Management',
        subdepartment: created.subdepartment?.name || 'Managing Desk',
        designation: created.designation?.title || 'Staff',
        role: requestedRole,
        dataScope: data.dataScope || 'DEPARTMENT',
        approvalLimit: Number(data.approvalLimit || 0),
        reportingTo: data.reportingTo || 'Rahul Patel',
        status: created.isActive ? 'ACTIVE' : 'INACTIVE',
        isMfaEnabled: created.isMfaEnabled,
        createdAt: created.createdAt.toISOString(),
      };

      await logAudit('System', 'CREATE', 'User', created.id, `Created user ${newUser.name} (${newUser.email})`);
      return reply.status(201).send({ user: newUser });
    } catch (err) {
      logger.error({ err }, '[Users] Error creating user in database');
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  server.put('/users/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<UserProfile> }>, reply: FastifyReply) => {
    const { id } = req.params;
    const data = req.body || {};

    let firstName: string | undefined;
    let lastName: string | undefined;
    if (data.name) {
      const parts = data.name.trim().split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || '';
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(firstName ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
          ...(data.phone !== undefined ? { phoneNumber: data.phone } : {}),
          ...(data.status ? { isActive: data.status === 'ACTIVE' } : {}),
        },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
      });

      const mapped: UserProfile = {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`.trim(),
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phoneNumber || '',
        department: updated.department?.name || 'Executive Management',
        subdepartment: updated.subdepartment?.name || 'Managing Desk',
        designation: updated.designation?.title || 'Staff',
        role: updated.userRoles[0]?.role.name || 'TRADER',
        dataScope: 'GLOBAL',
        approvalLimit: Number(updated.designation?.defaultApprovalLimit || 0),
        reportingTo: 'Rahul Patel',
        status: updated.isActive ? 'ACTIVE' : 'INACTIVE',
        isMfaEnabled: updated.isMfaEnabled,
        createdAt: updated.createdAt.toISOString(),
      };

      return reply.send({ user: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.patch('/users/:id/status', async (req: FastifyRequest<{ Params: { id: string }; Body: { status: UserProfile['status'] } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (id === currentSessionUserId && status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Cannot deactivate the currently active session user.' });
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: status === 'ACTIVE' },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
      });

      const mapped: UserProfile = {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`.trim(),
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phoneNumber || '',
        department: updated.department?.name || 'Executive Management',
        subdepartment: updated.subdepartment?.name || 'Managing Desk',
        designation: updated.designation?.title || 'Staff',
        role: updated.userRoles[0]?.role.name || 'TRADER',
        dataScope: 'GLOBAL',
        approvalLimit: Number(updated.designation?.defaultApprovalLimit || 0),
        reportingTo: 'Rahul Patel',
        status: updated.isActive ? 'ACTIVE' : 'INACTIVE',
        isMfaEnabled: updated.isMfaEnabled,
        createdAt: updated.createdAt.toISOString(),
      };

      return reply.send({ user: mapped });
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  server.delete('/users/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (id === currentSessionUserId) {
      return reply.status(400).send({ error: 'Cannot delete the currently authenticated active session user.' });
    }

    try {
      const userCount = await prisma.user.count();
      if (userCount <= 1) {
        return reply.status(400).send({ error: 'Cannot delete the last remaining internal system user.' });
      }

      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });
      await logAudit('System', 'DELETE', 'User', id, `Removed user account ${id}`);
      return reply.send({ success: true, id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // -------------------------------------------------------------
  // AUDIT & GOVERNANCE (Pure Database)
  // -------------------------------------------------------------
  server.get('/audit/logs', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbLogs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: { actor: true },
      });

      const logs = dbLogs.map((l) => ({
        id: l.id,
        timestamp: l.timestamp.toISOString(),
        actor: l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : (l.changesDiff as Record<string, string>)?.actor || 'Rahul Patel (Managing Partner)',
        action: l.action,
        entity: l.targetEntityType,
        entityId: l.targetEntityId,
        details: (l.changesDiff as Record<string, string>)?.details || `${l.action} ${l.targetEntityType}`,
      }));

      return reply.send({ logs });
    } catch (err) {
      logger.error({ err }, '[Audit] Failed to load audit logs from DB');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
