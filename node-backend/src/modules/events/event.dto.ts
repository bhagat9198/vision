import { z } from 'zod';
import { GalleryTemplate, EventStatus } from '../../lib/prisma.js';

export const createEventSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  date: z.string().transform((val) => new Date(val)),
  location: z.string().optional(),
  coverPhoto: z.string().url().optional(),
  isPasswordProtected: z.boolean().default(false),
  password: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  template: z.nativeEnum(GalleryTemplate).default(GalleryTemplate.MODERN),
  watermarkEnabled: z.boolean().default(true),
  allowDownloads: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  allowLikes: z.boolean().default(true),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.nativeEnum(EventStatus).optional(),
});

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const eventQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  search: z.string().optional(),
});

export type CreateEventDto = z.infer<typeof createEventSchema>;
export type UpdateEventDto = z.infer<typeof updateEventSchema>;
export type VerifyPasswordDto = z.infer<typeof verifyPasswordSchema>;
export type EventQueryDto = z.infer<typeof eventQuerySchema>;

