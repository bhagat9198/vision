import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AUTH } from '../../config/constants.js';
import { ConflictError, UnauthorizedError } from '../../common/exceptions/AppError.js';
import type { SuperAdminSetupDto, SuperAdminLoginDto, SuperAdminChangePasswordDto } from './super-admin.dto.js';

export class SuperAdminService {
  async checkExists() {
    const superAdmin = await prisma.superAdmin.findFirst();
    return { exists: !!superAdmin };
  }

  async setup(data: SuperAdminSetupDto) {
    // Check if super admin already exists
    const existing = await prisma.superAdmin.findFirst();

    if (existing) {
      throw new ConflictError('Super admin already exists. Setup can only be done once.');
    }

    const passwordHash = await bcrypt.hash(data.password, AUTH.SALT_ROUNDS);

    const superAdmin = await prisma.superAdmin.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(superAdmin.id, superAdmin.email);

    return { superAdmin, token };
  }

  async login(data: SuperAdminLoginDto) {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email: data.email },
    });

    if (!superAdmin) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!superAdmin.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(data.password, superAdmin.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(superAdmin.id, superAdmin.email);

    const { passwordHash: _, ...superAdminData } = superAdmin;

    return { superAdmin: superAdminData, token };
  }

  async getProfile(userId: string) {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return superAdmin;
  }

  async changePassword(userId: string, data: SuperAdminChangePasswordDto) {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: userId },
    });

    if (!superAdmin) {
      throw new UnauthorizedError('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      superAdmin.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, AUTH.SALT_ROUNDS);

    await prisma.superAdmin.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private generateToken(id: string, email: string): string {
    return jwt.sign({ id, email, role: 'SUPER_ADMIN' }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }
}

export const superAdminService = new SuperAdminService();

