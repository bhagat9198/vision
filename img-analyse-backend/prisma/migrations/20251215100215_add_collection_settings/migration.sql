-- CreateTable
CREATE TABLE "collection_settings" (
    "id" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "autoClustering" BOOLEAN NOT NULL DEFAULT false,
    "autoIndexing" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCompletion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collection_settings_collectionName_key" ON "collection_settings"("collectionName");

-- CreateIndex
CREATE INDEX "collection_settings_orgId_idx" ON "collection_settings"("orgId");

-- CreateIndex
CREATE INDEX "collection_settings_eventId_idx" ON "collection_settings"("eventId");
