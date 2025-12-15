/**
 * =============================================================================
 * Thumbnail Service
 * =============================================================================
 * Generates face thumbnails by cropping bounding box regions from images.
 * Uses Sharp for efficient image processing.
 * =============================================================================
 */

import sharp from 'sharp';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

// =============================================================================
// TYPES
// =============================================================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThumbnailOptions {
  size?: number;       // Target size (default: 150px)
  padding?: number;    // Padding around face (default: 0.2 = 20%)
  format?: 'jpeg' | 'webp' | 'png';
  quality?: number;    // JPEG/WebP quality (default: 80)
}

export interface ThumbnailResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  size: 150,
  padding: 0.2,
  format: 'jpeg',
  quality: 80,
};

// =============================================================================
// THUMBNAIL SERVICE
// =============================================================================

class ThumbnailService {
  /**
   * Generate a face thumbnail from an image buffer or URL.
   */
  async generateThumbnail(
    imageSource: Buffer | string,
    bbox: BoundingBox,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    try {
      // Get image buffer
      let imageBuffer: Buffer;
      if (Buffer.isBuffer(imageSource)) {
        imageBuffer = imageSource;
      } else if (imageSource.startsWith('http')) {
        // Fetch from URL
        const response = await fetch(imageSource);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // Local file path
        imageBuffer = await fs.readFile(imageSource);
      }

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const imgWidth = metadata.width || 1;
      const imgHeight = metadata.height || 1;

      // Calculate padded bounding box
      const padX = bbox.width * opts.padding;
      const padY = bbox.height * opts.padding;

      const left = Math.max(0, Math.floor(bbox.x - padX));
      const top = Math.max(0, Math.floor(bbox.y - padY));
      const width = Math.min(imgWidth - left, Math.ceil(bbox.width + padX * 2));
      const height = Math.min(imgHeight - top, Math.ceil(bbox.height + padY * 2));

      // Extract and resize the face region
      let pipeline = sharp(imageBuffer)
        .extract({ left, top, width, height })
        .resize(opts.size, opts.size, { fit: 'cover', position: 'center' });

      // Apply format
      if (opts.format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: opts.quality });
      } else if (opts.format === 'webp') {
        pipeline = pipeline.webp({ quality: opts.quality });
      } else {
        pipeline = pipeline.png();
      }

      const buffer = await pipeline.toBuffer();

      return {
        buffer,
        width: opts.size,
        height: opts.size,
        format: opts.format,
      };
    } catch (error) {
      logger.error('[THUMBNAIL] Failed to generate thumbnail:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnails for multiple faces in an image.
   */
  async generateBatchThumbnails(
    imageSource: Buffer | string,
    bboxes: BoundingBox[],
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult[]> {
    // Load image once
    let imageBuffer: Buffer;
    if (Buffer.isBuffer(imageSource)) {
      imageBuffer = imageSource;
    } else if (imageSource.startsWith('http')) {
      const response = await fetch(imageSource);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      imageBuffer = await fs.readFile(imageSource);
    }

    // Generate thumbnails in parallel
    const results = await Promise.all(
      bboxes.map(bbox => this.generateThumbnail(imageBuffer, bbox, options))
    );

    return results;
  }

  /**
   * Get thumbnail as base64 data URL.
   */
  async getThumbnailDataUrl(
    imageSource: Buffer | string,
    bbox: BoundingBox,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const result = await this.generateThumbnail(imageSource, bbox, options);
    const mimeType = result.format === 'png' ? 'image/png' : 
                     result.format === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mimeType};base64,${result.buffer.toString('base64')}`;
  }
}

export const thumbnailService = new ThumbnailService();

