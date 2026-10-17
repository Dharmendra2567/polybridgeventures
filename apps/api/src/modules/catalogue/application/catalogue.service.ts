import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../../infrastructure/logging/logger.js";
import { getOrganizationId } from "../../../shared/organization.context.js";
import { logAudit } from "../../../shared/audit.service.js";
import { ProductItem } from "../../trade-data.js";
import type { PrismaClient } from "../../../generated/client/index.js";

/** Application layer for the catalogue bounded context. */
export class CatalogueService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
    // -------------------------------------------------------------
    // PRODUCT CATALOGUE (Pure Database)
    // -------------------------------------------------------------
    server.get(
      "/catalogue/products",
      async (_req: FastifyRequest, reply: FastifyReply) => {
        try {
          const dbProducts = await prisma.product.findMany({
            where: { isActive: true },
            include: { category: true, uom: true },
            orderBy: { createdAt: "desc" },
          });

          const products: ProductItem[] = dbProducts.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category?.name || "General Commodity",
            uom: p.uom?.code || "MT",
            standardCost: Number(p.standardCost),
            standardPrice: Number(p.standardPrice),
            currency: p.currency,
            description: p.description || "",
          }));

          return reply.send({ products });
        } catch (err) {
          logger.error({ err }, "[Catalogue] Failed to fetch products from DB");
          return reply.status(500).send({ error: (err as Error).message });
        }
      },
    );

    server.post(
      "/catalogue/products",
      async (
        req: FastifyRequest<{ Body: Partial<ProductItem> }>,
        reply: FastifyReply,
      ) => {
        const data = req.body || {};
        const orgId = await getOrganizationId();

        try {
          let cat = await prisma.category.findFirst({
            where: data.category
              ? { name: { equals: data.category, mode: "insensitive" } }
              : undefined,
          });
          if (!cat) {
            cat = await prisma.category.findFirst();
            if (!cat) {
              cat = await prisma.category.create({
                data: {
                  name: data.category || "General Commodities",
                  code: `CAT-${Date.now().toString().slice(-4)}`,
                },
              });
            }
          }

          let uom = await prisma.unitOfMeasure.findFirst({
            where: data.uom
              ? { code: { equals: data.uom, mode: "insensitive" } }
              : undefined,
          });
          if (!uom) {
            uom = await prisma.unitOfMeasure.findFirst();
            if (!uom) {
              uom = await prisma.unitOfMeasure.create({
                data: { name: "Metric Ton", code: data.uom || "MT" },
              });
            }
          }

          const sku = data.sku || `PROD-${Date.now().toString().slice(-4)}`;

          const created = await prisma.product.create({
            data: {
              organizationId: orgId,
              sku,
              name: data.name || "New Commodity",
              categoryId: cat.id,
              uomId: uom.id,
              standardCost: Number(data.standardCost || 0),
              standardPrice: Number(data.standardPrice || 0),
              currency: data.currency || "USD",
              description: data.description || "",
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
            description: created.description || "",
          };

          await logAudit(
            "System",
            "CREATE",
            "Product",
            created.id,
            `Created catalogue item: ${newProduct.name} (${newProduct.sku})`,
          );
          return reply.status(201).send({ product: newProduct });
        } catch (err) {
          logger.error({ err }, "[Catalogue] Error creating product in DB");
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    server.put(
      "/catalogue/products/:id",
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: Partial<ProductItem>;
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const data = req.body || {};
        try {
          const updated = await prisma.product.update({
            where: { id },
            data: {
              ...(data.name ? { name: data.name } : {}),
              ...(data.standardCost !== undefined
                ? { standardCost: Number(data.standardCost) }
                : {}),
              ...(data.standardPrice !== undefined
                ? { standardPrice: Number(data.standardPrice) }
                : {}),
              ...(data.description !== undefined
                ? { description: data.description }
                : {}),
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
            description: updated.description || "",
          };
          return reply.send({ product: mapped });
        } catch (err) {
          return reply.status(404).send({ error: (err as Error).message });
        }
      },
    );

    server.delete(
      "/catalogue/products/:id",
      async (
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        try {
          await prisma.product.delete({ where: { id } });
          await logAudit(
            "System",
            "DELETE",
            "Product",
            id,
            `Deleted catalogue product ${id}`,
          );
          return reply.send({ success: true, id });
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );
  }
}
