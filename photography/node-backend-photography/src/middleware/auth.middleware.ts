import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AppError } from '../common/exceptions/AppError.js';

export interface AuthPayload {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', StatusCodes.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Invalid token format', StatusCodes.UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    // If Client, bypass database check (ephemeral user)
    if (decoded.role === 'CLIENT') {
      req.user = decoded;
      return next();
    }

    // Verify user exists and is active
    const photographer = await prisma.photographer.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, isActive: true },
    });

    if (!photographer || !photographer.isActive) {
      throw new AppError('User not found or inactive', StatusCodes.UNAUTHORIZED);
    }

    req.user = { id: photographer.id, email: photographer.email || '', role: 'PHOTOGRAPHER' };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', StatusCodes.UNAUTHORIZED));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', StatusCodes.UNAUTHORIZED));
      return;
    }
    next(error);
  }
};

// Optional auth - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    // If Client, bypass database check
    if (decoded.role === 'CLIENT') {
      req.user = decoded;
      return next();
    }

    const photographer = await prisma.photographer.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, isActive: true },
    });

    if (photographer && photographer.isActive) {
      req.user = { id: photographer.id, email: photographer.email || '', role: 'PHOTOGRAPHER' };
    }

    next();
  } catch {
    // Silently fail for optional auth
    next();
  }
};

