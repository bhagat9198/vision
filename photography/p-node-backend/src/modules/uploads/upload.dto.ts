import { z } from 'zod';

// File info for initialization
export const fileInfoSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().positive(),
  type: z.string().min(1),
});

// Initialize upload session
export const initUploadSchema = z.object({
  eventId: z.string(),  // Can be UUID or displayId
  albumId: z.string().optional().nullable(),  // Optional - null for root uploads
  files: z.array(fileInfoSchema).min(1).max(10000),
});

// Complete file upload
export const completeFileSchema = z.object({
  fileId: z.string().uuid(),
});

// Retry failed files
export const retryFilesSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1),
});

// Query session status
export const sessionStatusQuerySchema = z.object({
  includeFiles: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  fileStatus: z.enum(['PENDING', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
});

export type FileInfo = z.infer<typeof fileInfoSchema>;
export type InitUploadDto = z.infer<typeof initUploadSchema>;
export type CompleteFileDto = z.infer<typeof completeFileSchema>;
export type RetryFilesDto = z.infer<typeof retryFilesSchema>;
export type SessionStatusQueryDto = z.infer<typeof sessionStatusQuerySchema>;

// Response types
export interface InitUploadResponse {
  sessionId: string;
  chunkSize: number;
  expiresAt: Date;
  files: Array<{
    fileId: string;
    originalName: string;
    totalChunks: number;
  }>;
}

export interface UploadStatusResponse {
  sessionId: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  progress: number; // 0-100
  files?: Array<{
    fileId: string;
    originalName: string;
    status: string;
    uploadedChunks: number;
    totalChunks: number;
    progress: number;
    errorMessage?: string;
  }>;
}

