/**
 * =============================================================================
 * Express Application
 * =============================================================================
 * Main Express app configuration with middleware and routes.
 * =============================================================================
 */

import express, { type Express, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { healthRoutes, indexRoutes, searchRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { requireOrgAuth, requireOrgSettings } from './middleware/org-auth.js';
import { logger } from './utils/logger.js';
import { orgRoutes } from './modules/org/index.js';
import { apiKeyRoutes } from './modules/api-key/index.js';
import { swaggerSpec } from './config/swagger.js';

// =============================================================================
// CREATE APP
// =============================================================================

/**
 * Create and configure Express application.
 */
export function createApp(): Express {
  const app = express();

  // ==========================================================================
  // MIDDLEWARE
  // ==========================================================================

  // Security headers
  app.use(helmet());

  // CORS - allow requests from clients
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-key', 'x-api-key', 'x-master-key'],
  }));

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // ==========================================================================
  // ROUTES
  // ==========================================================================

  // Swagger documentation (no auth required)
  app.use(
    '/api-docs',
    swaggerUi.serve as unknown as RequestHandler[],
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Image Analysis API Docs',
    }) as unknown as RequestHandler
  );

  // Swagger JSON spec
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Health routes (no auth required)
  app.use('/health', healthRoutes);

  // Organization management routes
  app.use('/orgs', orgRoutes);

  // API key management routes (nested under orgs)
  app.use('/orgs/:orgId/api-keys', apiKeyRoutes);

  // API routes (org auth required)
  // Index routes require CompreFace to be configured
  app.use('/api/v1/index', requireOrgAuth, requireOrgSettings('comprefaceUrl', 'comprefaceRecognitionApiKey'), indexRoutes);
  // Search routes require CompreFace to be configured
  app.use('/api/v1/search', requireOrgAuth, requireOrgSettings('comprefaceUrl', 'comprefaceRecognitionApiKey'), searchRoutes);

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

