import { prisma } from '../../config/database.js';
import { UploadSessionStatus, UploadFileStatus } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/exceptions/AppError.js';
import { configService } from '../config/config.service.js';
import { addImageProcessingJob } from '../../queues/image-processing.queue.js';
import type { InitUploadDto, InitUploadResponse, UploadStatusResponse, SessionStatusQueryDto } from './upload.dto.js';
import fs from 'fs/promises';
import path from 'path';

const CHUNK_SIZE_MB = 5;
const TEMP_UPLOAD_DIR = './uploads/temp';

// Helper to parse ID - returns { id, displayId } based on input
function parseId(idOrDisplayId: string): { id?: string; displayId?: number } {
  const numId = parseInt(idOrDisplayId, 10);
  if (!isNaN(numId) && numId.toString() === idOrDisplayId) {
    return { displayId: numId };
  }
  return { id: idOrDisplayId };
}

export class UploadService {
  // Initialize upload session
  async initSession(photographerId: string, data: InitUploadDto): Promise<InitUploadResponse> {
    // Resolve eventId if it's a displayId
    const { id: eventId, displayId: eventDisplayId } = parseId(data.eventId);
    const event = await prisma.event.findFirst({
      where: eventId ? { id: eventId } : { displayId: eventDisplayId },
      select: { id: true, photographerId: true },
    });
    if (!event) throw new NotFoundError('Event not found');
    if (event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this event');
    }

    // Resolve albumId if provided (can be UUID, displayId, or null for root uploads)
    let resolvedAlbumId: string | null = null;
    if (data.albumId) {
      const { id: albumId, displayId: albumDisplayId } = parseId(data.albumId);
      const album = await prisma.album.findFirst({
        where: albumId ? { id: albumId } : { displayId: albumDisplayId },
        include: { event: { select: { id: true, photographerId: true } } },
      });

      if (!album) throw new NotFoundError('Album not found');
      if (album.event.photographerId !== photographerId) {
        throw new ForbiddenError('You do not have access to this album');
      }
      if (album.eventId !== event.id) {
        throw new BadRequestError('Album does not belong to this event');
      }
      resolvedAlbumId = album.id;
    }

    const uploadConfig = await configService.getUploadConfig();
    const chunkSizeMb = uploadConfig.chunkSizeMb || CHUNK_SIZE_MB;
    const chunkSizeBytes = chunkSizeMb * 1024 * 1024;
    const sessionExpiryHours = uploadConfig.sessionExpiryHours || 24;

    // Calculate total chunks for each file
    const filesWithChunks = data.files.map(file => ({
      originalName: file.name,
      mimeType: file.type,
      fileSize: BigInt(file.size),
      totalChunks: Math.ceil(file.size / chunkSizeBytes),
    }));

    // Create session with files (use resolved UUIDs)
    const session = await prisma.uploadSession.create({
      data: {
        photographerId,
        eventId: event.id,
        albumId: resolvedAlbumId,
        totalFiles: data.files.length,
        totalSize: BigInt(data.files.reduce((sum, f) => sum + f.size, 0)),
        expiresAt: new Date(Date.now() + sessionExpiryHours * 60 * 60 * 1000),
        files: {
          create: filesWithChunks,
        },
      },
      include: { files: true },
    });

    // Create temp directory for this session
    const sessionTempDir = path.join(TEMP_UPLOAD_DIR, session.id);
    await fs.mkdir(sessionTempDir, { recursive: true });

    return {
      sessionId: session.id,
      chunkSize: chunkSizeBytes,
      expiresAt: session.expiresAt,
      files: session.files.map(f => ({
        fileId: f.id,
        originalName: f.originalName,
        totalChunks: f.totalChunks,
      })),
    };
  }

  // Get session with ownership check
  async getSession(sessionId: string, photographerId: string) {
    const session = await prisma.uploadSession.findUnique({
      where: { id: sessionId },
      include: { files: true },
    });

    if (!session) throw new NotFoundError('Upload session not found');
    if (session.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this session');
    }
    if (session.status === UploadSessionStatus.EXPIRED) {
      throw new BadRequestError('Upload session has expired');
    }

    return session;
  }

  // Get session status
  async getSessionStatus(sessionId: string, photographerId: string, query: SessionStatusQueryDto): Promise<UploadStatusResponse> {
    const session = await this.getSession(sessionId, photographerId);

    const progress = session.totalFiles > 0
      ? Math.round((session.processedFiles / session.totalFiles) * 100)
      : 0;

    const response: UploadStatusResponse = {
      sessionId: session.id,
      status: session.status,
      totalFiles: session.totalFiles,
      processedFiles: session.processedFiles,
      failedFiles: session.failedFiles,
      progress,
    };

    if (query.includeFiles) {
      let files = session.files;
      if (query.fileStatus) {
        files = files.filter(f => f.status === query.fileStatus);
      }
      response.files = files.map(f => ({
        fileId: f.id,
        originalName: f.originalName,
        status: f.status,
        uploadedChunks: f.uploadedChunks,
        totalChunks: f.totalChunks,
        progress: f.totalChunks > 0 ? Math.round((f.uploadedChunks / f.totalChunks) * 100) : 0,
        errorMessage: f.errorMessage || undefined,
      }));
    }

    return response;
  }

