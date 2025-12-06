import { z } from 'zod';

export const createAlbumSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  coverPhoto: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().optional().nullable(),
});

export const updateAlbumSchema = createAlbumSchema.partial();

export const reorderAlbumsSchema = z.object({
  albums: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int(),
  })),
});

export type CreateAlbumDto = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumDto = z.infer<typeof updateAlbumSchema>;
export type ReorderAlbumsDto = z.infer<typeof reorderAlbumsSchema>;

