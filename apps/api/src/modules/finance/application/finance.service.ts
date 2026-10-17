import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { InvoiceItem } from '../../trade-data.js';
import type { PrismaClient } from '../../../generated/client/index.js';

/** Application layer for the finance bounded context. */
export class FinanceService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
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
    
  }
}
