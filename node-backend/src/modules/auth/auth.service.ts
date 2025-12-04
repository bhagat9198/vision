import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AUTH } from '../../config/constants.js';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../common/exceptions/AppError.js';
import { otpLogger, logger } from '../../common/utils/logger.js';
import { smsService } from '../../common/services/sms.service.js';
import type { RegisterDto, LoginDto, ChangePasswordDto, SendOtpDto, VerifyOtpDto } from './auth.dto.js';

export class AuthService {
  // Generate 6-digit OTP
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(data: SendOtpDto) {
    const { email, phone, type } = data;

    // Check if user exists for signup (should NOT exist)
    if (type === 'signup') {
      if (email) {
        const existing = await prisma.photographer.findUnique({ where: { email } });
        if (existing) throw new ConflictError('Email already registered');
      }
      if (phone) {
        const existing = await prisma.photographer.findFirst({ where: { phone } });
        if (existing) throw new ConflictError('Phone number already registered');
      }
    }

    // Check if user exists for login (should exist)
    if (type === 'login') {
      if (email) {
        const existing = await prisma.photographer.findUnique({ where: { email } });
        if (!existing) throw new BadRequestError('No account found with this email. Please sign up first.');
      }
      if (phone) {
        const existing = await prisma.photographer.findFirst({ where: { phone } });
        if (!existing) throw new BadRequestError('No account found with this phone number. Please sign up first.');
      }
    }

    // Delete old OTPs for this email/phone and type
    if (email) {
      await prisma.otp.deleteMany({ where: { email, type } });
    }
    if (phone) {
      await prisma.otp.deleteMany({ where: { phone, type } });
    }

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otp.create({
      data: {
        email: email || null,
        phone: phone || null,
        code,
        type,
        expiresAt,
      },
    });

    // Log OTP (in dev mode, shows actual code for testing)
    otpLogger.sent(email || phone || '', type, code);

    // Send OTP via SMS or Email
    if (phone) {
      const smsResult = await smsService.sendOtpForPhotographer(phone, code, type as 'signup' | 'login' | 'password_reset');
      if (!smsResult.success) {
        logger.error('[OTP] Failed to send SMS', { phone, error: smsResult.message });
        // Don't throw error - OTP is still saved, user can see it in dev logs
      }
    }

    // TODO: Add email sending via email service when email is provided

    return { message: `OTP sent to ${email || phone}`, expiresIn: 600 };
  }

  async verifyOtp(data: VerifyOtpDto) {
    const { email, phone, otp, type } = data;
    const target = email || phone || '';

    const otpRecord = await prisma.otp.findFirst({
      where: {
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        type,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      otpLogger.failed(target, type, 'No OTP found');
      throw new BadRequestError('No OTP found. Please request a new one.');
    }

    if (otpRecord.attempts >= 3) {
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      otpLogger.failed(target, type, 'Too many attempts');
      throw new BadRequestError('Too many attempts. Please request a new OTP.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      otpLogger.failed(target, type, 'OTP expired');
      throw new BadRequestError('OTP has expired. Please request a new one.');
    }

    if (otpRecord.code !== otp) {
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      otpLogger.failed(target, type, 'Invalid OTP');
      throw new BadRequestError('Invalid OTP');
    }

    // Mark as verified and delete the OTP
    await prisma.otp.delete({ where: { id: otpRecord.id } });

    otpLogger.verified(target, type);

    // For login type, find user and return token
    if (type === 'login') {
      const photographer = await prisma.photographer.findFirst({
        where: {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!photographer) {
        throw new BadRequestError('User not found. Please sign up first.');
      }

      const token = this.generateToken(photographer.id, photographer.email || photographer.phone || '');
      return { verified: true, message: 'Login successful', token, user: photographer };
    }

    return { verified: true, message: 'OTP verified successfully' };
  }

  async register(data: RegisterDto) {
    const { email, phone, password, name, phoneVerified } = data;

    // Check for existing user
    if (email) {
      const existing = await prisma.photographer.findUnique({ where: { email } });
      if (existing) throw new ConflictError('Email already registered');
    }
    if (phone) {
      const existing = await prisma.photographer.findFirst({ where: { phone } });
      if (existing) throw new ConflictError('Phone number already registered');
    }

    // For phone signup, verify that OTP was verified
    if (phone && !email && !phoneVerified) {
      throw new BadRequestError('Phone verification required');
    }

    const passwordHash = await bcrypt.hash(password, AUTH.SALT_ROUNDS);

    const photographer = await prisma.photographer.create({
      data: {
        email: email || null,
        phone: phone || null,
        passwordHash,
        name,
        emailVerified: !!email, // Email users are verified via OTP during signup
        phoneVerified: !!phoneVerified,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        subscription: true,
        createdAt: true,
      },
    });

    // Clean up OTPs
    if (phone) {
      await prisma.otp.deleteMany({ where: { phone, type: 'signup' } });
    }
    if (email) {
      await prisma.otp.deleteMany({ where: { email, type: 'signup' } });
    }

    const token = this.generateToken(photographer.id, photographer.email || photographer.phone || '');

    return { photographer, token };
  }

  async login(data: LoginDto) {
    const photographer = await prisma.photographer.findUnique({
      where: { email: data.email },
    });

    if (!photographer) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!photographer.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(data.password, photographer.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(photographer.id, photographer.email);

    const { passwordHash: _, ...photographerData } = photographer;

    return { user: photographerData, token };
  }

  async getProfile(userId: string) {
    const photographer = await prisma.photographer.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        website: true,
        instagram: true,
        phone: true,
        subscription: true,
        storageUsed: true,
        storageLimit: true,
        watermarkUrl: true,
        defaultTemplate: true,
        notificationSettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return photographer;
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const photographer = await prisma.photographer.findUnique({
      where: { id: userId },
    });

    if (!photographer) {
      throw new UnauthorizedError('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      photographer.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, AUTH.SALT_ROUNDS);

    await prisma.photographer.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private generateToken(id: string, email: string): string {
    return jwt.sign({ id, email, role: 'PHOTOGRAPHER' }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }
}

export const authService = new AuthService();

