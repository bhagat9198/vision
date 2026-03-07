import type { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import type { ApiResponse } from '../types/index.js';

/**
 * =============================================================================
 * Images Controller
 * =============================================================================
 * Handles serving of image files.
 * =============================================================================
 */

export const imagesController = {
    /**
     * Serve an image file by its photo ID.
     * This is needed because images are stored outside the public directory.
     */
    async viewImage(req: Request, res: Response): Promise<void> {
        try {
            const { photoId } = req.params;

            if (!photoId) {
                res.status(400).json({
                    success: false,
                    error: 'photoId is required',
                } as ApiResponse);
                return;
            }

            // 1. Get image info from DB
            const image = await prisma.eventImageStatus.findFirst({
                where: { photoId },
                select: { imageUrl: true, status: true }
            });

            if (!image) {
                res.status(404).json({
                    success: false,
                    error: 'Image not found',
                } as ApiResponse);
                return;
            }

            if (!image.imageUrl) {
                res.status(404).json({
                    success: false,
                    error: 'Image file not available',
                } as ApiResponse);
                return;
            }

            // 2. Resolve file path
            // imageUrl in DB stores the absolute path to the file
            const filePath = image.imageUrl;

            // 3. Check if file exists
            try {
                await fs.promises.access(filePath, fs.constants.R_OK);
            } catch (err) {
                logger.error(`Image file missing for photo ${photoId}: ${filePath}`, err);
                res.status(404).json({
                    success: false,
                    error: 'Image file missing from storage',
                } as ApiResponse);
                return;
            }

            // 4. Send file
            res.sendFile(filePath, (err) => {
                if (err) {
                    logger.error(`Error sending file for photo ${photoId}:`, err);
                    if (!res.headersSent) {
                        res.status(500).end();
                    }
                }
            });

        } catch (error) {
            logger.error('Failed to view image:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to view image',
            } as ApiResponse);
        }
    }
};
