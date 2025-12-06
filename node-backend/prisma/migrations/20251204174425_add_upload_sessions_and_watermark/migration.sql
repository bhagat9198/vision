-- CreateEnum
CREATE TYPE "WatermarkPosition" AS ENUM ('TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT');

-- CreateEnum
CREATE TYPE "UploadSessionStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UploadFileStatus" AS ENUM ('PENDING', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "photographer" ADD COLUMN     "watermark_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watermark_opacity" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "watermark_position" "WatermarkPosition" NOT NULL DEFAULT 'BOTTOM_RIGHT',
ADD COLUMN     "watermark_scale" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "upload_session" (
    "id" TEXT NOT NULL,
    "photographer_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "album_id" TEXT NOT NULL,
    "total_files" INTEGER NOT NULL,
    "processed_files" INTEGER NOT NULL DEFAULT 0,
    "failed_files" INTEGER NOT NULL DEFAULT 0,
    "total_size" BIGINT NOT NULL DEFAULT 0,
    "status" "UploadSessionStatus" NOT NULL DEFAULT 'UPLOADING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_file" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "total_chunks" INTEGER NOT NULL,
    "uploaded_chunks" INTEGER NOT NULL DEFAULT 0,
    "chunks_received" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "UploadFileStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "photo_id" TEXT,
    "temp_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_session_photographer_id_idx" ON "upload_session"("photographer_id");

-- CreateIndex
CREATE INDEX "upload_session_event_id_idx" ON "upload_session"("event_id");

-- CreateIndex
CREATE INDEX "upload_session_status_idx" ON "upload_session"("status");

-- CreateIndex
CREATE INDEX "upload_session_expires_at_idx" ON "upload_session"("expires_at");

-- CreateIndex
CREATE INDEX "upload_file_session_id_idx" ON "upload_file"("session_id");

-- CreateIndex
CREATE INDEX "upload_file_status_idx" ON "upload_file"("status");

-- AddForeignKey
ALTER TABLE "upload_session" ADD CONSTRAINT "upload_session_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_file" ADD CONSTRAINT "upload_file_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "upload_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
