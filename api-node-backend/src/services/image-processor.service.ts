import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../config/database.js';
import { UploadFileStatus, UploadSessionStatus, AspectRatio } from '../lib/prisma.js';
import { configService } from '../modules/config/config.service.js';
import { storageService } from './storage.service.js';
import { faceAnalysisClient } from './face-analysis.client.js';
import { logger } from '../common/utils/logger.js';
import type { ImageProcessingJobData } from '../queues/image-processing.queue.js';

const TEMP_UPLOAD_DIR = './uploads/temp';

export class ImageProcessor {
  // Check if mimeType is a video
  private isVideo(mimeType: string): boolean {
    return mimeType.toLowerCase().startsWith('video/') ||
      mimeType.toLowerCase().includes('quicktime') ||
      mimeType.toLowerCase().includes('mp4') ||
      mimeType.toLowerCase().includes('mov') ||
      mimeType.toLowerCase().includes('avi') ||
      mimeType.toLowerCase().includes('webm');
  }

  // Main processing function
  async processUploadedFile(data: ImageProcessingJobData) {
    const { sessionId, fileId, photographerId, eventId, albumId, originalName, mimeType } = data;

    try {
      // Update status to processing
      await prisma.uploadFile.update({
        where: { id: fileId },
        data: { status: UploadFileStatus.PROCESSING },
      });

      // 1. Get event displayId and watermark settings for folder naming
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { displayId: true, slug: true, watermarkEnabled: true, watermarkText: true },
      });
      if (!event) throw new Error(`Event not found: ${eventId}`);
      const eventDisplayId = event.displayId;

      // 2. Merge chunks into single file
      const mergedFilePath = await this.mergeChunks(sessionId, fileId);

      // Check if this is a video file - handle differently
      if (this.isVideo(mimeType)) {
        // Fetch dependencies for video processing
        const orgId = await configService.getOrganizationId();
        const photographer = await prisma.photographer.findUnique({
          where: { id: photographerId },
          select: { displayId: true }
        });
        if (!photographer) throw new Error(`Photographer not found: ${photographerId}`);

        // Fetch Album Display ID if exists
        let albumDisplayId = '';
        if (albumId) {
          const album = await prisma.album.findUnique({
            where: { id: albumId },
            select: { displayId: true }
          });
          if (album) {
            albumDisplayId = `/${album.displayId}`;
          }
        }

        return await this.processVideoFile({
          sessionId, fileId, eventId, albumId, eventDisplayId: String(eventDisplayId), originalName, mimeType, mergedFilePath,
          orgId, photographerDisplayId: photographer.displayId, albumDisplayId
        });
      }

      // 3. Convert HEIC to JPEG if needed
      const processedFilePath = await this.convertToJpeg(mergedFilePath, mimeType);

      // 4. Get image metadata
      const metadata = await this.getImageMetadata(processedFilePath);

      // 5. Generate thumbnail
      const thumbnailConfig = await configService.getThumbnailConfig();
      const thumbnailBuffer = await this.generateThumbnail(processedFilePath, thumbnailConfig);

      // 6. Apply watermark if enabled (event setting takes precedence)
      const photographer = await prisma.photographer.findUnique({
        where: { id: photographerId },
        select: { displayId: true, watermarkEnabled: true, watermarkUrl: true, watermarkText: true, watermarkPosition: true, watermarkOpacity: true, watermarkScale: true },
      });
      if (!photographer) throw new Error(`Photographer not found: ${photographerId}`);

      let finalImageBuffer = await fs.readFile(processedFilePath);
      // Use event's watermark setting if available, otherwise fall back to photographer's setting
      const watermarkEnabled = event.watermarkEnabled ?? photographer?.watermarkEnabled;

      if (watermarkEnabled && photographer) {
        // Priority: 1. Event watermark text, 2. Photographer image watermark, 3. Photographer text watermark, 4. Default config text
        if (event.watermarkText) {
          finalImageBuffer = (await this.applyTextWatermark(processedFilePath, event.watermarkText, photographer)) as any;
        } else if (photographer.watermarkUrl) {
          finalImageBuffer = (await this.applyImageWatermark(processedFilePath, photographer)) as any;
        } else if (photographer.watermarkText) {
          finalImageBuffer = (await this.applyTextWatermark(processedFilePath, photographer.watermarkText, photographer)) as any;
        } else {
          // Use default watermark text from config
          const defaultWatermarkText = await configService.get('watermark_default_text', '');
          if (defaultWatermarkText) {
            finalImageBuffer = (await this.applyTextWatermark(processedFilePath, defaultWatermarkText, photographer)) as any;
          }
        }
      }

      // 7. Upload to storage (local or S3) using structured path
      const storageConfig = await configService.getStorageConfig();
      const orgId = await configService.getOrganizationId();

      // Fetch Album Display ID if exists
      let albumDisplayId = '';
      if (albumId) {
        const album = await prisma.album.findUnique({
          where: { id: albumId },
          select: { displayId: true }
        });
        if (album) {
          albumDisplayId = `/${album.displayId}`;
        }
      }

      // Structure: orgId/photographerDisplayId/eventDisplayId/[albumDisplayId]/fileId.jpg
      const fileKey = `${orgId}/${photographer.displayId}/${eventDisplayId}${albumDisplayId}/${fileId}`;
      const thumbnailKey = `${orgId}/${photographer.displayId}/${eventDisplayId}${albumDisplayId}/thumbnails/${fileId}`;

      const [photoUrl, thumbnailUrl] = await Promise.all([
        storageService.uploadFile(finalImageBuffer, `${fileKey}.jpg`, 'image/jpeg'),
        storageService.uploadFile(thumbnailBuffer, `${thumbnailKey}.jpg`, 'image/jpeg'),
      ]);

      // 8. Create photo record in database
      const photo = await prisma.photo.create({
        data: {
          url: photoUrl,
          thumbnail: thumbnailUrl,
          originalName,
          fileSize: BigInt(finalImageBuffer.length),
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.aspectRatio,
          albumId,
          eventId,
        },
      });

      // 9. Index faces in the photo (async, non-blocking)
      this.indexFacesAsync(photo.id, eventId, photoUrl, event.slug).catch((err) => {
        logger.warn(`Face indexing failed for photo ${photo.id}:`, err);
      });

      // 10. Update upload file status
      await prisma.uploadFile.update({
        where: { id: fileId },
        data: { status: UploadFileStatus.COMPLETED, photoId: photo.id },
      });

      // 11. Update session progress
      await this.updateSessionProgress(sessionId);

      // 12. Cleanup temp files
      await this.cleanupTempFiles(sessionId, fileId);

      logger.info(`Successfully processed image: ${originalName} -> Photo ID: ${photo.id}`);
      return { photoId: photo.id, url: photoUrl, thumbnail: thumbnailUrl };

    } catch (error) {
      logger.error(`Failed to process file ${fileId}:`, error);

      // Update file status to failed
      await prisma.uploadFile.update({
        where: { id: fileId },
        data: {
          status: UploadFileStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Update session failed count
      await prisma.uploadSession.update({
        where: { id: sessionId },
        data: { failedFiles: { increment: 1 } },
      });

      throw error;
    }
  }

  // Process video files - convert to MP4 for browser compatibility
  private async processVideoFile(data: {
    sessionId: string;
    fileId: string;
    eventId: string;
    albumId: string | null;
    eventDisplayId: string;
    originalName: string;
    mimeType: string;
    mergedFilePath: string;
    orgId: string;
    photographerDisplayId: number;
    albumDisplayId: string;
  }) {
    const { sessionId, fileId, eventId, albumId, eventDisplayId, originalName, mimeType, mergedFilePath, orgId, photographerDisplayId, albumDisplayId } = data;

    // Check if video needs conversion to MP4 (for browser compatibility)
    const needsConversion = mimeType.toLowerCase() !== 'video/mp4';
    let finalVideoPath = mergedFilePath;
    let finalMimeType = mimeType;

    if (needsConversion) {
      // Convert to MP4 using ffmpeg
      const mp4Path = `${mergedFilePath}.mp4`;
      const converted = await this.convertVideoToMp4(mergedFilePath, mp4Path);
      if (converted) {
        finalVideoPath = mp4Path;
        finalMimeType = 'video/mp4';
        logger.info(`Converted video to MP4: ${originalName}`);
      } else {
        logger.warn(`Failed to convert video, using original format: ${originalName}`);
      }
    }

    // Read the video file
    const videoBuffer = await fs.readFile(finalVideoPath);
    const fileStats = await fs.stat(finalVideoPath);

    // Upload to storage (local or S3) using structured path
    const ext = finalMimeType === 'video/mp4' ? 'mp4' : 'mov';
    // Structured path: orgId/photographerDisplayId/eventDisplayId/[albumDisplayId]/fileId.ext
    const fileKey = `${orgId}/${photographerDisplayId}/${eventDisplayId}${albumDisplayId}/${fileId}.${ext}`;
    const videoUrl = await storageService.uploadFile(videoBuffer, fileKey, finalMimeType);

    // Generate thumbnail from video using ffmpeg
    let thumbnailBuffer: Buffer;
    try {
      thumbnailBuffer = await this.generateVideoThumbnail(mergedFilePath);
    } catch (error) {
      logger.warn(`Failed to generate video thumbnail, using placeholder: ${error}`);
      thumbnailBuffer = await this.generateVideoPlaceholder();
    }
    const thumbnailKey = `${orgId}/${photographerDisplayId}/${eventDisplayId}${albumDisplayId}/thumbnails/${fileId}.jpg`;
    const thumbnailUrl = await storageService.uploadFile(thumbnailBuffer, thumbnailKey, 'image/jpeg');

    // Create photo record with video metadata
    const photo = await prisma.photo.create({
      data: {
        url: videoUrl,
        thumbnail: thumbnailUrl,
        originalName,
        fileSize: BigInt(fileStats.size),
        width: 1920, // Default video dimensions
        height: 1080,
        aspectRatio: AspectRatio.LANDSCAPE,
        albumId,
        eventId,
        metadata: { isVideo: true, mimeType: finalMimeType, originalMimeType: mimeType },
      },
    });

    // Update upload file status
    await prisma.uploadFile.update({
      where: { id: fileId },
      data: { status: UploadFileStatus.COMPLETED, photoId: photo.id },
    });

    // Update session progress
    await this.updateSessionProgress(sessionId);

    // Cleanup temp files (including converted file)
    await this.cleanupTempFiles(sessionId, fileId);
    if (needsConversion && finalVideoPath !== mergedFilePath) {
      try { await fs.unlink(finalVideoPath); } catch (e) { /* ignore */ }
    }

    logger.info(`Successfully processed video: ${originalName} -> Photo ID: ${photo.id}`);
    return { photoId: photo.id, url: videoUrl, thumbnail: thumbnailUrl };
  }

  // Convert video to MP4 using ffmpeg
  private async convertVideoToMp4(inputPath: string, outputPath: string): Promise<boolean> {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      logger.info(`Starting video conversion: ${inputPath} -> ${outputPath}`);

      // Use stream copy for both video and audio when possible (MUCH faster)
      // This preserves the original quality and is nearly instant
      // If copy fails, fallback to re-encoding
      const args = [
        '-i', inputPath,
        '-c:v', 'copy',      // Copy video stream (fast)
        '-c:a', 'aac',       // Re-encode audio to AAC (for compatibility)
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          logger.info(`Video conversion completed successfully (stream copy)`);
          resolve(true);
        } else {
          logger.warn(`Stream copy failed, trying re-encode: ${stderr.slice(-500)}`);
          // Fallback: re-encode with fast preset
          const reencodeArgs = [
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',  // Fastest preset
            '-crf', '28',            // Lower quality but faster
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            outputPath
          ];

          const ffmpeg2 = spawn('ffmpeg', reencodeArgs);

          ffmpeg2.on('close', (code2) => {
            if (code2 === 0) {
              logger.info(`Video re-encoding completed`);
              resolve(true);
            } else {
              logger.error(`FFmpeg re-encoding also failed`);
              resolve(false);
            }
          });

          ffmpeg2.on('error', (err) => {
            logger.error(`FFmpeg re-encode spawn error:`, err);
            resolve(false);
          });
        }
      });

      ffmpeg.on('error', (err) => {
        logger.error(`FFmpeg spawn error:`, err);
        resolve(false);
      });

      // Timeout: 10 minutes for large videos
      setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        logger.error(`FFmpeg timeout - killed process`);
        resolve(false);
      }, 600000);
    });
  }

  // Generate thumbnail from video using ffmpeg
  private async generateVideoThumbnail(videoPath: string): Promise<Buffer> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const thumbnailPath = `${videoPath}_thumb.jpg`;

    try {
      // Extract frame at 1 second mark
      await execAsync(
        `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=400:-1" -y "${thumbnailPath}"`,
        { timeout: 30000 } // 30 second timeout
      );

      const buffer = await fs.readFile(thumbnailPath);
      await fs.unlink(thumbnailPath); // Cleanup
      return buffer;
    } catch (error) {
      // If extraction at 1s fails, try at 0s
      try {
        await execAsync(
          `ffmpeg -i "${videoPath}" -ss 00:00:00 -vframes 1 -vf "scale=400:-1" -y "${thumbnailPath}"`,
          { timeout: 30000 }
        );
        const buffer = await fs.readFile(thumbnailPath);
        await fs.unlink(thumbnailPath);
        return buffer;
      } catch (e) {
        throw error;
      }
    }
  }

  // Generate a simple video placeholder thumbnail
  private async generateVideoPlaceholder(): Promise<Buffer> {
    // Create a simple gray box with "VIDEO" text as placeholder
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1f2937"/>
        <polygon points="160,120 160,280 280,200" fill="#6b7280"/>
        <text x="200" y="350" text-anchor="middle" fill="#9ca3af" font-size="24" font-family="Arial">VIDEO</text>
      </svg>
    `;
    return sharp(Buffer.from(svg))
      .resize(400, 400)
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  // Merge chunks into single file
  private async mergeChunks(sessionId: string, fileId: string): Promise<string> {
    const chunksDir = path.join(TEMP_UPLOAD_DIR, sessionId, fileId);
    const outputPath = path.join(TEMP_UPLOAD_DIR, sessionId, `${fileId}_merged`);

    const chunkFiles = await fs.readdir(chunksDir);
    const sortedChunks = chunkFiles
      .filter(f => f.startsWith('chunk_'))
      .sort((a, b) => {
        const numA = parseInt(a.split('_')[1] || '0');
        const numB = parseInt(b.split('_')[1] || '0');
        return numA - numB;
      });

    const writeStream = await fs.open(outputPath, 'w');
    try {
      for (const chunk of sortedChunks) {
        const chunkPath = path.join(chunksDir, chunk);
        const chunkData = await fs.readFile(chunkPath);
        await writeStream.write(chunkData);
      }
    } finally {
      await writeStream.close();
    }

    return outputPath;
  }

  // Convert HEIC to JPEG
  private async convertToJpeg(filePath: string, mimeType: string): Promise<string> {
    const isHeic = mimeType.toLowerCase().includes('heic') || mimeType.toLowerCase().includes('heif');

    if (!isHeic) {
      return filePath;
    }

    const outputPath = `${filePath}.jpg`;

    // Use heic-convert for HEIC files
    const heicConvert = await import('heic-convert');
    const inputBuffer = await fs.readFile(filePath);
    const outputBuffer = await heicConvert.default({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9,
    });

    await fs.writeFile(outputPath, Buffer.from(outputBuffer));
    return outputPath;
  }

  // Get image metadata
  private async getImageMetadata(filePath: string) {
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    let aspectRatio: AspectRatio = AspectRatio.LANDSCAPE;
    if (width === height) {
      aspectRatio = AspectRatio.SQUARE;
    } else if (height > width) {
      aspectRatio = AspectRatio.PORTRAIT;
    }

    return { width, height, aspectRatio };
  }

  // Generate thumbnail maintaining aspect ratio
  private async generateThumbnail(
    filePath: string,
    config: { maxDimension: number; quality: number }
  ): Promise<Buffer> {
    return sharp(filePath)
      .resize(config.maxDimension, config.maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: config.quality })
      .toBuffer();
  }

  // Apply image watermark to image
  private async applyImageWatermark(
    filePath: string,
    watermarkConfig: {
      watermarkUrl: string | null;
      watermarkPosition: string;
      watermarkOpacity: number;
      watermarkScale: number;
    }
  ): Promise<Buffer> {
    if (!watermarkConfig.watermarkUrl) {
      return fs.readFile(filePath);
    }

    const image = sharp(filePath);
    const metadata = await image.metadata();
    const imageWidth = metadata.width || 1000;

    // Calculate watermark size based on scale percentage
    const watermarkWidth = Math.round(imageWidth * (watermarkConfig.watermarkScale / 100));

    // Resize watermark
    const watermarkBuffer = await sharp(watermarkConfig.watermarkUrl)
      .resize(watermarkWidth)
      .toBuffer();

    // Calculate position
    const gravity = this.getGravityFromPosition(watermarkConfig.watermarkPosition);

    // Composite watermark onto image
    return image
      .composite([{
        input: watermarkBuffer,
        gravity,
        blend: 'over',
      }])
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  // Apply text watermark to image
  private async applyTextWatermark(
    filePath: string,
    text: string,
    watermarkConfig: {
      watermarkPosition: string;
      watermarkOpacity: number;
      watermarkScale: number;
    }
  ): Promise<Buffer> {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const imageWidth = metadata.width || 1000;
    const imageHeight = metadata.height || 1000;

    // Calculate font size based on image width and scale
    const fontSize = Math.round(imageWidth * (watermarkConfig.watermarkScale / 100) * 0.5);
    const opacity = watermarkConfig.watermarkOpacity / 100;

    // Create SVG text watermark
    const svgText = `
      <svg width="${imageWidth}" height="${imageHeight}">
        <style>
          .watermark {
            fill: rgba(255,255,255,${opacity});
            font-size: ${fontSize}px;
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
        </style>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="watermark">
          ${text.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c] || c))}
        </text>
      </svg>
    `;

    // Calculate position offset for gravity
    const gravity = this.getGravityFromPosition(watermarkConfig.watermarkPosition);

    return image
      .composite([{
        input: Buffer.from(svgText),
        gravity,
        blend: 'over',
      }])
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  private getGravityFromPosition(position: string): sharp.Gravity {
    const gravityMap: Record<string, sharp.Gravity> = {
      'TOP_LEFT': 'northwest',
      'TOP_CENTER': 'north',
      'TOP_RIGHT': 'northeast',
      'CENTER_LEFT': 'west',
      'CENTER': 'center',
      'CENTER_RIGHT': 'east',
      'BOTTOM_LEFT': 'southwest',
      'BOTTOM_CENTER': 'south',
      'BOTTOM_RIGHT': 'southeast',
    };
    return gravityMap[position] || 'southeast';
  }

  // Update session progress
  private async updateSessionProgress(sessionId: string) {
    const files = await prisma.uploadFile.findMany({
      where: { sessionId },
      select: { status: true },
    });

    const completed = files.filter(f => f.status === UploadFileStatus.COMPLETED).length;
    const failed = files.filter(f => f.status === UploadFileStatus.FAILED).length;
    const allDone = files.every(f =>
      f.status === UploadFileStatus.COMPLETED || f.status === UploadFileStatus.FAILED
    );

    await prisma.uploadSession.update({
      where: { id: sessionId },
      data: {
        processedFiles: completed,
        failedFiles: failed,
        status: allDone ? UploadSessionStatus.COMPLETED : UploadSessionStatus.PROCESSING,
      },
    });
  }

  // Cleanup temp files for a processed file
  private async cleanupTempFiles(sessionId: string, fileId: string) {
    const fileDir = path.join(TEMP_UPLOAD_DIR, sessionId, fileId);
    const mergedFile = path.join(TEMP_UPLOAD_DIR, sessionId, `${fileId}_merged`);
    const jpgFile = `${mergedFile}.jpg`;

    try {
      await fs.rm(fileDir, { recursive: true, force: true });
      await fs.unlink(mergedFile).catch(() => { });
      await fs.unlink(jpgFile).catch(() => { });
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Index faces in a photo asynchronously.
   * This is called after photo creation and runs in the background.
   * Failures are logged but don't affect the main upload flow.
   */
  private async indexFacesAsync(photoId: string, eventId: string, imageUrl: string, eventSlug: string): Promise<void> {
    try {
      const result = await faceAnalysisClient.indexPhoto({
        photoId,
        eventId,
        eventSlug,
        imageUrl,
      });

      if (result) {
        logger.info(`Face indexing complete for photo ${photoId}: ${result.facesIndexed} faces indexed, ${result.facesSkipped} skipped`);
      }
    } catch (error) {
      // Log but don't throw - face indexing is non-critical
      logger.warn(`Face indexing failed for photo ${photoId}:`, error);
    }
  }
}

export const imageProcessor = new ImageProcessor();
