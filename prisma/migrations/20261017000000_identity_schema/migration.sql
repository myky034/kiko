-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "kiko";

-- CreateEnum
CREATE TYPE "kiko"."account_state" AS ENUM ('pending', 'active', 'suspended', 'removed');

-- CreateEnum
CREATE TYPE "kiko"."admission_status" AS ENUM ('active', 'revoked');

-- CreateTable
CREATE TABLE "kiko"."language" (
    "code" TEXT NOT NULL,

    CONSTRAINT "language_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "kiko"."role" (
    "code" TEXT NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "kiko"."user_profile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_provider" TEXT NOT NULL,
    "auth_subject" TEXT NOT NULL,
    "timezone" TEXT,
    "interface_language" TEXT NOT NULL DEFAULT 'vi',
    "state" "kiko"."account_state" NOT NULL DEFAULT 'pending',
    "authorization_revision" INTEGER NOT NULL DEFAULT 1,
    "onboarded_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiko"."allowed_account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_provider" TEXT NOT NULL DEFAULT 'supabase',
    "email" TEXT NOT NULL,
    "status" "kiko"."admission_status" NOT NULL DEFAULT 'active',
    "bound_subject" TEXT,
    "bound_user_id" UUID,
    "admitted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowed_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiko"."allowed_account_role" (
    "allowed_account_id" UUID NOT NULL,
    "role_code" TEXT NOT NULL,

    CONSTRAINT "allowed_account_role_pkey" PRIMARY KEY ("allowed_account_id","role_code")
);

-- CreateTable
CREATE TABLE "kiko"."user_role" (
    "user_id" UUID NOT NULL,
    "role_code" TEXT NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_code")
);

-- CreateTable
CREATE TABLE "kiko"."user_language_preference" (
    "user_id" UUID NOT NULL,
    "language_code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_language_preference_pkey" PRIMARY KEY ("user_id","language_code")
);

-- CreateTable
CREATE TABLE "kiko"."audit_event" (
    "id" BIGSERIAL NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "result" TEXT NOT NULL,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_auth_provider_auth_subject_key" ON "kiko"."user_profile"("auth_provider", "auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_account_auth_provider_email_key" ON "kiko"."allowed_account"("auth_provider", "email");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_account_auth_provider_bound_subject_key" ON "kiko"."allowed_account"("auth_provider", "bound_subject");

-- CreateIndex
CREATE INDEX "audit_event_occurred_at_idx" ON "kiko"."audit_event"("occurred_at");

-- AddForeignKey
ALTER TABLE "kiko"."allowed_account" ADD CONSTRAINT "allowed_account_bound_user_id_fkey" FOREIGN KEY ("bound_user_id") REFERENCES "kiko"."user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."allowed_account" ADD CONSTRAINT "allowed_account_admitted_by_fkey" FOREIGN KEY ("admitted_by") REFERENCES "kiko"."user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."allowed_account_role" ADD CONSTRAINT "allowed_account_role_allowed_account_id_fkey" FOREIGN KEY ("allowed_account_id") REFERENCES "kiko"."allowed_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."allowed_account_role" ADD CONSTRAINT "allowed_account_role_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "kiko"."role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "kiko"."user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."user_role" ADD CONSTRAINT "user_role_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "kiko"."role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."user_role" ADD CONSTRAINT "user_role_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "kiko"."user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."user_language_preference" ADD CONSTRAINT "user_language_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "kiko"."user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."user_language_preference" ADD CONSTRAINT "user_language_preference_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "kiko"."language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiko"."audit_event" ADD CONSTRAINT "audit_event_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "kiko"."user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

