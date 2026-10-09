-- Retire the unrelated automation feature without deleting existing settings/history.
-- Prisma manages the public schema; these archived tables are no longer used by the app.
BEGIN;

CREATE SCHEMA IF NOT EXISTS "retired_youtube_automation";

ALTER TABLE "public"."youtube_automation_settings" SET SCHEMA "retired_youtube_automation";
ALTER TABLE "public"."youtube_automation_schedules" SET SCHEMA "retired_youtube_automation";
ALTER TABLE "public"."youtube_automation_integrations" SET SCHEMA "retired_youtube_automation";
ALTER TABLE "public"."youtube_automation_batches" SET SCHEMA "retired_youtube_automation";
ALTER TABLE "public"."youtube_automation_jobs" SET SCHEMA "retired_youtube_automation";
ALTER TABLE "public"."youtube_automation_job_events" SET SCHEMA "retired_youtube_automation";
ALTER TABLE "public"."youtube_automation_approvals" SET SCHEMA "retired_youtube_automation";
ALTER TABLE "public"."youtube_automation_usage" SET SCHEMA "retired_youtube_automation";

COMMIT;
