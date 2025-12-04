import { z } from 'zod';

export const superAdminSetupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const superAdminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const superAdminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type SuperAdminSetupDto = z.infer<typeof superAdminSetupSchema>;
export type SuperAdminLoginDto = z.infer<typeof superAdminLoginSchema>;
export type SuperAdminChangePasswordDto = z.infer<typeof superAdminChangePasswordSchema>;

