/*
  Warnings:

  - A unique constraint covering the columns `[display_id]` on the table `album` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[display_id]` on the table `event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[display_id]` on the table `photo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[display_id]` on the table `photographer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "album" ADD COLUMN     "display_id" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "display_id" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "photo" ADD COLUMN     "display_id" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "photographer" ADD COLUMN     "display_id" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "album_display_id_key" ON "album"("display_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_display_id_key" ON "event"("display_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_display_id_key" ON "photo"("display_id");

-- CreateIndex
CREATE UNIQUE INDEX "photographer_display_id_key" ON "photographer"("display_id");
