/**
 * =============================================================================
 * Video Processor Service
 * =============================================================================
 * Handles video file processing using ffmpeg.
 * - Extracts frames at regular intervals
 * - Gets video metadata (duration, resolution)
 * =============================================================================
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

interface VideoMetadata {
    duration: number; // in seconds
    width: number;
    height: number;
}

interface ExtractedFrame {
    timestamp: number;
    path: string;
}

export class VideoProcessorService {
    /**
     * Get video metadata
     */
    async getMetadata(videoPath: string): Promise<VideoMetadata> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    logger.error('Error getting video metadata:', err);
                    return reject(err);
                }

                const stream = metadata.streams.find(s => s.codec_type === 'video');
                const duration = metadata.format.duration || 0;

                resolve({
                    duration,
                    width: stream?.width || 0,
                    height: stream?.height || 0,
                });
            });
        });
    }

    /**
     * Extract frames from video at specified interval
     * @param videoPath Path to video file
     * @param intervalSeconds Interval between frames (e.g. 1.0 for every second)
     * @returns List of extracted frames with timestamps
     */
    async extractFrames(videoPath: string, intervalSeconds: number = 1.0): Promise<ExtractedFrame[]> {
        const tempDir = path.join(os.tmpdir(), `frames-${uuidv4()}`);
        await fs.promises.mkdir(tempDir, { recursive: true });

        logger.debug(`Extracting frames from ${videoPath} to ${tempDir}`);

        return new Promise((resolve, reject) => {
            const frames: ExtractedFrame[] = [];

            ffmpeg(videoPath)
                .on('end', async () => {
                    logger.debug('Frame extraction completed');

                    // Read directory to get all files
                    try {
                        const files = await fs.promises.readdir(tempDir);
                        for (const file of files) {
                            if (file.endsWith('.jpg')) {
                                // Filename format: frame-TIMESTAMP.jpg (we need to ensure this matches outputOptions)
                                // Actually, typically ffmpeg outputs sequences like frame-001.jpg
                                // Let's parse the timestamp from the filename if we use a smart naming pattern
                                // OR we just calculate it based on index * interval if fps is constant.
                                // A safer way for "1 frame per second" using fps filter:

                                // Simple parsing: frame-1.jpg -> 1st frame.
                            }
                        }

                        // Correction: fluent-ffmpeg output naming is usually sequential.
                        // We will trust the output order corresponds to timestamps.
                        const sortedFiles = files.sort((a, b) => {
                            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                            return numA - numB;
                        });

                        const result = sortedFiles.map((file, index) => ({
                            path: path.join(tempDir, file),
                            timestamp: index * intervalSeconds,
                        }));

                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                })
                .on('error', (err) => {
                    logger.error('Frame extraction error:', err);
                    reject(err);
                })
                .outputOptions([
                    `-vf fps=1/${intervalSeconds}`, // Extract 1 frame every X seconds
                    '-q:v 2' // High quality jpg
                ])
                .output(path.join(tempDir, 'frame-%d.jpg'))
                .run();
        });
    }

    /**
     * Clean up temporary frames
     */
    async cleanupFrames(frames: ExtractedFrame[]): Promise<void> {
        if (!frames || frames.length === 0) return;

        // Safety check ensuring path exists
        if (!frames[0]?.path) return;

        const dir = path.dirname(frames[0].path);
        try {
            await fs.promises.rm(dir, { recursive: true, force: true });
        } catch (error) {
            logger.warn(`Failed to cleanup temp frames at ${dir}:`, error);
        }
    }
}

export const videoProcessorService = new VideoProcessorService();
