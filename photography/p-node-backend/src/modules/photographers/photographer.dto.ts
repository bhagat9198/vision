import { z } from 'zod';
import { GalleryTemplate } from '../../lib/prisma.js';

export const updatePhotographerSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable(),
  instagram: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  watermarkUrl: z.string().url().optional().nullable(),
  defaultTemplate: z.nativeEnum(GalleryTemplate).optional(),
  notificationSettings: z.object({
    emailOnComment: z.boolean(),
    emailOnDownload: z.boolean(),
    emailOnNewClient: z.boolean(),
    pushNotifications: z.boolean(),
  }).optional(),
});

export type UpdatePhotographerDto = z.infer<typeof updatePhotographerSchema>;

