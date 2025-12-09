import fs from 'fs/promises';
import path from 'path';
import { configService } from '../modules/config/config.service.js';
import { logger } from '../common/utils/logger.js';
import { env } from '../config/env.js';

const LOCAL_STORAGE_DIR = './uploads/storage';

export interface StorageAdapter {
  uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string): Promise<string>;
  deleteDirectory(key: string): Promise<void>;
  moveDirectory(sourceKey: string, destKey: string): Promise<void>;
  checkExists(key: string): Promise<boolean>;
}

// Local storage adapter
class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private baseUrl: string;

  constructor(baseDir: string = LOCAL_STORAGE_DIR) {
    this.baseDir = baseDir;
    this.baseUrl = `http://localhost:${env.PORT}/uploads`;
  }

  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    logger.info(`Local storage: uploaded ${key} to ${filePath}`);
    return `${this.baseUrl}/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    try {
      await fs.unlink(filePath);
      logger.info(`Local storage: deleted ${key}`);
    } catch (error) {
      logger.warn(`Local storage: failed to delete ${key}`, error);
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `${this.baseUrl}/${key}`;
  }

  async deleteDirectory(key: string): Promise<void> {
    const dirPath = path.join(this.baseDir, key);
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      logger.info(`Local storage: deleted directory ${key}`);
    } catch (error) {
      // If it doesn't exist, we don't care
      logger.warn(`Local storage: failed to delete directory ${key}`, error);
    }
  }

  async moveDirectory(sourceKey: string, destKey: string): Promise<void> {
    const srcPath = path.join(this.baseDir, sourceKey);
    const destPath = path.join(this.baseDir, destKey);

    try {
      // Ensure destination parent exists
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.rename(srcPath, destPath);
      logger.info(`Local storage: moved ${sourceKey} to ${destKey}`);
    } catch (error) {
      logger.error(`Local storage: failed to move ${sourceKey} to ${destKey}`, error);
      throw error;
    }
  }

  async checkExists(key: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// S3 storage adapter (placeholder for future implementation)
class S3StorageAdapter implements StorageAdapter {
  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    throw new Error('S3 storage not implemented yet');
  }

  async deleteFile(key: string): Promise<void> {
    throw new Error('S3 storage not implemented yet');
  }

  async getFileUrl(key: string): Promise<string> {
    throw new Error('S3 storage not implemented yet');
  }

  async deleteDirectory(key: string): Promise<void> {
    throw new Error('S3 storage not implemented yet');
  }

  async moveDirectory(sourceKey: string, destKey: string): Promise<void> {
    throw new Error('S3 storage not implemented yet');
  }

  async checkExists(key: string): Promise<boolean> {
    throw new Error('S3 storage not implemented yet');
  }
}

// Storage service with adapter pattern
class StorageService {
  private adapter: StorageAdapter | null = null;

  private async getAdapter(): Promise<StorageAdapter> {
    if (this.adapter) return this.adapter;

    const config = await configService.getStorageConfig();

    switch (config.provider) {
      case 's3':
        this.adapter = new S3StorageAdapter();
        break;
      case 'local':
      default:
        this.adapter = new LocalStorageAdapter(config.local.path ?? undefined);
        break;
    }

    logger.info(`Storage adapter initialized: ${config.provider}`);
    return this.adapter;
  }

  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const adapter = await this.getAdapter();
    return adapter.uploadFile(buffer, key, contentType);
  }

  async deleteFile(key: string): Promise<void> {
    const adapter = await this.getAdapter();
    return adapter.deleteFile(key);
  }

  async getFileUrl(key: string): Promise<string> {
    const adapter = await this.getAdapter();
    return adapter.getFileUrl(key);
  }

  async deleteDirectory(key: string): Promise<void> {
    const adapter = await this.getAdapter();
    return adapter.deleteDirectory(key);
  }

  async moveDirectory(sourceKey: string, destKey: string): Promise<void> {
    const adapter = await this.getAdapter();
    return adapter.moveDirectory(sourceKey, destKey);
  }

  async checkExists(key: string): Promise<boolean> {
    const adapter = await this.getAdapter();
    return adapter.checkExists(key);
  }

  // Reset adapter (useful when config changes)
  resetAdapter() {
    this.adapter = null;
  }
}

export const storageService = new StorageService();

