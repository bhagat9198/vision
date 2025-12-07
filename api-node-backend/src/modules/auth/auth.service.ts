import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AUTH } from '../../config/constants.js';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../common/exceptions/AppError.js';
import { otpLogger, logger } from '../../common/utils/logger.js';
import { smsService } from '../../common/services/sms.service.js';
import { emailService } from '../../common/services/email.service.js';
import { configService } from '../config/config.service.js';
import type { RegisterDto, LoginDto, ChangePasswordDto, SendOtpDto, VerifyOtpDto } from './auth.dto.js';

export class AuthService {
  // Generate 6-digit OTP
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate unique username from name or random string
  private generateUsername(name: string): string {
    // Clean name: lowercase, replace spaces with underscores, remove special chars
    const baseName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 20);
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return baseName ? `${baseName}_${randomSuffix}` : `user_${randomSuffix}`;
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

    // Send OTP via Email
    if (email) {
      const emailResult = await emailService.sendOtpForPhotographer(email, code, type as 'signup' | 'login' | 'password_reset');
      if (!emailResult.success) {
        logger.error('[OTP] Failed to send Email', { email, error: emailResult.message });
        // Don't throw error - OTP is still saved, user can see it in dev logs
      }
    }

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
    const { email, phone, password, name, phoneVerified, emailVerified } = data;

    // Check for existing user
    if (email) {
      const existing = await prisma.photographer.findUnique({ where: { email } });
      if (existing) throw new ConflictError('Email already registered');
    }
    if (phone) {
      const existing = await prisma.photographer.findFirst({ where: { phone } });
      if (existing) throw new ConflictError('Phone number already registered');
    }

    // Check if verification is required (from admin config)
    const emailVerificationRequired = await configService.get('photographer_email_verification_enabled') === 'true';
    const phoneAuthEnabled = await configService.get('photographer_phone_auth_enabled') === 'true';

    // For phone signup, verify that OTP was verified (if phone auth is enabled)
    if (phone && !email && phoneAuthEnabled && !phoneVerified) {
      throw new BadRequestError('Phone verification required');
    }

    // For email signup, verify that OTP was verified (if email verification is enabled)
    if (email && emailVerificationRequired && !emailVerified) {
      throw new BadRequestError('Email verification required. Please verify your email with OTP first.');
    }

    const passwordHash = await bcrypt.hash(password, AUTH.SALT_ROUNDS);

    // Generate unique username
    let username = this.generateUsername(name);
    // Ensure uniqueness (in rare collision case)
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.photographer.findUnique({ where: { username } });
      if (!existing) break;
      username = this.generateUsername(name);
      attempts++;
    }

    const photographer = await prisma.photographer.create({
      data: {
        username,
        email: email || null,
        phone: phone || null,
        passwordHash,
        name,
        emailVerified: !!emailVerified || !emailVerificationRequired, // Mark verified if OTP verified or not required
        phoneVerified: !!phoneVerified || !phoneAuthEnabled,
      },
      select: {
        id: true,
        username: true,
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
        username: true,
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

  async updateProfile(userId: string, data: { username?: string; name?: string; bio?: string; website?: string; instagram?: string; phone?: string }) {
    // If username is being updated, check it's unique
    if (data.username) {
      const existing = await prisma.photographer.findFirst({
        where: { username: data.username, id: { not: userId } },
      });
      if (existing) throw new ConflictError('Username already taken');

      // Validate username format (alphanumeric and underscores only)
      if (!/^[a-z0-9_]{3,30}$/.test(data.username)) {
        throw new BadRequestError('Username must be 3-30 characters, lowercase letters, numbers, and underscores only');
      }
    }

    const photographer = await prisma.photographer.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        website: true,
        instagram: true,
        phone: true,
        subscription: true,
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

