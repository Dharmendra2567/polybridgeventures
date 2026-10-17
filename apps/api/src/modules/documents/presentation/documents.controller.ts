import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DocumentsService } from "../application/documents.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export function createDocumentsController(prisma: PrismaClient) {
  const service = new DocumentsService(prisma);

  return {
    service,
    registerRoutes(server: FastifyInstance) {
      // 1. Get Trading Document Taxonomy
      server.get(
        "/documents/taxonomy",
        async (
          req: FastifyRequest<{ Querystring: { entityType?: string } }>,
          reply: FastifyReply,
        ) => {
          const { entityType } = req.query || {};
          const taxonomy = service.getTaxonomy(entityType);
          return reply.send({ taxonomy });
        },
      );

      // 2. Upload one or multiple documents
      server.post(
        "/documents/upload",
        async (req: FastifyRequest, reply: FastifyReply) => {
          try {
            if (!req.isMultipart()) {
              return reply
                .status(400)
                .send({ error: "Request must be multipart/form-data" });
            }

            const documents = await service.handleMultipartUpload(req);
            return reply.status(201).send({
              success: true,
              count: documents.length,
              documents,
            });
          } catch (err: any) {
            req.log.error({ err }, "[Documents] Upload failed");
            return reply
              .status(400)
              .send({ error: err.message || "File upload failed" });
          }
        },
      );

      // 3. List documents with filters
      server.get(
        "/documents",
        async (
          req: FastifyRequest<{
            Querystring: {
              entityType?: string;
              entityId?: string;
              tradePhase?: string;
              documentCategory?: string;
            };
          }>,
          reply: FastifyReply,
        ) => {
          try {
            const documents = await service.getDocuments(req.query || {});
            return reply.send({ documents });
          } catch (err: any) {
            req.log.error({ err }, "[Documents] Failed to fetch documents");
            return reply.status(500).send({ error: err.message });
          }
        },
      );

      // 4. Get document metadata by ID
      server.get(
        "/documents/:id",
        async (
          req: FastifyRequest<{ Params: { id: string } }>,
          reply: FastifyReply,
        ) => {
          try {
            const doc = await service.getDocumentById(req.params.id);
            if (!doc) {
              return reply.status(404).send({ error: "Document not found" });
            }
            return reply.send({ document: doc });
          } catch (err: any) {
            return reply.status(500).send({ error: err.message });
          }
        },
      );

      // 5. Download / Stream document
      server.get(
        "/documents/:id/download",
        async (
          req: FastifyRequest<{
            Params: { id: string };
            Querystring: { preview?: string };
          }>,
          reply: FastifyReply,
        ) => {
          try {
            const doc = await service.getDocumentById(req.params.id);
            if (!doc) {
              return reply.status(404).send({ error: "Document not found" });
            }

            const { stream, size } = await service.getFileStream(doc);
            const isPreview = req.query.preview === "true";
            const disposition = isPreview
              ? "inline"
              : `attachment; filename="${encodeURIComponent(doc.fileOriginalName)}"`;

            reply.header(
              "Content-Type",
              doc.mimeType || "application/octet-stream",
            );
            reply.header("Content-Disposition", disposition);
            if (size) {
              reply.header("Content-Length", size);
            }

            return reply.send(stream);
          } catch (err: any) {
            req.log.error({ err }, "[Documents] Streaming failed");
            return reply
              .status(404)
              .send({ error: err.message || "Failed to stream document" });
          }
        },
      );

      // 6. Delete document
      server.delete(
        "/documents/:id",
        async (
          req: FastifyRequest<{ Params: { id: string } }>,
          reply: FastifyReply,
        ) => {
          try {
            const success = await service.deleteDocument(req.params.id);
            if (!success) {
              return reply.status(404).send({ error: "Document not found" });
            }
            return reply.send({ success: true, id: req.params.id });
          } catch (err: any) {
            return reply.status(500).send({ error: err.message });
          }
        },
      );
    },
  };
}
