# YouTube automation removal

AI YouTube Automation was removed from the portfolio on 2026-09-28. Its admin page, navigation, API endpoints, machine callbacks, background scheduler, providers, types, and feature-specific configuration declarations are no longer part of the application. The portfolio chatbot and YouTube social profile link remain independent features.

The reusable build prompt and historical implementation notes are saved outside this repository at `../AI_YOUTUBE_AUTOMATION_PROMPT.md` in the PROJECTS workspace.

## Database upgrade

Keep the original `20260827000000_youtube_automation` migration unchanged. The forward migration `20260928030000_retire_youtube_automation` moves its eight tables from `public` into `retired_youtube_automation`, preserving settings and historical records without exposing them through the app or its Prisma client.

When updating an existing deployment, stop the old backend/worker before applying migrations so its old scheduler cannot query retired tables. From `portfolio-server`, run:

```sh
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start
```

Fresh databases can apply the same complete migration history. The backend build cleans old compiled files so removed controllers and providers do not remain in deployment artifacts.

Remove obsolete automation-only variables from hosting configuration when convenient: `APP_API_URL`, all `N8N_*` variables, `SORA_API_KEY`, `ELEVENLABS_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GOOGLE_DRIVE_CONFIGURED`, `FFMPEG_CONFIGURED`, and `TEMP_STORAGE_DISK`. Keep `OPENAI_API_KEY` and `OPENAI_MODEL` for the portfolio chatbot. Existing local secret values have not been copied into the reusable prompt.

Any separately hosted n8n workflows are outside this repository; this removal does not modify that external service.
