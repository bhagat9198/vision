import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-123';
const SALT_ROUNDS = 10;

// Schemas
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const setupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
});

export class AuthService {
    /**
     * Check if any users exist (for setup route)
     */
    async hasUsers(): Promise<boolean> {
        const count = await prisma.user.count();
        return count > 0;
    }

    /**
     * Create the first admin user
     */
    async createFirstUser(data: z.infer<typeof setupSchema>) {
        const hasUsers = await this.hasUsers();
        if (hasUsers) {
            throw new Error('Setup already completed');
        }

        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: 'admin',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        const token = this.generateToken(user.id);

        return { user, token };
    }

    /**
     * Login user
     */
    async login(data: z.infer<typeof loginSchema>) {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(data.password, user.password);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user.id);

        const { password: _, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    /**
     * Generate JWT
     */
    private generateToken(userId: string): string {
        return jwt.sign({ userId, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    }

    /**
     * Create user (if needed later for non-setup creation)
     */
    async createUser(data: z.infer<typeof setupSchema>) {
        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: 'admin',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });
        return user;
    }
}

export const authService = new AuthService();
