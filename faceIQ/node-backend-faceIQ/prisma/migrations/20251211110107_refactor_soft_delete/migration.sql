/*
  Warnings:

  - The values [DELETED] on the enum `IndexingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IndexingStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "public"."event_image_statuses" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "event_image_statuses" ALTER COLUMN "status" TYPE "IndexingStatus_new" USING ("status"::text::"IndexingStatus_new");
ALTER TYPE "IndexingStatus" RENAME TO "IndexingStatus_old";
ALTER TYPE "IndexingStatus_new" RENAME TO "IndexingStatus";
DROP TYPE "public"."IndexingStatus_old";
ALTER TABLE "event_image_statuses" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "event_image_statuses" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
