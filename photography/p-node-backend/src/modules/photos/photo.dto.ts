import { z } from 'zod';
import { AspectRatio } from '../../lib/prisma.js';

export const createPhotoSchema = z.object({
  url: z.string().url(),
  thumbnail: z.string().url(),
  originalName: z.string().optional(),
  fileSize: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  aspectRatio: z.nativeEnum(AspectRatio).default(AspectRatio.LANDSCAPE),
  downloadable: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
});

export const updatePhotoSchema = createPhotoSchema.partial();

export const bulkCreatePhotosSchema = z.object({
  photos: z.array(createPhotoSchema),
});

export const likePhotoSchema = z.object({
  sessionId: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export const photoQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  albumId: z.string().uuid().optional(),
  rootOnly: z.string().optional(), // 'true' to get photos without album (root photos)
});

export type CreatePhotoDto = z.infer<typeof createPhotoSchema>;
export type UpdatePhotoDto = z.infer<typeof updatePhotoSchema>;
export type BulkCreatePhotosDto = z.infer<typeof bulkCreatePhotosSchema>;
export type LikePhotoDto = z.infer<typeof likePhotoSchema>;
export type PhotoQueryDto = z.infer<typeof photoQuerySchema>;

