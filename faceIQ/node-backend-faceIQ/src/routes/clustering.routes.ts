/**
 * =============================================================================
 * Clustering Routes
 * =============================================================================
 * Face clustering endpoints for grouping faces by person.
 * =============================================================================
 */

import { Router } from 'express';
import * as clusteringController from '../controllers/clustering.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/clustering/run:
 *   post:
 *     summary: Start a clustering job for an event
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, eventSlug]
 *             properties:
 *               eventId:
 *                 type: string
 *               eventSlug:
 *                 type: string
 *     responses:
 *       202:
 *         description: Clustering job queued
 */
router.post('/run', clusteringController.runClustering);

/**
 * @swagger
 * /api/v1/clustering/job/{jobId}:
 *   get:
 *     summary: Get clustering job status
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status
 */
router.get('/job/:jobId', clusteringController.getJobStatus);

/**
 * @swagger
 * /api/v1/clustering/event/{eventId}/clusters:
 *   get:
 *     summary: Get all person clusters for an event
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeNoise
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of clusters
 */
router.get('/event/:eventId/clusters', clusteringController.getEventClusters);

/**
 * @swagger
 * /api/v1/clustering/cluster/{clusterId}/faces:
 *   get:
 *     summary: Get all faces in a cluster
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: clusterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Faces in cluster
 */
router.get('/cluster/:clusterId/faces', clusteringController.getClusterFaces);

/**
 * @swagger
 * /api/v1/clustering/cluster/{clusterId}:
 *   patch:
 *     summary: Rename a cluster
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: clusterId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cluster renamed
 */
router.patch('/cluster/:clusterId', clusteringController.renameCluster);

/**
 * @swagger
 * /api/v1/clustering/merge:
 *   post:
 *     summary: Merge multiple clusters into one
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clusterIds]
 *             properties:
 *               clusterIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Clusters merged
 */
router.post('/merge', clusteringController.mergeClusters);

/**
 * @swagger
 * /api/v1/clustering/move-face:
 *   post:
 *     summary: Move a face from one cluster to another
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [faceId, targetClusterId]
 *             properties:
 *               faceId:
 *                 type: string
 *               targetClusterId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Face moved
 */
router.post('/move-face', clusteringController.moveFace);

/**
 * @swagger
 * /api/v1/clustering/split:
 *   post:
 *     summary: Split selected faces into a new cluster
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [faceIds, eventId, eventSlug]
 *             properties:
 *               faceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               newClusterName:
 *                 type: string
 *               eventId:
 *                 type: string
 *               eventSlug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Faces split into new cluster
 */
router.post('/split', clusteringController.splitCluster);

/**
 * @swagger
 * /api/v1/clustering/face/{faceId}/thumbnail:
 *   get:
 *     summary: Get a cropped face thumbnail
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: faceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 150
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [jpeg, webp, png]
 *           default: jpeg
 *     responses:
 *       200:
 *         description: Face thumbnail image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/face/:faceId/thumbnail', clusteringController.getFaceThumbnail);

/**
 * @swagger
 * /api/v1/clustering/cluster/{clusterId}/thumbnail:
 *   get:
 *     summary: Get the representative face thumbnail for a cluster
 *     tags: [Clustering]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: clusterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 150
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [jpeg, webp, png]
 *           default: jpeg
 *     responses:
 *       200:
 *         description: Cluster representative thumbnail image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/cluster/:clusterId/thumbnail', clusteringController.getClusterThumbnail);

export { router as clusteringRoutes };

