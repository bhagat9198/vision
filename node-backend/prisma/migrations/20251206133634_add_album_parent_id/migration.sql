-- AlterTable
ALTER TABLE "album" ADD COLUMN     "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "album_parent_id_idx" ON "album"("parent_id");

-- AddForeignKey
ALTER TABLE "album" ADD CONSTRAINT "album_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
