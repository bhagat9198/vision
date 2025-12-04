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

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

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

// API routes
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/super-admin`, superAdminRouter);
app.use(`${API_PREFIX}/photographers`, photographerRouter);
app.use(`${API_PREFIX}/events`, eventRouter);
app.use(`${API_PREFIX}/albums`, albumRouter);
app.use(`${API_PREFIX}/photos`, photoRouter);
app.use(`${API_PREFIX}/comments`, commentRouter);
app.use(`${API_PREFIX}/config`, configRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };

