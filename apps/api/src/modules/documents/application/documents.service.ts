import type { FastifyRequest } from 'fastify';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { localStorageProvider, StorageProvider } from '../infrastructure/storage.provider.js';
import {
  TRADE_DOCUMENT_TAXONOMY,
  getCategoriesForEntity,
  getCategoryDetails,
} from '../domain/document-taxonomy.js';
import type { PrismaClient } from '../../../generated/client/index.js';

export interface TradeDocumentRecord {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  entityReference?: string | null;
  documentCategory: string;
  tradePhase: string;
  fileName: string;
  fileOriginalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  fileUrl: string;
  uploadedById?: string | null;
  uploadedByName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

export class DocumentsService {
  private readonly storage: StorageProvider;

  constructor(
    private readonly prisma: PrismaClient,
    storage?: StorageProvider
  ) {
    this.storage = storage || localStorageProvider;
  }

  getTaxonomy(entityType?: string) {
    if (entityType) {
      return getCategoriesForEntity(entityType);
    }
    return TRADE_DOCUMENT_TAXONOMY;
  }

  async getDocuments(filter: {
    entityType?: string;
    entityId?: string;
    tradePhase?: string;
    documentCategory?: string;
  }): Promise<TradeDocumentRecord[]> {
    const orgId = await getOrganizationId();
    let query = `SELECT * FROM "trade_documents" WHERE "organization_id" = $1::uuid`;
    const params: any[] = [orgId];

    if (filter.entityType) {
      params.push(filter.entityType.toUpperCase());
      query += ` AND UPPER("entity_type") = $${params.length}`;
    }

    if (filter.entityId) {
      params.push(filter.entityId);
      query += ` AND "entity_id" = $${params.length}`;
    }

    if (filter.tradePhase) {
      params.push(filter.tradePhase.toUpperCase());
      query += ` AND UPPER("trade_phase") = $${params.length}`;
    }

    if (filter.documentCategory) {
      params.push(filter.documentCategory.toUpperCase());
      query += ` AND UPPER("document_category") = $${params.length}`;
    }

    query += ` ORDER BY "created_at" DESC`;

    const rawRows = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);

    return rawRows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityReference: r.entity_reference,
      documentCategory: r.document_category,
      tradePhase: r.trade_phase,
      fileName: r.file_name,
      fileOriginalName: r.file_original_name,
      fileSize: Number(r.file_size),
      mimeType: r.mime_type,
      filePath: r.file_path,
      fileUrl: r.file_url || `/api/v1/documents/${r.id}/download`,
      uploadedById: r.uploaded_by_id,
      uploadedByName: r.uploaded_by_name || 'Trader / Operations',
      notes: r.notes,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }));
  }

  async getDocumentById(id: string): Promise<TradeDocumentRecord | null> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "trade_documents" WHERE "id" = $1::uuid LIMIT 1`,
      id
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      organizationId: r.organization_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityReference: r.entity_reference,
      documentCategory: r.document_category,
      tradePhase: r.trade_phase,
      fileName: r.file_name,
      fileOriginalName: r.file_original_name,
      fileSize: Number(r.file_size),
      mimeType: r.mime_type,
      filePath: r.file_path,
      fileUrl: r.file_url || `/api/v1/documents/${r.id}/download`,
      uploadedById: r.uploaded_by_id,
      uploadedByName: r.uploaded_by_name,
      notes: r.notes,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Uploads one or multiple documents from a multipart request.
   */
  async handleMultipartUpload(req: FastifyRequest): Promise<TradeDocumentRecord[]> {
    const orgId = await getOrganizationId();
    const parts = req.files();
    const createdDocuments: TradeDocumentRecord[] = [];

    // Fields map for non-file form fields
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        const originalName = part.filename;
        const ext = path.extname(originalName).toLowerCase();

        if (!ALLOWED_EXTENSIONS.has(ext)) {
          throw new Error(
            `File format "${ext}" is not permitted. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG, WEBP.`
          );
        }

        // Determine destination folder based on entityType
        const rawEntityType = (part.fields?.entityType as any)?.value || fields.entityType || 'GENERAL';
        const entityType = String(rawEntityType).toUpperCase();
        const entityId = String((part.fields?.entityId as any)?.value || fields.entityId || uuidv4());
        const entityReference = String((part.fields?.entityReference as any)?.value || fields.entityReference || '');
        const documentCategory = String((part.fields?.documentCategory as any)?.value || fields.documentCategory || 'OTHER').toUpperCase();
        const notes = String((part.fields?.notes as any)?.value || fields.notes || '');

        // Resolve trading phase
        const catDetails = getCategoryDetails(documentCategory);
        const tradePhase = (part.fields?.tradePhase as any)?.value || catDetails?.phase || 'PRE_SALES';

        const subfolder = entityType.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Save file through storage provider
        const storageResult = await this.storage.saveFile(
          part.file,
          originalName,
          part.mimetype,
          subfolder
        );

        const docId = uuidv4();
        const downloadUrl = `/api/v1/documents/${docId}/download`;

        // Insert record into PostgreSQL database
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "trade_documents" (
            "id", "organization_id", "entity_type", "entity_id", "entity_reference",
            "document_category", "trade_phase", "file_name", "file_original_name",
            "file_size", "mime_type", "file_path", "file_url", "notes",
            "created_at", "updated_at"
          ) VALUES (
            $1::uuid, $2::uuid, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13, $14,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )`,
          docId,
          orgId,
          entityType,
          entityId,
          entityReference || null,
          documentCategory,
          tradePhase,
          storageResult.fileName,
          originalName,
          storageResult.fileSize,
          part.mimetype,
          storageResult.storagePath,
          downloadUrl,
          notes || null
        );

        await logAudit(
          'Trader',
          'UPLOAD',
          'TradeDocument',
          docId,
          `Uploaded ${catDetails?.name || documentCategory} (${originalName}) for ${entityType} ${entityReference || entityId}`
        );

        createdDocuments.push({
          id: docId,
          organizationId: orgId,
          entityType,
          entityId,
          entityReference: entityReference || null,
          documentCategory,
          tradePhase,
          fileName: storageResult.fileName,
          fileOriginalName: originalName,
          fileSize: storageResult.fileSize,
          mimeType: part.mimetype,
          filePath: storageResult.storagePath,
          fileUrl: downloadUrl,
          notes: notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return createdDocuments;
  }

  async getFileStream(doc: TradeDocumentRecord) {
    return this.storage.getFileStream(doc.filePath);
  }

  async deleteDocument(id: string): Promise<boolean> {
    const doc = await this.getDocumentById(id);
    if (!doc) return false;

    // Delete file from disk
    try {
      await this.storage.deleteFile(doc.filePath);
    } catch (err) {
      logger.warn({ err, filePath: doc.filePath }, '[Documents] Storage file unlink failed');
    }

    // Delete record from PostgreSQL
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "trade_documents" WHERE "id" = $1::uuid`,
      id
    );

    await logAudit(
      'Trader',
      'DELETE',
      'TradeDocument',
      id,
      `Deleted document ${doc.fileOriginalName} (${doc.documentCategory})`
    );

    return true;
  }
}
