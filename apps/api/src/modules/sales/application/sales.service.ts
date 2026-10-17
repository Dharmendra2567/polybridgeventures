import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { QuoteItem, SalesOrderItem } from '../../trade-data.js';
import type { PrismaClient } from '../../../generated/client/index.js';

/** Application layer for the sales bounded context. */
export class SalesService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
// -------------------------------------------------------------
    // SALES, QUOTES & ORDERS (Pure Database)
    // -------------------------------------------------------------
    server.get('/sales/quotes', async (_req: FastifyRequest, reply: FastifyReply) => {
      try {
        const dbQuotes = await prisma.quote.findMany({
          orderBy: { createdAt: 'desc' },
          include: { account: true, lines: { include: { product: true, uom: true } } },
        });
    
        const quotes: QuoteItem[] = dbQuotes.map((q) => {
          const rate = Number(q.exchangeRateToUsd || 1.0);
          const totalAmt = Number(q.totalAmount);
          const totalAmtUsd = Number(q.totalAmountUsd || (rate > 0 ? totalAmt / rate : totalAmt));
          return {
            id: q.id,
            quoteNumber: q.quoteNumber,
            version: q.version,
            customerName: q.account?.name || 'Verified Buyer LLC',
            country: q.account?.country || 'United Arab Emirates',
            status: (q.status as QuoteItem['status']) || 'DRAFT',
            totalAmount: totalAmt,
            totalCost: Number(q.totalCost || q.subtotalAmount),
            currency: q.currency,
            exchangeRateToUsd: rate,
            totalAmountUsd: Number(totalAmtUsd.toFixed(2)),
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
          };
        });
    
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

        const selectedCurrency = (data.currency || 'USD').trim().toUpperCase();
        let rateToUsd = Number(data.exchangeRateToUsd);
        if (!rateToUsd || rateToUsd <= 0) {
          const mCountry = await prisma.marketCountry.findFirst({
            where: { organizationId: orgId, currencyCode: selectedCurrency },
          });
          rateToUsd = mCountry ? Number(mCountry.exchangeRateToUsd) : 1.0;
        }
        const totalUsd = rateToUsd > 0 ? Number((computedTotalAmount / rateToUsd).toFixed(4)) : computedTotalAmount;
    
        const created = await prisma.quote.create({
          data: {
            organizationId: orgId,
            quoteNumber: qNumber,
            version: 1,
            accountId: acc.id,
            createdById: user.id,
            status: data.status || 'DRAFT',
            currency: selectedCurrency,
            exchangeRateToUsd: rateToUsd,
            totalAmountUsd: totalUsd,
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
          const rate = Number(o.exchangeRateToUsd || 1.0);
          const totalAmt = Number(o.totalAmount);
          const totalAmtUsd = Number(o.totalAmountUsd || (rate > 0 ? totalAmt / rate : totalAmt));
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.account?.name || 'Unknown Account',
            customerPo: o.customerPoReference || 'PO-CLIENT',
            quoteRef: o.originatingQuote?.quoteNumber || 'Q-DIRECT',
            status: o.status as SalesOrderItem['status'],
            totalAmount: totalAmt,
            currency: o.currency,
            exchangeRateToUsd: rate,
            totalAmountUsd: Number(totalAmtUsd.toFixed(2)),
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
        const selectedCurrency = (data.currency || 'USD').trim().toUpperCase();

        let rateToUsd = Number(data.exchangeRateToUsd);
        if (!rateToUsd || rateToUsd <= 0) {
          const mCountry = await prisma.marketCountry.findFirst({
            where: { organizationId: orgId, currencyCode: selectedCurrency },
          });
          rateToUsd = mCountry ? Number(mCountry.exchangeRateToUsd) : 1.0;
        }
        const totalUsd = rateToUsd > 0 ? Number((totalAmount / rateToUsd).toFixed(4)) : totalAmount;
    
        const created = await prisma.salesOrder.create({
          data: {
            organizationId: orgId,
            orderNumber: oNum,
            accountId: acc.id,
            createdById: user.id,
            customerPoReference: data.customerPo || 'PO-CLIENT-991',
            status: data.status || 'CONFIRMED',
            currency: selectedCurrency,
            exchangeRateToUsd: rateToUsd,
            totalAmountUsd: totalUsd,
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
          exchangeRateToUsd: rateToUsd,
          totalAmountUsd: Number(totalUsd.toFixed(2)),
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
    
  }
}
