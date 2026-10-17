import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../../infrastructure/logging/logger.js";
import { getOrganizationId } from "../../../shared/organization.context.js";
import { logAudit } from "../../../shared/audit.service.js";
import { ShipmentItem } from "../../trade-data.js";
import type { PrismaClient } from "../../../generated/client/index.js";

/** Application layer for the fulfilment bounded context. */
export class FulfilmentService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
    // -------------------------------------------------------------
    // FULFILMENT & DIRECT SHIPMENTS (Pure Database)
    // -------------------------------------------------------------
    server.get(
      "/fulfilment/shipments",
      async (_req: FastifyRequest, reply: FastifyReply) => {
        try {
          const dbShipments = await prisma.fulfilmentShipment.findMany({
            orderBy: { createdAt: "desc" },
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
            trackingNumber: s.trackingNumber || "",
            status: s.status as ShipmentItem["status"],
            originPort: "Mundra Port, Gujarat, India",
            destinationPort:
              (s.salesOrder.shippingAddress as Record<string, string>)?.port ||
              "Jebel Ali Port, Dubai, UAE",
            dispatchedDate: s.dispatchedAt.toISOString().split("T")[0] ?? "",
            estimatedArrival:
              s.expectedDeliveryAt.toISOString().split("T")[0] ?? "",
            isSupplierDirect: s.isSupplierDirect,
          }));

          return reply.send({ shipments });
        } catch (err) {
          logger.error(
            { err },
            "[Fulfilment] Failed to fetch shipments from DB",
          );
          return reply.status(500).send({ error: (err as Error).message });
        }
      },
    );

    server.post(
      "/fulfilment/shipments",
      async (
        req: FastifyRequest<{ Body: Partial<ShipmentItem> }>,
        reply: FastifyReply,
      ) => {
        const data = req.body || {};
        const orgId = await getOrganizationId();

        try {
          const so =
            (await prisma.salesOrder.findFirst({
              where: data.salesOrderRef
                ? { orderNumber: data.salesOrderRef }
                : undefined,
            })) || (await prisma.salesOrder.findFirst());

          const po = await prisma.purchaseOrder.findFirst();

          if (!so || !po) {
            throw new Error(
              "A valid sales order and purchase order are required to dispatch shipment",
            );
          }

          const ref =
            data.shipmentReference ||
            `SHP-2026-${Math.floor(100 + Math.random() * 900)}`;

          const created = await prisma.fulfilmentShipment.create({
            data: {
              organizationId: orgId,
              shipmentReference: ref,
              salesOrderId: so.id,
              purchaseOrderId: po.id,
              carrierName: data.carrier || "Maersk Line",
              trackingNumber: data.trackingNumber || "MSKU-8874129",
              status: data.status || "DISPATCHED",
              isSupplierDirect: data.isSupplierDirect ?? true,
              dispatchedAt: data.dispatchedDate
                ? new Date(data.dispatchedDate)
                : new Date(),
              expectedDeliveryAt: data.estimatedArrival
                ? new Date(data.estimatedArrival)
                : new Date(Date.now() + 18 * 86400000),
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
            trackingNumber: created.trackingNumber || "",
            status: created.status as ShipmentItem["status"],
            originPort: data.originPort || "Mundra Port, Gujarat, India",
            destinationPort:
              data.destinationPort || "Jebel Ali Port, Dubai, UAE",
            dispatchedDate:
              created.dispatchedAt.toISOString().split("T")[0] ?? "",
            estimatedArrival:
              created.expectedDeliveryAt.toISOString().split("T")[0] ?? "",
            isSupplierDirect: created.isSupplierDirect,
          };

          await logAudit(
            "System",
            "CREATE",
            "Shipment",
            created.id,
            `Created shipment ${created.shipmentReference} (${created.carrierName})`,
          );
          return reply.status(201).send({ shipment: newShipment });
        } catch (err) {
          logger.error(
            { err },
            "[Fulfilment] Database error creating shipment",
          );
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    server.put(
      "/fulfilment/shipments/:id",
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: Partial<ShipmentItem>;
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const data = req.body || {};
        try {
          const updated = await prisma.fulfilmentShipment.update({
            where: { id },
            data: {
              ...(data.status ? { status: data.status } : {}),
              ...(data.carrier ? { carrierName: data.carrier } : {}),
              ...(data.trackingNumber
                ? { trackingNumber: data.trackingNumber }
                : {}),
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
            trackingNumber: updated.trackingNumber || "",
            status: updated.status as ShipmentItem["status"],
            originPort: data.originPort || "Mundra Port, Gujarat, India",
            destinationPort:
              data.destinationPort || "Jebel Ali Port, Dubai, UAE",
            dispatchedDate:
              updated.dispatchedAt.toISOString().split("T")[0] ?? "",
            estimatedArrival:
              updated.expectedDeliveryAt.toISOString().split("T")[0] ?? "",
            isSupplierDirect: updated.isSupplierDirect,
          };

          return reply.send({ shipment: mapped });
        } catch (err) {
          return reply.status(404).send({ error: (err as Error).message });
        }
      },
    );

    server.patch(
      "/fulfilment/shipments/:id/deliver",
      async (
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        try {
          const updated = await prisma.fulfilmentShipment.update({
            where: { id },
            data: { status: "DELIVERED", deliveredAt: new Date() },
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
            trackingNumber: updated.trackingNumber || "",
            status: "DELIVERED",
            originPort: "Mundra Port, Gujarat, India",
            destinationPort: "Jebel Ali Port, Dubai, UAE",
            dispatchedDate:
              updated.dispatchedAt.toISOString().split("T")[0] ?? "",
            estimatedArrival:
              updated.expectedDeliveryAt.toISOString().split("T")[0] ?? "",
            isSupplierDirect: updated.isSupplierDirect,
          };
          await logAudit(
            "System",
            "DELIVER",
            "Shipment",
            id,
            `Confirmed delivery of shipment ${updated.shipmentReference}`,
          );
          return reply.send({ shipment: mapped });
        } catch (err) {
          return reply.status(404).send({ error: (err as Error).message });
        }
      },
    );

    server.patch(
      "/fulfilment/shipments/:id/status",
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: { status: ShipmentItem["status"] };
        }>,
        reply: FastifyReply,
      ) => {
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
            trackingNumber: updated.trackingNumber || "",
            status: updated.status as ShipmentItem["status"],
            originPort: "Mundra Port, Gujarat, India",
            destinationPort: "Jebel Ali Port, Dubai, UAE",
            dispatchedDate:
              updated.dispatchedAt.toISOString().split("T")[0] ?? "",
            estimatedArrival:
              updated.expectedDeliveryAt.toISOString().split("T")[0] ?? "",
            isSupplierDirect: updated.isSupplierDirect,
          };
          await logAudit(
            "System",
            "UPDATE_STATUS",
            "Shipment",
            id,
            `Updated shipment status to ${status}`,
          );
          return reply.send({ shipment: mapped });
        } catch (err) {
          return reply.status(404).send({ error: (err as Error).message });
        }
      },
    );

    server.delete(
      "/fulfilment/shipments/:id",
      async (
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        try {
          await prisma.shipmentLine.deleteMany({ where: { shipmentId: id } });
          await prisma.fulfilmentShipment.delete({ where: { id } });
          await logAudit(
            "System",
            "DELETE",
            "Shipment",
            id,
            `Deleted shipment record ${id}`,
          );
          return reply.send({ success: true, id });
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );
  }
}
