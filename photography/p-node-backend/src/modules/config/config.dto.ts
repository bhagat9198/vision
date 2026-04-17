import { z } from 'zod';

// For updating multiple config key-value pairs at once
export const updateConfigsDto = z.record(z.string(), z.string());

export const createTemplateDto = z.object({
  name: z.string().min(1, 'Template name is required'),
  type: z.enum([
    'EMAIL_OTP',
    'SMS_OTP',
    'EMAIL_WELCOME',
    'EMAIL_PASSWORD_RESET',
    'SMS_PASSWORD_RESET',
  ]),
  provider: z.string().optional(),
  templateId: z.string().optional(),
  templateText: z.string().min(1, 'Template text is required'),
  variables: z.array(z.string()).optional(),
  isHtml: z.boolean().optional(),
});

export const updateTemplateDto = z.object({
  name: z.string().min(1).optional(),
  templateId: z.string().optional(),
  templateText: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  isHtml: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateConfigsDto = z.infer<typeof updateConfigsDto>;
export type CreateTemplateDto = z.infer<typeof createTemplateDto>;
export type UpdateTemplateDto = z.infer<typeof updateTemplateDto>;

