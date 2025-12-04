import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  otp: z.string().optional(),
  phoneVerified: z.boolean().optional(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  type: z.enum(['signup', 'login', 'password_reset']),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  otp: z.string().min(6, 'OTP must be 6 digits').max(6),
  type: z.enum(['signup', 'login', 'password_reset']),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type SendOtpDto = z.infer<typeof sendOtpSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

