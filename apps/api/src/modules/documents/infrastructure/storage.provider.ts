import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../infrastructure/logging/logger.js';

export interface StorageResult {
  storagePath: string;
  publicUrl: string;
  fileSize: number;
  fileName: string;
}

export interface StorageProvider {
  saveFile(
    fileStream: NodeJS.ReadableStream,
    originalName: string,
    mimeType: string,
    folder: string
  ): Promise<StorageResult>;

  getFileStream(storagePath: string): Promise<{
    stream: NodeJS.ReadableStream;
    size?: number;
  }>;

  deleteFile(storagePath: string): Promise<void>;
}

/**
 * Local filesystem implementation of StorageProvider.
 * Stores uploaded documents in the local project directory.
 * Easily swappable for S3/MinIO/Cloud storage later.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly baseUploadDir: string;

  constructor(customBaseDir?: string) {
    // Default to 'uploads/documents' locally, or '/tmp/uploads/documents' on Vercel Serverless
    const defaultDir = process.env.VERCEL
      ? path.resolve('/tmp', 'uploads', 'documents')
      : path.resolve(process.cwd(), 'uploads', 'documents');
    this.baseUploadDir = customBaseDir || defaultDir;
    this.ensureDirectoryExists(this.baseUploadDir);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private sanitizeFilename(name: string): string {
    // Remove unsafe characters, preserve extension
    const ext = path.extname(name);
    const base = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${base}${ext}`.slice(0, 100);
  }

  async saveFile(
    fileStream: NodeJS.ReadableStream,
    originalName: string,
    _mimeType: string,
    folder: string = 'general'
  ): Promise<StorageResult> {
    const targetDir = path.join(this.baseUploadDir, folder);
    this.ensureDirectoryExists(targetDir);

    const safeName = this.sanitizeFilename(originalName);
    const uniquePrefix = `${Date.now()}-${uuidv4().slice(0, 8)}`;
    const storedFileName = `${uniquePrefix}_${safeName}`;
    const fullFilePath = path.join(targetDir, storedFileName);

    // Save to disk using stream pipeline
    const writeStream = fs.createWriteStream(fullFilePath);
    await pipeline(fileStream, writeStream);

    const stats = await fs.promises.stat(fullFilePath);
    const relativePath = path.posix.join('uploads', 'documents', folder, storedFileName);

    logger.info(
      { fullFilePath, size: stats.size, originalName },
      '[Storage] File successfully saved to local directory'
    );

    return {
      storagePath: relativePath,
      publicUrl: `/api/v1/documents/file/${encodeURIComponent(relativePath)}`,
      fileSize: stats.size,
      fileName: storedFileName,
    };
  }

  async getFileStream(storagePath: string): Promise<{
    stream: NodeJS.ReadableStream;
    size?: number;
  }> {
    // Prevent directory traversal attacks
    const normalized = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.resolve(process.cwd(), normalized);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at storage path: ${storagePath}`);
    }

    const stats = await fs.promises.stat(fullPath);
    const stream = fs.createReadStream(fullPath);
    return { stream, size: stats.size };
  }

  async deleteFile(storagePath: string): Promise<void> {
    const normalized = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.resolve(process.cwd(), normalized);

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      logger.info({ storagePath }, '[Storage] File deleted from local directory');
    }
  }
}

// Global singleton instance for local storage
export const localStorageProvider = new LocalStorageProvider();
