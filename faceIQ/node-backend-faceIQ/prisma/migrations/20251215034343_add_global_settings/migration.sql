-- CreateEnum
CREATE TYPE "FaceRecognitionProvider" AS ENUM ('COMPREFACE', 'INSIGHTFACE');

-- CreateEnum
CREATE TYPE "ClusteringProvider" AS ENUM ('QDRANT', 'HDBSCAN');

-- CreateEnum
CREATE TYPE "ClusteringJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "event_image_statuses" ADD COLUMN     "eventSlug" TEXT,
ADD COLUMN     "sourceVideoId" TEXT,
ADD COLUMN     "videoTimestamp" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "clusteringMinClusterSize" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "clusteringMinSamples" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "clusteringProvider" "ClusteringProvider" NOT NULL DEFAULT 'QDRANT',
ADD COLUMN     "clusteringSimilarityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
ADD COLUMN     "faceRecognitionProvider" "FaceRecognitionProvider" NOT NULL DEFAULT 'COMPREFACE',
ADD COLUMN     "insightfaceModel" TEXT,
ALTER COLUMN "minConfidence" SET DEFAULT 0.5;

-- CreateTable
CREATE TABLE "event_video_statuses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "eventSlug" TEXT,
    "orgId" TEXT NOT NULL,
    "status" "IndexingStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "videoUrl" TEXT,
    "durationSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "framesExtracted" INTEGER NOT NULL DEFAULT 0,
    "facesFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_video_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clustering_jobs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "status" "ClusteringJobStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "ClusteringProvider" NOT NULL,
    "totalFaces" INTEGER NOT NULL DEFAULT 0,
    "clustersFound" INTEGER NOT NULL DEFAULT 0,
    "noiseFaces" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clustering_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_clusters" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Unknown',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "representativeFaceId" TEXT,
    "thumbnailUrl" TEXT,
    "faceCount" INTEGER NOT NULL DEFAULT 0,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "isNoise" BOOLEAN NOT NULL DEFAULT false,
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_cluster_assignments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "qdrantPointId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "face_cluster_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" TEXT NOT NULL,
    "faceRecognitionProvider" "FaceRecognitionProvider" NOT NULL DEFAULT 'COMPREFACE',
    "insightfaceModel" TEXT DEFAULT 'buffalo_l',
    "comprefaceUrl" TEXT,
    "pythonSidecarUrl" TEXT,
    "faceDetectionMode" "FaceDetectionMode" NOT NULL DEFAULT 'RECOGNITION_ONLY',
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "minSizePx" INTEGER NOT NULL DEFAULT 60,
    "skipExtremeAngles" BOOLEAN NOT NULL DEFAULT false,
    "imageSourceMode" "ImageSourceMode" NOT NULL DEFAULT 'URL',
    "sharedStoragePath" TEXT,
    "enableFallbackDetection" BOOLEAN NOT NULL DEFAULT true,
    "enableAlignment" BOOLEAN NOT NULL DEFAULT true,
    "searchDefaultTopK" INTEGER NOT NULL DEFAULT 50,
    "searchMinSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "embeddingCacheTtlSeconds" INTEGER NOT NULL DEFAULT 1800,
    "clusteringProvider" "ClusteringProvider" NOT NULL DEFAULT 'QDRANT',
    "clusteringMinClusterSize" INTEGER NOT NULL DEFAULT 2,
    "clusteringMinSamples" INTEGER NOT NULL DEFAULT 2,
    "clusteringSimilarityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_video_statuses_eventId_idx" ON "event_video_statuses"("eventId");

-- CreateIndex
CREATE INDEX "event_video_statuses_eventSlug_idx" ON "event_video_statuses"("eventSlug");

-- CreateIndex
CREATE INDEX "event_video_statuses_orgId_idx" ON "event_video_statuses"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "event_video_statuses_eventId_videoId_key" ON "event_video_statuses"("eventId", "videoId");

-- CreateIndex
CREATE INDEX "clustering_jobs_orgId_idx" ON "clustering_jobs"("orgId");

-- CreateIndex
CREATE INDEX "clustering_jobs_eventId_idx" ON "clustering_jobs"("eventId");

-- CreateIndex
CREATE INDEX "clustering_jobs_eventSlug_idx" ON "clustering_jobs"("eventSlug");

-- CreateIndex
CREATE INDEX "person_clusters_orgId_idx" ON "person_clusters"("orgId");

-- CreateIndex
CREATE INDEX "person_clusters_eventId_idx" ON "person_clusters"("eventId");

-- CreateIndex
CREATE INDEX "person_clusters_eventSlug_idx" ON "person_clusters"("eventSlug");

-- CreateIndex
CREATE INDEX "person_clusters_orgId_eventSlug_idx" ON "person_clusters"("orgId", "eventSlug");

-- CreateIndex
CREATE INDEX "face_cluster_assignments_orgId_idx" ON "face_cluster_assignments"("orgId");

-- CreateIndex
CREATE INDEX "face_cluster_assignments_eventId_idx" ON "face_cluster_assignments"("eventId");

-- CreateIndex
CREATE INDEX "face_cluster_assignments_clusterId_idx" ON "face_cluster_assignments"("clusterId");

-- CreateIndex
CREATE INDEX "face_cluster_assignments_photoId_idx" ON "face_cluster_assignments"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "face_cluster_assignments_qdrantPointId_key" ON "face_cluster_assignments"("qdrantPointId");

-- CreateIndex
CREATE INDEX "event_image_statuses_eventSlug_idx" ON "event_image_statuses"("eventSlug");

-- AddForeignKey
ALTER TABLE "event_image_statuses" ADD CONSTRAINT "event_image_statuses_sourceVideoId_fkey" FOREIGN KEY ("sourceVideoId") REFERENCES "event_video_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_video_statuses" ADD CONSTRAINT "event_video_statuses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clustering_jobs" ADD CONSTRAINT "clustering_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_clusters" ADD CONSTRAINT "person_clusters_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_cluster_assignments" ADD CONSTRAINT "face_cluster_assignments_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "person_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_cluster_assignments" ADD CONSTRAINT "face_cluster_assignments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
