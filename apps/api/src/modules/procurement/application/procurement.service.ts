import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { SupplierItem, PurchaseOrderItem } from '../../trade-data.js';
import type { PrismaClient } from '../../../generated/client/index.js';

/** Application layer for the procurement bounded context. */
export class ProcurementService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
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
          const rate = Number(p.exchangeRateToUsd || 1.0);
          const costVal = Number(p.totalCost);
          const costUsd = Number(p.totalCostUsd || (rate > 0 ? costVal / rate : costVal));
          return {
            id: p.id,
            poNumber: p.poNumber,
            supplierName: p.supplier?.name || 'Verified Supplier LLP',
            salesOrderRef: 'SO-2026-001',
            status: p.status as PurchaseOrderItem['status'],
            totalCost: costVal,
            currency: p.currency,
            exchangeRateToUsd: rate,
            totalCostUsd: Number(costUsd.toFixed(2)),
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
        const selectedCurrency = (data.currency || 'USD').trim().toUpperCase();

        let rateToUsd = Number(data.exchangeRateToUsd);
        if (!rateToUsd || rateToUsd <= 0) {
          const mCountry = await prisma.marketCountry.findFirst({
            where: { organizationId: orgId, currencyCode: selectedCurrency },
          });
          rateToUsd = mCountry ? Number(mCountry.exchangeRateToUsd) : 1.0;
        }
        const costUsd = rateToUsd > 0 ? Number((cost / rateToUsd).toFixed(4)) : cost;
    
        const created = await prisma.purchaseOrder.create({
          data: {
            organizationId: orgId,
            poNumber: poNum,
            supplierId: sup.id,
            createdById: user.id,
            status: data.status || 'ISSUED',
            currency: selectedCurrency,
            exchangeRateToUsd: rateToUsd,
            totalCostUsd: costUsd,
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
          exchangeRateToUsd: rateToUsd,
          totalCostUsd: Number(costUsd.toFixed(2)),
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
    
  }
}
