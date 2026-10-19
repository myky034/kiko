-- CreateEnum
CREATE TYPE "kiko"."lesson_status" AS ENUM ('draft', 'ready', 'archived');

-- CreateEnum
CREATE TYPE "kiko"."transcript_state" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "kiko"."lesson" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "language_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "kiko"."lesson_status" NOT NULL DEFAULT 'draft',
    "source_note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "level_label" TEXT,
    "active_transcript_id" UUID,
    "client_request_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiko"."transcript_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "language_code" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "state" "kiko"."transcript_state" NOT NULL DEFAULT 'draft',
    "source_text" TEXT NOT NULL,
    "segmentation_rule" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "transcript_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiko"."segment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transcript_version_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "language_code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_owner_id_status_updated_at_id_idx" ON "kiko"."lesson"("owner_id", "status", "updated_at" DESC, "id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_id_owner_id_language_code_key" ON "kiko"."lesson"("id", "owner_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_owner_id_client_request_id_key" ON "kiko"."lesson"("owner_id", "client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_version_lesson_id_version_no_key" ON "kiko"."transcript_version"("lesson_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_version_id_owner_id_language_code_key" ON "kiko"."transcript_version"("id", "owner_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_version_id_lesson_id_key" ON "kiko"."transcript_version"("id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "segment_transcript_version_id_position_key" ON "kiko"."segment"("transcript_version_id", "position");

-- AddForeignKey
ALTER TABLE "kiko"."lesson" ADD CONSTRAINT "lesson_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "kiko"."user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."lesson" ADD CONSTRAINT "lesson_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "kiko"."language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."lesson" ADD CONSTRAINT "lesson_active_transcript_id_id_fkey" FOREIGN KEY ("active_transcript_id", "id") REFERENCES "kiko"."transcript_version"("id", "lesson_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kiko"."transcript_version" ADD CONSTRAINT "transcript_version_lesson_id_owner_id_language_code_fkey" FOREIGN KEY ("lesson_id", "owner_id", "language_code") REFERENCES "kiko"."lesson"("id", "owner_id", "language_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."segment" ADD CONSTRAINT "segment_transcript_version_id_owner_id_language_code_fkey" FOREIGN KEY ("transcript_version_id", "owner_id", "language_code") REFERENCES "kiko"."transcript_version"("id", "owner_id", "language_code") ON DELETE CASCADE ON UPDATE CASCADE;

