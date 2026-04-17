import { Request, Response, NextFunction } from 'express';
import { uploadService } from './upload.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';
import type { InitUploadDto, RetryFilesDto, SessionStatusQueryDto } from './upload.dto.js';
import fs from 'fs/promises';
import path from 'path';

export class UploadController {
  // Initialize upload session
  async initSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const data = req.body as InitUploadDto;
      const result = await uploadService.initSession(user.id, data);
      sendCreated(res, result, 'Upload session initialized');
    } catch (error) {
      next(error);
    }
  }

  // Get session status (for polling)
  async getSessionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { sessionId } = req.params;
      const query = req.query as SessionStatusQueryDto;
      const result = await uploadService.getSessionStatus(sessionId, user.id, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Upload chunk
  async uploadChunk(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { sessionId, fileId, chunkIndex } = req.params;
      const chunkIdx = parseInt(chunkIndex, 10);

      if (isNaN(chunkIdx)) {
        return res.status(400).json({ success: false, error: 'Invalid chunk index' });
      }

      // First check if chunk already exists (for resumability)
      const checkResult = await uploadService.recordChunkUpload(
        sessionId, fileId, chunkIdx, user.id
      );

      if (checkResult.alreadyUploaded) {
        return sendSuccess(res, { alreadyUploaded: true }, 200, 'Chunk already uploaded');
      }

      // Get the uploaded file from multer
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No chunk data provided' });
      }

      // Save chunk to temp directory
      const chunkPath = uploadService.getChunkPath(sessionId, fileId, chunkIdx);
      await fs.mkdir(path.dirname(chunkPath), { recursive: true });
      await fs.writeFile(chunkPath, file.buffer);

      sendSuccess(res, { chunkIndex: chunkIdx, uploaded: true }, 200, 'Chunk uploaded');
    } catch (error) {
      next(error);
    }
  }

  // Complete file upload (all chunks received)
  async completeFileUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { sessionId, fileId } = req.params;
      const result = await uploadService.completeFileUpload(sessionId, fileId, user.id);
      sendSuccess(res, result, 200, 'File upload completed');
    } catch (error) {
      next(error);
    }
  }

  // Retry failed files
  async retryFailedFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { sessionId } = req.params;
      const { fileIds } = req.body as RetryFilesDto;
      const result = await uploadService.retryFailedFiles(sessionId, fileIds, user.id);
      sendSuccess(res, result, 200, 'Files queued for retry');
    } catch (error) {
      next(error);
    }
  }

  // Get file upload info (for resume check)
  async getFileUploadInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { sessionId, fileId } = req.params;
      const session = await uploadService.getSession(sessionId, user.id);
      const file = session.files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      sendSuccess(res, {
        fileId: file.id,
        originalName: file.originalName,
        status: file.status,
        totalChunks: file.totalChunks,
        uploadedChunks: file.uploadedChunks,
        chunksReceived: file.chunksReceived.map(Number),
        missingChunks: Array.from({ length: file.totalChunks }, (_, i) => i)
          .filter(i => !file.chunksReceived.includes(String(i))),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();

