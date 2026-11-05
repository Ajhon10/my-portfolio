PRAGMA foreign_keys=ON;

CREATE TABLE "auth" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "verified" INTEGER NOT NULL DEFAULT 0 CHECK ("verified" IN (0,1)),
  "last_login" TEXT,
  "login_attempts" INTEGER NOT NULL DEFAULT 0,
  "last_failed_login" TEXT
);

CREATE INDEX "auth_created_at_idx" ON "auth" ("created_at");

CREATE INDEX "auth_deleted_idx" ON "auth" ("deleted");

CREATE TABLE "certification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "title" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "description" TEXT,
  "credential_id" TEXT,
  "credential_url" TEXT,
  "certificate_url" TEXT,
  "issued_at" TEXT NOT NULL,
  "expires_at" TEXT,
  "featured" INTEGER NOT NULL DEFAULT 0 CHECK ("featured" IN (0,1)),
  "published" INTEGER NOT NULL DEFAULT 1 CHECK ("published" IN (0,1)),
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "certification_created_at_idx" ON "certification" ("created_at");

CREATE INDEX "certification_deleted_idx" ON "certification" ("deleted");

CREATE INDEX "certification_credential_id_idx" ON "certification" ("credential_id");

CREATE INDEX "certification_published_idx" ON "certification" ("published");

CREATE INDEX "certification_sort_order_idx" ON "certification" ("sort_order");

CREATE TABLE "chatbot_knowledge" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "topic" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "tags" TEXT,
  "enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("enabled" IN (0,1))
);

CREATE INDEX "chatbot_knowledge_created_at_idx" ON "chatbot_knowledge" ("created_at");

CREATE INDEX "chatbot_knowledge_deleted_idx" ON "chatbot_knowledge" ("deleted");

CREATE TABLE "chatbot_tag" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "name" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "chatbot_tag_created_at_idx" ON "chatbot_tag" ("created_at");

CREATE INDEX "chatbot_tag_deleted_idx" ON "chatbot_tag" ("deleted");

CREATE INDEX "chatbot_tag_sort_order_idx" ON "chatbot_tag" ("sort_order");

CREATE TABLE "chatbot_conversation" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "session_id" TEXT NOT NULL,
  "visitor" TEXT
);

CREATE INDEX "chatbot_conversation_created_at_idx" ON "chatbot_conversation" ("created_at");

CREATE INDEX "chatbot_conversation_deleted_idx" ON "chatbot_conversation" ("deleted");

CREATE INDEX "chatbot_conversation_session_id_idx" ON "chatbot_conversation" ("session_id");

CREATE TABLE "chatbot_message" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "role" TEXT NOT NULL CHECK ("role" IN ('USER','ASSISTANT','ADMIN','SYSTEM')),
  "content" TEXT NOT NULL,
  "sender_name" TEXT,
  "sender_avatar" TEXT,
  "conversation_id" TEXT NOT NULL,
  FOREIGN KEY ("conversation_id") REFERENCES "chatbot_conversation"("id") ON DELETE CASCADE
);

CREATE INDEX "chatbot_message_created_at_idx" ON "chatbot_message" ("created_at");

CREATE INDEX "chatbot_message_conversation_id_idx" ON "chatbot_message" ("conversation_id");

CREATE TABLE "client_request" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "company" TEXT,
  "phone" TEXT,
  "project_type" TEXT NOT NULL,
  "budget" TEXT,
  "timeline" TEXT,
  "description" TEXT NOT NULL,
  "reference_links" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','REVIEWING','REPLIED','ACCEPTED','DECLINED','ARCHIVED')),
  "client_user_id" TEXT,
  FOREIGN KEY ("client_user_id") REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE INDEX "client_request_created_at_idx" ON "client_request" ("created_at");

CREATE INDEX "client_request_deleted_idx" ON "client_request" ("deleted");

CREATE INDEX "client_request_status_idx" ON "client_request" ("status");

CREATE INDEX "client_request_client_user_id_idx" ON "client_request" ("client_user_id");

CREATE TABLE "client_request_reply" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "message" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "replied_by_id" TEXT NOT NULL,
  FOREIGN KEY ("request_id") REFERENCES "client_request"("id") ON DELETE CASCADE,
  FOREIGN KEY ("replied_by_id") REFERENCES "user"("id") ON DELETE RESTRICT
);

CREATE INDEX "client_request_reply_created_at_idx" ON "client_request_reply" ("created_at");

CREATE INDEX "client_request_reply_deleted_idx" ON "client_request_reply" ("deleted");

CREATE INDEX "client_request_reply_request_id_idx" ON "client_request_reply" ("request_id");

CREATE INDEX "client_request_reply_replied_by_id_idx" ON "client_request_reply" ("replied_by_id");

CREATE TABLE "client_request_message" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "message" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  FOREIGN KEY ("request_id") REFERENCES "client_request"("id") ON DELETE CASCADE,
  FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE RESTRICT
);

CREATE INDEX "client_request_message_created_at_idx" ON "client_request_message" ("created_at");

CREATE INDEX "client_request_message_deleted_idx" ON "client_request_message" ("deleted");

CREATE INDEX "client_request_message_request_id_idx" ON "client_request_message" ("request_id");

CREATE INDEX "client_request_message_sender_id_idx" ON "client_request_message" ("sender_id");

