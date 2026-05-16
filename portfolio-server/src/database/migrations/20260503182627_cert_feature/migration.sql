-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CLIENT_REQUEST', 'CLIENT_INQUIRY', 'CHAT_MESSAGE', 'SYSTEM');

-- AlterEnum
ALTER TYPE "ChatbotMessageRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "chatbot_message" ADD COLUMN     "sender_avatar" VARCHAR(500),
ADD COLUMN     "sender_name" VARCHAR(200);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "two_factor_secret" VARCHAR(100);

-- CreateTable
CREATE TABLE "chatbot_tag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(80) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chatbot_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500),
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "user_id" UUID,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_tag_name_key" ON "chatbot_tag"("name");

-- CreateIndex
CREATE INDEX "notification_user_id_read_created_at_idx" ON "notification"("user_id", "read", "created_at");
