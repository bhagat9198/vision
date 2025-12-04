-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "GalleryTemplate" AS ENUM ('MODERN', 'CLASSIC', 'MINIMAL', 'ELEGANT', 'FASHION', 'SIDEBAR');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AspectRatio" AS ENUM ('PORTRAIT', 'LANDSCAPE', 'SQUARE');

-- CreateEnum
CREATE TYPE "SimilarityReason" AS ENUM ('FACE', 'SCENE', 'COLOR', 'CLOTHING');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('COMMENT', 'LIKE', 'DOWNLOAD', 'VIEW', 'UPLOAD');

-- CreateTable
CREATE TABLE "super_admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "options" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "template_id" TEXT,
    "template_text" TEXT NOT NULL,
    "variables" TEXT[],
    "is_html" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "phone" TEXT,
    "subscription" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "storage_used" BIGINT NOT NULL DEFAULT 0,
    "storage_limit" BIGINT NOT NULL DEFAULT 5368709120,
    "watermark_url" TEXT,
    "default_template" "GalleryTemplate" NOT NULL DEFAULT 'MODERN',
    "notification_settings" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photographer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cover_photo" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "is_password_protected" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "instructions" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "template" "GalleryTemplate" NOT NULL DEFAULT 'MODERN',
    "watermark_enabled" BOOLEAN NOT NULL DEFAULT true,
    "allow_downloads" BOOLEAN NOT NULL DEFAULT true,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "allow_likes" BOOLEAN NOT NULL DEFAULT true,
    "photographer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cover_photo" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "original_name" TEXT,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "aspect_ratio" "AspectRatio" NOT NULL DEFAULT 'LANDSCAPE',
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "album_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_avatar" TEXT,
    "user_email" TEXT,
    "photo_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_like" (
    "id" TEXT NOT NULL,
    "user_email" TEXT,
    "session_id" TEXT,
    "photo_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_tag" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "thumbnail" TEXT NOT NULL,
    "bounding_box" JSONB,
    "photo_id" TEXT NOT NULL,
    "detected_face_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detected_face" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "thumbnail" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detected_face_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "similar_photo" (
    "id" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "reason" "SimilarityReason" NOT NULL,
    "photo_id" TEXT NOT NULL,
    "similar_photo_id" TEXT NOT NULL,

    CONSTRAINT "similar_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_photo" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "user_email" TEXT,
    "photo_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "photo_ids" TEXT[],
    "total_size" BIGINT NOT NULL DEFAULT 0,
    "size_option" TEXT NOT NULL,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "download_url" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_visit" (
    "id" TEXT NOT NULL,
    "client_name" TEXT,
    "client_email" TEXT,
    "session_id" TEXT NOT NULL,
    "photos_viewed" INTEGER NOT NULL DEFAULT 0,
    "photos_liked" INTEGER NOT NULL DEFAULT 0,
    "photos_downloaded" INTEGER NOT NULL DEFAULT 0,
    "comments_left" INTEGER NOT NULL DEFAULT 0,
    "event_id" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "photo_id" TEXT,
    "client_name" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_email_key" ON "super_admin"("email");

-- CreateIndex
CREATE INDEX "super_admin_email_idx" ON "super_admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_key_idx" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "message_template_type_idx" ON "message_template"("type");

-- CreateIndex
CREATE INDEX "message_template_provider_idx" ON "message_template"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "message_template_type_provider_is_active_key" ON "message_template"("type", "provider", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "photographer_email_key" ON "photographer"("email");

-- CreateIndex
CREATE INDEX "photographer_email_idx" ON "photographer"("email");

-- CreateIndex
CREATE INDEX "photographer_is_active_idx" ON "photographer"("is_active");

-- CreateIndex
CREATE INDEX "event_photographer_id_idx" ON "event"("photographer_id");

-- CreateIndex
CREATE INDEX "event_status_idx" ON "event"("status");

-- CreateIndex
CREATE INDEX "event_date_idx" ON "event"("date");

-- CreateIndex
CREATE INDEX "album_event_id_idx" ON "album"("event_id");

-- CreateIndex
CREATE INDEX "album_sort_order_idx" ON "album"("sort_order");

-- CreateIndex
CREATE INDEX "photo_event_id_idx" ON "photo"("event_id");

-- CreateIndex
CREATE INDEX "photo_album_id_idx" ON "photo"("album_id");

-- CreateIndex
CREATE INDEX "photo_sort_order_idx" ON "photo"("sort_order");

-- CreateIndex
CREATE INDEX "comment_photo_id_idx" ON "comment"("photo_id");

-- CreateIndex
CREATE INDEX "comment_created_at_idx" ON "comment"("created_at");

-- CreateIndex
CREATE INDEX "photo_like_photo_id_idx" ON "photo_like"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_like_photo_id_user_email_key" ON "photo_like"("photo_id", "user_email");

-- CreateIndex
CREATE UNIQUE INDEX "photo_like_photo_id_session_id_key" ON "photo_like"("photo_id", "session_id");

-- CreateIndex
CREATE INDEX "person_tag_photo_id_idx" ON "person_tag"("photo_id");

-- CreateIndex
CREATE INDEX "person_tag_detected_face_id_idx" ON "person_tag"("detected_face_id");

-- CreateIndex
CREATE INDEX "detected_face_event_id_idx" ON "detected_face"("event_id");

-- CreateIndex
CREATE INDEX "similar_photo_photo_id_idx" ON "similar_photo"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "similar_photo_photo_id_similar_photo_id_key" ON "similar_photo"("photo_id", "similar_photo_id");

-- CreateIndex
CREATE INDEX "favorite_folder_event_id_idx" ON "favorite_folder"("event_id");

-- CreateIndex
CREATE INDEX "favorite_photo_folder_id_idx" ON "favorite_photo"("folder_id");

-- CreateIndex
CREATE INDEX "favorite_photo_photo_id_idx" ON "favorite_photo"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_photo_photo_id_session_id_folder_id_key" ON "favorite_photo"("photo_id", "session_id", "folder_id");

-- CreateIndex
CREATE INDEX "download_package_event_id_idx" ON "download_package"("event_id");

-- CreateIndex
CREATE INDEX "download_package_status_idx" ON "download_package"("status");

-- CreateIndex
CREATE INDEX "client_visit_event_id_idx" ON "client_visit"("event_id");

-- CreateIndex
CREATE INDEX "client_visit_visited_at_idx" ON "client_visit"("visited_at");

-- CreateIndex
CREATE INDEX "activity_log_event_id_idx" ON "activity_log"("event_id");

-- CreateIndex
CREATE INDEX "activity_log_type_idx" ON "activity_log"("type");

-- CreateIndex
CREATE INDEX "activity_log_created_at_idx" ON "activity_log"("created_at");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album" ADD CONSTRAINT "album_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_like" ADD CONSTRAINT "photo_like_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_tag" ADD CONSTRAINT "person_tag_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_tag" ADD CONSTRAINT "person_tag_detected_face_id_fkey" FOREIGN KEY ("detected_face_id") REFERENCES "detected_face"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detected_face" ADD CONSTRAINT "detected_face_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similar_photo" ADD CONSTRAINT "similar_photo_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similar_photo" ADD CONSTRAINT "similar_photo_similar_photo_id_fkey" FOREIGN KEY ("similar_photo_id") REFERENCES "photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_folder" ADD CONSTRAINT "favorite_folder_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_photo" ADD CONSTRAINT "favorite_photo_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_photo" ADD CONSTRAINT "favorite_photo_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "favorite_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_package" ADD CONSTRAINT "download_package_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_visit" ADD CONSTRAINT "client_visit_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