CREATE TABLE "experience" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "location" TEXT,
  "description" TEXT NOT NULL,
  "start_date" TEXT NOT NULL,
  "end_date" TEXT,
  "current" INTEGER NOT NULL DEFAULT 0 CHECK ("current" IN (0,1)),
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "experience_created_at_idx" ON "experience" ("created_at");

CREATE INDEX "experience_deleted_idx" ON "experience" ("deleted");

CREATE INDEX "experience_sort_order_idx" ON "experience" ("sort_order");

CREATE TABLE "game_score" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX "game_score_created_at_idx" ON "game_score" ("created_at");

CREATE TABLE "gear" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "name" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "specifications" TEXT NOT NULL DEFAULT '',
  "image_url" TEXT NOT NULL DEFAULT '',
  "alt_text" TEXT NOT NULL,
  "product_url" TEXT NOT NULL DEFAULT '',
  "featured" INTEGER NOT NULL DEFAULT 0 CHECK ("featured" IN (0,1)),
  "published" INTEGER NOT NULL DEFAULT 0 CHECK ("published" IN (0,1)),
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "gear_created_at_idx" ON "gear" ("created_at");

CREATE INDEX "gear_deleted_idx" ON "gear" ("deleted");

CREATE INDEX "gear_published_idx" ON "gear" ("published");

CREATE INDEX "gear_sort_order_idx" ON "gear" ("sort_order");

CREATE TABLE "notification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "type" TEXT NOT NULL CHECK ("type" IN ('CLIENT_REQUEST','CLIENT_INQUIRY','CHAT_MESSAGE','SYSTEM')),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "metadata" TEXT,
  "read" INTEGER NOT NULL DEFAULT 0 CHECK ("read" IN (0,1)),
  "read_at" TEXT,
  "user_id" TEXT
);

CREATE INDEX "notification_created_at_idx" ON "notification" ("created_at");

CREATE INDEX "notification_deleted_idx" ON "notification" ("deleted");

CREATE INDEX "notification_user_id_idx" ON "notification" ("user_id");

CREATE TABLE "photograph" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "deleted_at" TEXT,
  "title" TEXT NOT NULL,
  "alt_text" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'Personal',
  "image_url" TEXT NOT NULL,
  "published" INTEGER NOT NULL DEFAULT 0 CHECK ("published" IN (0,1)),
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "photograph_created_at_idx" ON "photograph" ("created_at");

CREATE INDEX "photograph_deleted_idx" ON "photograph" ("deleted");

CREATE INDEX "photograph_published_idx" ON "photograph" ("published");

CREATE INDEX "photograph_sort_order_idx" ON "photograph" ("sort_order");

CREATE TABLE "project" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL,
  "short_summary" TEXT,
  "thumbnail_url" TEXT,
  "live_url" TEXT,
  "repo_url" TEXT,
  "category" TEXT,
  "featured" INTEGER NOT NULL DEFAULT 0 CHECK ("featured" IN (0,1)),
  "published" INTEGER NOT NULL DEFAULT 1 CHECK ("published" IN (0,1)),
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "project_created_at_idx" ON "project" ("created_at");

CREATE INDEX "project_deleted_idx" ON "project" ("deleted");

CREATE INDEX "project_published_idx" ON "project" ("published");

CREATE INDEX "project_sort_order_idx" ON "project" ("sort_order");

CREATE TABLE "project_tech" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "project_id" TEXT NOT NULL,
  "tech_id" TEXT NOT NULL,
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE,
  FOREIGN KEY ("tech_id") REFERENCES "tech_stack"("id") ON DELETE CASCADE,
  UNIQUE ("project_id","tech_id")
);

CREATE INDEX "project_tech_project_id_idx" ON "project_tech" ("project_id");

CREATE INDEX "project_tech_tech_id_idx" ON "project_tech" ("tech_id");

CREATE TABLE "project_image" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "project_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE
);

CREATE INDEX "project_image_created_at_idx" ON "project_image" ("created_at");

CREATE INDEX "project_image_project_id_idx" ON "project_image" ("project_id");

CREATE INDEX "project_image_sort_order_idx" ON "project_image" ("sort_order");

CREATE TABLE "site_content" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "key" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL
);

CREATE INDEX "site_content_created_at_idx" ON "site_content" ("created_at");

CREATE INDEX "site_content_deleted_idx" ON "site_content" ("deleted");

CREATE TABLE "tech_stack" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "name" TEXT NOT NULL UNIQUE,
  "category" TEXT,
  "icon_url" TEXT,
  "proficiency" INTEGER NOT NULL DEFAULT 50,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "tech_stack_created_at_idx" ON "tech_stack" ("created_at");

CREATE INDEX "tech_stack_deleted_idx" ON "tech_stack" ("deleted");

CREATE INDEX "tech_stack_sort_order_idx" ON "tech_stack" ("sort_order");

CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "deleted_at" TEXT,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0,1)),
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "role" TEXT NOT NULL DEFAULT 'ADMIN' CHECK ("role" IN ('OWNER','ADMIN','CLIENT')),
  "two_factor_secret" TEXT,
  "two_factor_enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("two_factor_enabled" IN (0,1)),
  "auth_id" TEXT NOT NULL UNIQUE,
  FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE
);

CREATE INDEX "user_created_at_idx" ON "user" ("created_at");

CREATE INDEX "user_deleted_idx" ON "user" ("deleted");

CREATE INDEX "user_auth_id_idx" ON "user" ("auth_id");
