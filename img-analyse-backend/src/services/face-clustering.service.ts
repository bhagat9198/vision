/**
 * =============================================================================
 * Face Clustering Service
 * =============================================================================
 * Provides face clustering using configurable providers:
 * - QDRANT: Pure Node.js using Union-Find algorithm on similarity matrix
 * - HDBSCAN: Python sidecar using battle-tested HDBSCAN algorithm
 * 
 * Both providers work with pre-computed embeddings stored in Qdrant.
 * =============================================================================
 */

import axios from 'axios';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { qdrantService } from './qdrant.service.js';
import type { OrgSettings, ClusteringProvider } from '../modules/org/org.types.js';
import type { QdrantFacePayload } from '../types/index.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ClusteringResult {
  clusters: Map<number, string[]>; // cluster_id -> array of Qdrant point IDs
  noisePointIds: string[];          // Points that couldn't be clustered
  totalFaces: number;
  clusteredFaces: number;
  noiseFaces: number;
  numClusters: number;
  processingTimeMs: number;
}

export interface FacePoint {
  id: string;
  embedding: number[];
  payload: QdrantFacePayload;
}

// =============================================================================
// UNION-FIND DATA STRUCTURE (for QDRANT provider)
// =============================================================================

class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  makeSet(x: string): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.makeSet(x);
    }

    // Path compression
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    // Union by rank
    const rankX = this.rank.get(rootX) || 0;
    const rankY = this.rank.get(rootY) || 0;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }

  getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();

    for (const [item] of this.parent) {
      const root = this.find(item);
      if (!clusters.has(root)) {
        clusters.set(root, []);
      }
      clusters.get(root)!.push(item);
    }

    return clusters;
  }
}

// =============================================================================
// SIMILARITY CALCULATION
// =============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// =============================================================================
// FACE CLUSTERING SERVICE
// =============================================================================

class FaceClusteringService {
  /**
   * Cluster faces for an event using the configured provider.
   */
  async clusterEvent(
    orgSettings: OrgSettings,
    eventSlug: string,
    eventId: string
  ): Promise<ClusteringResult> {
    const provider = orgSettings.clusteringProvider;
    logger.info(`[CLUSTERING] Starting clustering for event ${eventSlug} using ${provider} provider`);

    // 1. Fetch all face embeddings from Qdrant
    const faces = await qdrantService.scrollAllFacesWithEmbeddings(orgSettings.slug, eventSlug);

    if (faces.length === 0) {
      logger.warn(`[CLUSTERING] No faces found for event ${eventSlug}`);
      return {
        clusters: new Map(),
        noisePointIds: [],
        totalFaces: 0,
        clusteredFaces: 0,
        noiseFaces: 0,
        numClusters: 0,
        processingTimeMs: 0,
      };
    }

    logger.info(`[CLUSTERING] Found ${faces.length} faces to cluster`);

    // 2. Route to appropriate provider
    if (provider === 'HDBSCAN') {
      return this.clusterWithHDBSCAN(orgSettings, faces);
    } else {
      return this.clusterWithQdrant(orgSettings, faces);
    }
  }

  /**
   * QDRANT Provider: Cluster using Union-Find on pairwise similarities.
   * This is a pure Node.js implementation.
   */
  private async clusterWithQdrant(
    orgSettings: OrgSettings,
    faces: FacePoint[]
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    const threshold = orgSettings.clusteringSimilarityThreshold;

    logger.info(`[CLUSTERING/QDRANT] Clustering ${faces.length} faces with threshold ${threshold}`);

    const uf = new UnionFind();

    // Initialize all points
    for (const face of faces) {
      uf.makeSet(face.id);
    }

    // Compare all pairs and union if similar enough
    // O(n^2) but necessary for clustering without external service
    let pairsChecked = 0;
    let pairsUnioned = 0;

    for (let i = 0; i < faces.length; i++) {
      const faceI = faces[i]!;
      for (let j = i + 1; j < faces.length; j++) {
        const faceJ = faces[j]!;
        const similarity = cosineSimilarity(faceI.embedding, faceJ.embedding);
        pairsChecked++;

        if (similarity >= threshold) {
          uf.union(faceI.id, faceJ.id);
          pairsUnioned++;
        }
      }

      // Log progress for large datasets
      if (i > 0 && i % 500 === 0) {
        logger.info(`[CLUSTERING/QDRANT] Progress: ${i}/${faces.length} faces processed`);
      }
    }

    // Get clusters
    const rawClusters = uf.getClusters();

    // Convert to numbered clusters, separating singletons as noise
    const clusters = new Map<number, string[]>();
    const noisePointIds: string[] = [];
    let clusterIndex = 0;

    for (const [, members] of rawClusters) {
      if (members.length >= orgSettings.clusteringMinClusterSize) {
        clusters.set(clusterIndex++, members);
      } else {
        // Treat small clusters as noise
        noisePointIds.push(...members);
      }
    }

    const processingTimeMs = Date.now() - startTime;
    const clusteredFaces = Array.from(clusters.values()).reduce((sum, c) => sum + c.length, 0);

    logger.info(
      `[CLUSTERING/QDRANT] Complete: ${clusters.size} clusters, ${noisePointIds.length} noise ` +
      `(${pairsChecked} pairs checked, ${pairsUnioned} unions) in ${processingTimeMs}ms`
    );

    return {
      clusters,
      noisePointIds,
      totalFaces: faces.length,
      clusteredFaces,
      noiseFaces: noisePointIds.length,
      numClusters: clusters.size,
      processingTimeMs,
    };
  }

