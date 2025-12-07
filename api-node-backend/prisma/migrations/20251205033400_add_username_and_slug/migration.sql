/*
  - Add unique username to photographer
  - Add unique slug to event (photographer_username/event_slug)
*/

-- First add columns as nullable
ALTER TABLE "photographer" ADD COLUMN "username" TEXT;
ALTER TABLE "event" ADD COLUMN "slug" TEXT;

-- Update existing photographers with auto-generated usernames
UPDATE "photographer" SET "username" = 'user_' || SUBSTRING(id::text, 1, 8) WHERE "username" IS NULL;

-- Update existing events with auto-generated slugs
UPDATE "event" e SET "slug" = (
  SELECT p."username" || '/' || LOWER(REPLACE(REPLACE(e.name, ' ', '-'), '''', ''))
  FROM "photographer" p WHERE p.id = e.photographer_id
) WHERE "slug" IS NULL;

-- Make columns NOT NULL after populating
ALTER TABLE "photographer" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "event" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "event_slug_key" ON "event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "photographer_username_key" ON "photographer"("username");
