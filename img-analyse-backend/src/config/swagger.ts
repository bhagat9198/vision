/**
 * =============================================================================
 * Swagger Configuration
 * =============================================================================
 * OpenAPI/Swagger documentation setup for img-analyse-backend.
 * =============================================================================
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Image Analysis Backend API',
      version: '1.0.0',
      description: `
Multi-tenant face detection and search service.

## Authentication

All API endpoints (except health checks) require authentication via API key.

### Organization API Key
Include in header: \`x-api-key: img_xxxxxxxx\`

### Master API Key (Admin only)
Include in header: \`x-master-key: your-master-key\`
Required for organization registration.

## Rate Limiting
Currently no rate limiting is enforced.
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Organization API key (format: img_xxxxxxxx)',
        },
        MasterKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-master-key',
          description: 'Master API key for admin operations',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['success'],
        },
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isActive: { type: 'boolean' },
            comprefaceUrl: { type: 'string', nullable: true },
            faceDetectionMode: { type: 'string', enum: ['RECOGNITION_ONLY', 'DETECTION_THEN_RECOGNITION'] },
            imageSourceMode: { type: 'string', enum: ['URL', 'SHARED_STORAGE'] },
            minConfidence: { type: 'number' },
            minSizePx: { type: 'integer' },
            searchDefaultTopK: { type: 'integer' },
            searchMinSimilarity: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        FaceMatch: {
          type: 'object',
          properties: {
            photoId: { type: 'string' },
            similarity: { type: 'number' },
            confidence: { type: 'number' },
            bbox: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
          },
        },
        GroupedPhotoMatch: {
          type: 'object',
          properties: {
            photoId: { type: 'string' },
            bestSimilarity: { type: 'number' },
            matchCount: { type: 'integer' },
            faces: {
              type: 'array',
              items: { $ref: '#/components/schemas/FaceMatch' },
            },
          },
        },
        SearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sessionId: { type: 'string' },
            totalMatches: { type: 'integer' },
            matches: {
              type: 'array',
              items: { $ref: '#/components/schemas/GroupedPhotoMatch' },
            },
            searchTimeMs: { type: 'number' },
          },
        },
        IndexPhotoResult: {
          type: 'object',
          properties: {
            photoId: { type: 'string' },
            eventId: { type: 'string' },
            facesDetected: { type: 'integer' },
            facesIndexed: { type: 'integer' },
            facesRejected: { type: 'integer' },
            processingTimeMs: { type: 'number' },
            detectorsUsed: {
              type: 'array',
              items: { type: 'string', enum: ['compreface', 'yunet', 'scrfd'] },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Organizations', description: 'Organization management' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Indexing', description: 'Photo face indexing' },
      { name: 'Search', description: 'Face search operations' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