  /**
   * HDBSCAN Provider: Send embeddings to Python sidecar for clustering.
   * Battle-tested algorithm with better quality for complex datasets.
   */
  private async clusterWithHDBSCAN(
    orgSettings: OrgSettings,
    faces: FacePoint[]
  ): Promise<ClusteringResult> {
    const startTime = Date.now();

    if (!orgSettings.pythonSidecarUrl) {
      throw new Error('Python sidecar URL not configured for HDBSCAN clustering');
    }

    // Log detailed clustering parameters for debugging
    logger.info(
      `[CLUSTERING/HDBSCAN] Starting clustering with parameters: ` +
      `faces=${faces.length}, minClusterSize=${orgSettings.clusteringMinClusterSize}, ` +
      `minSamples=${orgSettings.clusteringMinSamples}, ` +
      `url=${orgSettings.pythonSidecarUrl}`
    );

    // Log sample of face data for debugging
    if (faces.length > 0) {
      const sampleFace = faces[0]!;
      logger.debug(
        `[CLUSTERING/HDBSCAN] Sample face: id=${sampleFace.id.slice(0, 8)}..., ` +
        `photoId=${sampleFace.payload.photoId}, embeddingDim=${sampleFace.embedding.length}`
      );
    }

    try {
      const response = await axios.post<{
        success: boolean;
        clusters: Array<{
          cluster_id: number;
          point_ids: string[];
          size: number;
        }>;
        total_faces: number;
        clustered_faces: number;
        noise_faces: number;
        num_clusters: number;
        processing_time_ms: number;
      }>(`${orgSettings.pythonSidecarUrl}/cluster/hdbscan`, {
        embeddings: faces.map(f => f.embedding),
        point_ids: faces.map(f => f.id),
        min_cluster_size: orgSettings.clusteringMinClusterSize,
        min_samples: orgSettings.clusteringMinSamples,
        metric: 'euclidean',
      }, {
        timeout: 300000, // 5 minute timeout for large datasets
      });

      const data = response.data;

      // Convert response to ClusteringResult
      const clusters = new Map<number, string[]>();
      const noisePointIds: string[] = [];

      for (const cluster of data.clusters) {
        if (cluster.cluster_id === -1) {
          noisePointIds.push(...cluster.point_ids);
        } else {
          clusters.set(cluster.cluster_id, cluster.point_ids);
        }
      }

      const totalTime = Date.now() - startTime;

      // Log detailed summary for debugging
      logger.info(
        `[CLUSTERING/HDBSCAN] Complete: ${data.num_clusters} clusters, ${data.noise_faces} noise ` +
        `in ${totalTime}ms (Python: ${data.processing_time_ms}ms)`
      );

      // Log cluster sizes distribution for debugging accuracy
      const clusterSizes = Array.from(clusters.values()).map(c => c.length).sort((a, b) => b - a);
      logger.info(
        `[CLUSTERING/HDBSCAN] Cluster size distribution: ` +
        `${clusterSizes.slice(0, 10).join(', ')}${clusterSizes.length > 10 ? '...' : ''}`
      );

      return {
        clusters,
        noisePointIds,
        totalFaces: data.total_faces,
        clusteredFaces: data.clustered_faces,
        noiseFaces: data.noise_faces,
        numClusters: data.num_clusters,
        processingTimeMs: totalTime,
      };
    } catch (error: any) {
      logger.error(`[CLUSTERING/HDBSCAN] Failed:`, error.message);
      throw new Error(`HDBSCAN clustering failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const faceClusteringService = new FaceClusteringService();

