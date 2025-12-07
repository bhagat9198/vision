/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `photographer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "photographer" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "otp" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_phone_type_idx" ON "otp"("phone", "type");

-- CreateIndex
CREATE INDEX "otp_email_type_idx" ON "otp"("email", "type");

-- CreateIndex
CREATE INDEX "otp_expires_at_idx" ON "otp"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "photographer_phone_key" ON "photographer"("phone");

-- CreateIndex
CREATE INDEX "photographer_phone_idx" ON "photographer"("phone");
