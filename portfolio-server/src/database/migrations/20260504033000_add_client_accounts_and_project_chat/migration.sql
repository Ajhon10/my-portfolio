-- Add CLIENT role for customer accounts.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT';

-- Link inquiries to client accounts.
ALTER TABLE "client_request" ADD COLUMN "client_user_id" UUID;

-- Create project inquiry chat messages.
CREATE TABLE "client_request_message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,

    CONSTRAINT "client_request_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_request_message_request_id_created_at_idx" ON "client_request_message"("request_id", "created_at");

ALTER TABLE "client_request" ADD CONSTRAINT "client_request_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client_request_message" ADD CONSTRAINT "client_request_message_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "client_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_request_message" ADD CONSTRAINT "client_request_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
