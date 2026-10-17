import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { LeadItem, AccountItem, SupplierItem } from '../../trade-data.js';
import type { PrismaClient } from '../../../generated/client/index.js';

/** Application layer for the crm bounded context. */
export class CrmService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
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
    
  }
}
