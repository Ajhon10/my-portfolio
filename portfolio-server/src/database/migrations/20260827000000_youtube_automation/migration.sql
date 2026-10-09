CREATE TABLE "youtube_automation_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "enabled" BOOLEAN NOT NULL DEFAULT false,
    "channel_niche" TEXT NOT NULL, "content_format" VARCHAR(30) NOT NULL DEFAULT 'SHORT',
    "min_duration_seconds" INTEGER NOT NULL DEFAULT 45, "max_duration_seconds" INTEGER NOT NULL DEFAULT 60,
    "story_categories" JSONB NOT NULL, "ideas_per_job" INTEGER NOT NULL DEFAULT 3, "scene_count" INTEGER NOT NULL DEFAULT 8,
    "max_sora_scenes" INTEGER NOT NULL DEFAULT 2, "image_quality" VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
    "ai_narrator" VARCHAR(100) NOT NULL DEFAULT 'ElevenLabs', "narrator_voice_id" VARCHAR(255),
    "visual_style" TEXT NOT NULL DEFAULT 'Cinematic near-future realism', "title_approval_required" BOOLEAN NOT NULL DEFAULT true,
    "final_approval_required" BOOLEAN NOT NULL DEFAULT true, "monthly_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PHP', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "youtube_automation_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "youtube_automation_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "is_active" BOOLEAN NOT NULL DEFAULT false,
    "frequency" VARCHAR(30) NOT NULL DEFAULT 'MANUAL', "days_of_week" JSONB, "run_time" VARCHAR(5) NOT NULL DEFAULT '09:00',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Manila', "videos_per_run" INTEGER NOT NULL DEFAULT 1,
    "max_videos_per_day" INTEGER NOT NULL DEFAULT 3, "start_date" DATE, "last_run_at" TIMESTAMP(3), "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "youtube_automation_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "youtube_automation_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "provider" VARCHAR(50) NOT NULL, "status" VARCHAR(30) NOT NULL DEFAULT 'NOT_CONNECTED',
    "masked_identifier" VARCHAR(255), "last_tested_at" TIMESTAMP(3), "error_message" TEXT, "plan_name" VARCHAR(100),
    "monthly_plan_cost" DECIMAL(12,2) NOT NULL DEFAULT 0, "monthly_quota" VARCHAR(255), "renewal_date" DATE, "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "youtube_automation_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "youtube_automation_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "uuid" UUID NOT NULL, "source" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "status" VARCHAR(40) NOT NULL DEFAULT 'QUEUED', "requested_count" INTEGER NOT NULL, "scheduled_for" TIMESTAMP(3),
    "started_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "youtube_automation_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "youtube_automation_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "uuid" UUID NOT NULL, "batch_id" UUID NOT NULL, "sequence" INTEGER NOT NULL,
    "title" TEXT, "concept" TEXT, "hook" TEXT, "title_options" JSONB, "description" TEXT, "tags" JSONB, "hashtags" JSONB,
    "pinned_comment" TEXT, "script" TEXT, "metadata_text" TEXT, "status" VARCHAR(40) NOT NULL DEFAULT 'QUEUED',
    "n8n_execution_id" VARCHAR(255), "estimated_cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "actual_cost" DECIMAL(12,4) NOT NULL DEFAULT 0, "duration_seconds" INTEGER, "thumbnail_path" TEXT, "video_path" TEXT,
    "google_drive_path" TEXT, "google_drive_status" VARCHAR(30) NOT NULL DEFAULT 'NOT_UPLOADED', "error_message" TEXT,
    "started_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3), "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "youtube_automation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "youtube_automation_job_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "job_id" UUID NOT NULL, "event_type" VARCHAR(60) NOT NULL,
    "stage" VARCHAR(60), "status" VARCHAR(40), "message" TEXT, "execution_id" VARCHAR(255),
    "estimated_cost" DECIMAL(12,4), "actual_cost" DECIMAL(12,4), "started_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3),
    "payload" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "youtube_automation_job_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "youtube_automation_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "job_id" UUID NOT NULL, "approval_type" VARCHAR(30) NOT NULL,
    "proposed_value" JSONB, "selected_value" TEXT, "decision" VARCHAR(30) NOT NULL DEFAULT 'PENDING', "decided_by" VARCHAR(255),
    "approval_channel" VARCHAR(30), "telegram_user_id" VARCHAR(100), "admin_user_id" UUID, "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "youtube_automation_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "youtube_automation_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "job_id" UUID, "provider" VARCHAR(50) NOT NULL, "usage_type" VARCHAR(60) NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL, "unit" VARCHAR(30) NOT NULL, "estimated_cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "actual_cost" DECIMAL(12,4), "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "youtube_automation_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "youtube_automation_integrations_provider_key" ON "youtube_automation_integrations"("provider");
CREATE UNIQUE INDEX "youtube_automation_batches_uuid_key" ON "youtube_automation_batches"("uuid");
CREATE UNIQUE INDEX "youtube_automation_jobs_uuid_key" ON "youtube_automation_jobs"("uuid");
CREATE UNIQUE INDEX "youtube_automation_jobs_batch_id_sequence_key" ON "youtube_automation_jobs"("batch_id", "sequence");
CREATE UNIQUE INDEX "youtube_automation_approvals_job_id_approval_type_key" ON "youtube_automation_approvals"("job_id", "approval_type");
CREATE INDEX "youtube_automation_schedules_is_active_next_run_at_idx" ON "youtube_automation_schedules"("is_active", "next_run_at");
CREATE INDEX "youtube_automation_batches_status_created_at_idx" ON "youtube_automation_batches"("status", "created_at");
CREATE INDEX "youtube_automation_jobs_status_created_at_idx" ON "youtube_automation_jobs"("status", "created_at");
CREATE INDEX "youtube_automation_jobs_batch_id_created_at_idx" ON "youtube_automation_jobs"("batch_id", "created_at");
CREATE INDEX "youtube_automation_jobs_n8n_execution_id_idx" ON "youtube_automation_jobs"("n8n_execution_id");
CREATE INDEX "youtube_automation_job_events_job_id_created_at_idx" ON "youtube_automation_job_events"("job_id", "created_at");
CREATE INDEX "youtube_automation_approvals_decision_created_at_idx" ON "youtube_automation_approvals"("decision", "created_at");
CREATE INDEX "youtube_automation_usage_provider_occurred_at_idx" ON "youtube_automation_usage"("provider", "occurred_at");
CREATE INDEX "youtube_automation_usage_job_id_idx" ON "youtube_automation_usage"("job_id");

ALTER TABLE "youtube_automation_jobs" ADD CONSTRAINT "youtube_automation_jobs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "youtube_automation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "youtube_automation_job_events" ADD CONSTRAINT "youtube_automation_job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "youtube_automation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "youtube_automation_approvals" ADD CONSTRAINT "youtube_automation_approvals_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "youtube_automation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "youtube_automation_usage" ADD CONSTRAINT "youtube_automation_usage_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "youtube_automation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
