import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Add BigInt serialization support for JSON
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';

// Import routes
import { authRouter } from './modules/auth/auth.routes.js';
import { superAdminRouter } from './modules/super-admin/super-admin.routes.js';
import { photographerRouter } from './modules/photographers/photographer.routes.js';
import { eventRouter } from './modules/events/event.routes.js';
import { albumRouter } from './modules/albums/album.routes.js';
import { photoRouter } from './modules/photos/photo.routes.js';
import { commentRouter } from './modules/comments/comment.routes.js';
import configRouter from './modules/config/config.routes.js';
import { uploadRouter } from './modules/uploads/upload.routes.js';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded cross-origin
}));
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// ============ RATE LIMITING (Route-specific) ============

// Strict limit for auth routes - prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes for login/register/otp
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown', // Rate limit by IP
});

// Very high limit for upload routes - photographers upload many files
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5000, // 5000 requests per minute (enough for 1000s of chunk uploads)
  message: { error: 'Upload rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Super admin routes - moderate limit
const superAdminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limit for authenticated users - reasonable limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute for general API
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Serve static files (robots.txt)
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes with route-specific rate limiting
const API_PREFIX = '/api/v1';

// Auth routes - strict rate limit (brute force protection)
app.use(`${API_PREFIX}/auth`, authLimiter, authRouter);

// Super admin routes - moderate limit
app.use(`${API_PREFIX}/super-admin`, superAdminLimiter, superAdminRouter);

// Upload routes - very high limit (thousands of chunks)
app.use(`${API_PREFIX}/uploads`, uploadLimiter, uploadRouter);

// General API routes - standard limit
app.use(`${API_PREFIX}/photographers`, apiLimiter, photographerRouter);
app.use(`${API_PREFIX}/events`, apiLimiter, eventRouter);
app.use(`${API_PREFIX}/albums`, apiLimiter, albumRouter);
app.use(`${API_PREFIX}/photos`, apiLimiter, photoRouter);
app.use(`${API_PREFIX}/comments`, apiLimiter, commentRouter);
app.use(`${API_PREFIX}/config`, apiLimiter, configRouter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads/storage')));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };

