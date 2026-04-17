import { z } from 'zod';
import { GalleryTemplate, EventStatus } from '../../lib/prisma.js';

// Settings object from frontend
const eventSettingsSchema = z.object({
  accessType: z.enum(['OPEN', 'PASSWORD']).optional(),
  password: z.string().optional().nullable(),
  watermarkEnabled: z.boolean().optional(),
  watermarkText: z.string().optional().nullable(),
  downloadEnabled: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
  likesEnabled: z.boolean().optional(),
}).optional();

// Base schema without transform (for partial/extend)
const baseEventSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  date: z.string().transform((val) => new Date(val)),
  description: z.string().optional().nullable(),
  location: z.string().optional(),
  coverPhoto: z.string().url().optional(),
  isPasswordProtected: z.boolean().default(false),
  password: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  template: z.nativeEnum(GalleryTemplate).default(GalleryTemplate.MODERN),
  watermarkEnabled: z.boolean().default(true),
  watermarkText: z.string().optional().nullable(),
  allowDownloads: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  allowLikes: z.boolean().default(true),
  // Accept settings object from frontend
  settings: eventSettingsSchema,
});

// Helper to flatten settings and remove settings key from output
function flattenSettings<T extends Partial<z.infer<typeof baseEventSchema>>>(data: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { settings, ...rest } = data;
  if (settings) {
    const flattened = {
      ...rest,
      isPasswordProtected: settings.accessType === 'PASSWORD',
      password: settings.accessType === 'PASSWORD' ? (settings.password ?? rest.password) : null,
      watermarkEnabled: settings.watermarkEnabled ?? rest.watermarkEnabled,
      watermarkText: settings.watermarkText ?? rest.watermarkText,
      allowDownloads: settings.downloadEnabled ?? rest.allowDownloads,
      allowComments: settings.commentsEnabled ?? rest.allowComments,
      allowLikes: settings.likesEnabled ?? rest.allowLikes,
    };
    return flattened;
  }
  return rest;
}

export const createEventSchema = baseEventSchema.transform(flattenSettings);

export const updateEventSchema = baseEventSchema.partial().extend({
  status: z.nativeEnum(EventStatus).optional(),
}).transform(flattenSettings);

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

