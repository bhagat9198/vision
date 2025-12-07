/**
 * =============================================================================
 * Image Utilities
 * =============================================================================
 * Helper functions for image fetching, cropping, and manipulation.
 * Uses Sharp for high-performance image processing.
 * =============================================================================
 */

import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs/promises';
import type { BoundingBox } from '../types/index.js';
import { logger } from './logger.js';

// =============================================================================
// IMAGE FETCHING
// =============================================================================

/**
 * Fetch image from URL and return as buffer.
 *
 * @param url - Image URL to fetch
 * @param timeoutMs - Request timeout in milliseconds (default: 10000)
 * @returns Image buffer
 */
export async function fetchImageFromUrl(url: string, timeoutMs = 10000): Promise<Buffer> {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: timeoutMs,
    });

    return Buffer.from(response.data);
  } catch (error) {
    logger.error(`Failed to fetch image from URL: ${url}`, error);
    throw new Error(`Failed to fetch image: ${url}`);
  }
}

/**
 * Read image from filesystem path.
 *
 * @param path - Path to image file
 * @returns Image buffer
 */
export async function readImageFromPath(path: string): Promise<Buffer> {
  try {
    return await fs.readFile(path);
  } catch (error) {
    logger.error(`Failed to read image from path: ${path}`, error);
    throw new Error(`Failed to read image: ${path}`);
  }
}

// =============================================================================
// IMAGE CROPPING
// =============================================================================

/**
 * Crop a face from an image with padding.
 *
 * @param imageBuffer - Source image buffer
 * @param bbox - Bounding box of the face
 * @param paddingPercent - Padding to add around face (default: 0.2 = 20%)
 * @returns Cropped face image buffer
 */
export async function cropFace(
  imageBuffer: Buffer,
  bbox: BoundingBox,
  paddingPercent = 0.2
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  // Calculate padding
  const paddingX = Math.round(bbox.width * paddingPercent);
  const paddingY = Math.round(bbox.height * paddingPercent);

  // Calculate crop region with padding (clamped to image bounds)
  const left = Math.max(0, bbox.x - paddingX);
  const top = Math.max(0, bbox.y - paddingY);
  const right = Math.min(metadata.width, bbox.x + bbox.width + paddingX);
  const bottom = Math.min(metadata.height, bbox.y + bbox.height + paddingY);

  const width = right - left;
  const height = bottom - top;

  // Crop the face region
  return await image
    .extract({
      left,
      top,
      width,
      height,
    })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// =============================================================================
// IMAGE RESIZING
// =============================================================================

/**
 * Resize image to maximum dimension while maintaining aspect ratio.
 *
 * @param imageBuffer - Source image buffer
 * @param maxDimension - Maximum width or height
 * @returns Resized image buffer
 */
export async function resizeImage(imageBuffer: Buffer, maxDimension: number): Promise<Buffer> {
  return await sharp(imageBuffer)
    .resize(maxDimension, maxDimension, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Get image dimensions.
 *
 * @param imageBuffer - Image buffer
 * @returns Width and height
 */
export async function getImageDimensions(
  imageBuffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

/**
 * Convert image to JPEG format.
 *
 * @param imageBuffer - Source image buffer
 * @param quality - JPEG quality (1-100)
 * @returns JPEG image buffer
 */
export async function toJpeg(imageBuffer: Buffer, quality = 90): Promise<Buffer> {
  return await sharp(imageBuffer).jpeg({ quality }).toBuffer();
}

