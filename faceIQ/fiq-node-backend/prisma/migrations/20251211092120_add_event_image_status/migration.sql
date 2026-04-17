-- CreateEnum
CREATE TYPE "IndexingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "event_image_statuses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "IndexingStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_image_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_image_statuses_eventId_idx" ON "event_image_statuses"("eventId");

-- CreateIndex
CREATE INDEX "event_image_statuses_orgId_idx" ON "event_image_statuses"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "event_image_statuses_eventId_photoId_key" ON "event_image_statuses"("eventId", "photoId");

-- AddForeignKey
ALTER TABLE "event_image_statuses" ADD CONSTRAINT "event_image_statuses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
