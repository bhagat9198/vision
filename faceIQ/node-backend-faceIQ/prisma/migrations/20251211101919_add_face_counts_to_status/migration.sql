-- AlterTable
ALTER TABLE "event_image_statuses" ADD COLUMN     "facesDetected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "facesIndexed" INTEGER NOT NULL DEFAULT 0;
