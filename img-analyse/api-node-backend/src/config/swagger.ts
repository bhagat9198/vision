/**
 * =============================================================================
 * Swagger Configuration
 * =============================================================================
 * OpenAPI configuration for api-node-backend
 * =============================================================================
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PICS Backend API',
            version: '1.0.0',
            description: `
PICS Photo Gallery Platform API.

## Authentication
Authentication is handled via JWT tokens.
Some endpoints require authentication, others are public.

### Bearer Token
Include the token in the Authorization header:
\`Authorization: Bearer <your-token>\`
      `,
        },
        servers: [
            {
                url: `http://localhost:${env.PORT}`,
                description: 'Development server',
            },
            {
                url: 'https://api.pics.com/api/v1',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                // Generic Responses
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        statusCode: { type: 'integer' },
                    },
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                    },
                },

                // Auth Schemas (from previous step)
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        role: { type: 'string', enum: ['USER', 'PHOTOGRAPHER', 'ADMIN', 'SUPER_ADMIN'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                token: { type: 'string' },
                            },
                        },
                    },
                },

                // Album Schemas
                Album: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        eventId: { type: 'string', format: 'uuid' },
                        coverPhotoId: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                AlbumResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { $ref: '#/components/schemas/Album' },
                    },
                },
                AlbumListResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Album' },
                        },
                    },
                },

                // Event Schemas
                Event: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        date: { type: 'string', format: 'date-time' },
                        location: { type: 'string' },
                        description: { type: 'string' },
                        coverPhotoId: { type: 'string', nullable: true },
                    },
                },
                EventResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { $ref: '#/components/schemas/Event' },
                    },
                },
                EventListResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Event' },
                        },
                    },
                },

                // Photo Schemas
                Photo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        url: { type: 'string' },
                        thumbnailUrl: { type: 'string' },
                        albumId: { type: 'string', format: 'uuid' },
                        photographerId: { type: 'string', format: 'uuid' },
                        width: { type: 'integer' },
                        height: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                PhotoResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { $ref: '#/components/schemas/Photo' },
                    },
                },
                PhotoListResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Photo' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer' },
                                limit: { type: 'integer' },
                                total: { type: 'integer' },
                            },
                        },
                    },
                },

                // Comment Schemas
                Comment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        content: { type: 'string' },
                        photoId: { type: 'string', format: 'uuid' },
                        authorName: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                CommentListResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Comment' },
                        },
                    },
                },

                // Config Schemas
                AuthConfig: {
                    type: 'object',
                    properties: {
                        allowSignup: { type: 'boolean' },
                        requireEmailVerification: { type: 'boolean' },
                    },
                },
                Template: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        content: { type: 'string' },
                    },
                },
                TemplateListResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Template' },
                        },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management' },
            { name: 'Albums', description: 'Album management' },
            { name: 'Events', description: 'Event management' },
            { name: 'Photos', description: 'Photo management' },
            { name: 'Comments', description: 'Photo comments' },
            { name: 'Config', description: 'System configuration' },
            { name: 'Photographers', description: 'Photographer management' },
        ],
    },
    apis: ['./src/modules/**/*.routes.ts'], // Path to the API docs
};


export const swaggerSpec = swaggerJsdoc(options);