  // Record chunk upload
  async recordChunkUpload(sessionId: string, fileId: string, chunkIndex: number, photographerId: string) {
    const session = await this.getSession(sessionId, photographerId);
    const file = session.files.find(f => f.id === fileId);

    if (!file) throw new NotFoundError('File not found in session');
    if (chunkIndex < 0 || chunkIndex >= file.totalChunks) {
      throw new BadRequestError(`Invalid chunk index. Expected 0-${file.totalChunks - 1}`);
    }

    // Check if chunk already uploaded
    if (file.chunksReceived.includes(String(chunkIndex))) {
      return { alreadyUploaded: true };
    }

    // Update file with new chunk
    await prisma.uploadFile.update({
      where: { id: fileId },
      data: {
        chunksReceived: { push: String(chunkIndex) },
        uploadedChunks: { increment: 1 },
        status: UploadFileStatus.UPLOADING,
      },
    });

    return { alreadyUploaded: false };
  }

  // Mark file upload complete (all chunks received) - starts processing IMMEDIATELY
  async completeFileUpload(sessionId: string, fileId: string, photographerId: string) {
    const session = await this.getSession(sessionId, photographerId);
    const file = session.files.find(f => f.id === fileId);

    if (!file) throw new NotFoundError('File not found in session');

    // Check all chunks received
    if (file.uploadedChunks < file.totalChunks) {
      const missing = [];
      for (let i = 0; i < file.totalChunks; i++) {
        if (!file.chunksReceived.includes(String(i))) {
          missing.push(i);
        }
      }
      throw new BadRequestError(`Missing chunks: ${missing.join(', ')}`);
    }

    // Update file status to uploaded (ready for processing)
    await prisma.uploadFile.update({
      where: { id: fileId },
      data: {
        status: UploadFileStatus.UPLOADED,
        tempPath: path.join(TEMP_UPLOAD_DIR, sessionId, fileId),
      },
    });

    // Update session status to PROCESSING if not already
    await prisma.uploadSession.update({
      where: { id: sessionId },
      data: { status: UploadSessionStatus.PROCESSING },
    });

    // IMMEDIATELY queue processing job for THIS file (don't wait for others)
    await addImageProcessingJob({
      sessionId,
      fileId: file.id,
      photographerId: session.photographerId,
      eventId: session.eventId,
      albumId: session.albumId,
      originalName: file.originalName,
      mimeType: file.mimeType,
    });

    return { status: 'uploaded', processingStarted: true };
  }

  // Retry failed files
  async retryFailedFiles(sessionId: string, fileIds: string[], photographerId: string) {
    const session = await this.getSession(sessionId, photographerId);

    const filesToRetry = session.files.filter(f =>
      fileIds.includes(f.id) && f.status === UploadFileStatus.FAILED
    );

    if (filesToRetry.length === 0) {
      throw new BadRequestError('No failed files found to retry');
    }

    // Reset files for retry
    await prisma.uploadFile.updateMany({
      where: {
        id: { in: filesToRetry.map(f => f.id) },
        retryCount: { lt: 3 }, // Max 3 retries
      },
      data: {
        status: UploadFileStatus.PENDING,
        errorMessage: null,
        uploadedChunks: 0,
        chunksReceived: [],
        retryCount: { increment: 1 },
      },
    });

    // Update session counts
    await prisma.uploadSession.update({
      where: { id: sessionId },
      data: {
        failedFiles: { decrement: filesToRetry.length },
        status: UploadSessionStatus.UPLOADING,
      },
    });

    return { retriedCount: filesToRetry.length };
  }

  // Get temp file path for chunk storage
  getChunkPath(sessionId: string, fileId: string, chunkIndex: number): string {
    return path.join(TEMP_UPLOAD_DIR, sessionId, fileId, `chunk_${chunkIndex}`);
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    const expired = await prisma.uploadSession.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { not: UploadSessionStatus.EXPIRED },
      },
      select: { id: true },
    });

    for (const session of expired) {
      // Delete temp files
      const sessionTempDir = path.join(TEMP_UPLOAD_DIR, session.id);
      try {
        await fs.rm(sessionTempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }

      // Mark as expired
      await prisma.uploadSession.update({
        where: { id: session.id },
        data: { status: UploadSessionStatus.EXPIRED },
      });
    }

    return { expiredCount: expired.length };
  }
}

export const uploadService = new UploadService();

