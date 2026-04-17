-- CreateEnum
CREATE TYPE "FaceDetectionMode" AS ENUM ('RECOGNITION_ONLY', 'DETECTION_THEN_RECOGNITION');

-- CreateEnum
CREATE TYPE "ImageSourceMode" AS ENUM ('URL', 'MULTIPART', 'SHARED_STORAGE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "comprefaceUrl" TEXT,
    "comprefaceRecognitionApiKey" TEXT,
    "comprefaceDetectionApiKey" TEXT,
    "faceDetectionMode" "FaceDetectionMode" NOT NULL DEFAULT 'RECOGNITION_ONLY',
    "imageSourceMode" "ImageSourceMode" NOT NULL DEFAULT 'URL',
    "sharedStoragePath" TEXT,
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "minSizePx" INTEGER NOT NULL DEFAULT 60,
    "skipExtremeAngles" BOOLEAN NOT NULL DEFAULT true,
    "searchDefaultTopK" INTEGER NOT NULL DEFAULT 50,
    "searchMinSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "embeddingCacheTtlSeconds" INTEGER NOT NULL DEFAULT 1800,
    "pythonSidecarUrl" TEXT,
    "enableFallbackDetection" BOOLEAN NOT NULL DEFAULT true,
    "enableAlignment" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_orgId_idx" ON "api_keys"("orgId");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
