# MY PORTFOLIO - Architecture Notes

This project is a full-stack portfolio system using the same general style as the DEOS project: clear modules, provider-driven backend logic, and a Vue admin/public frontend.

## Current Scope

The system includes:

- Public portfolio home page with hero, about, tech stack, projects, experience, certifications, and inquiry form.
- Public projects listing and project detail pages.
- Admin CMS for projects, tech stack, experience, certifications, client requests, chatbot knowledge, site content, users, and profile/security settings.
- AI chatbot with knowledge base, portfolio context, OpenAI fallback, and live admin takeover tools.
- Client portal for project inquiries and realtime project chat.
- Dynamic branding through Site Content: logo, favicon, title, meta description, hero content, other site content, and social links.

## Architecture

### Client

Path: `portfolio-client/`

Main technologies:

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- Pinia
- Vue Router
- Axios
- Socket.IO client

Key folders:

- `src/components/` - public and reusable UI components.
- `src/views/` - public, admin, and client portal pages.
- `src/layout/` - public/admin layout shells.
- `src/router/` - routes and guards.
- `src/stores/` - Pinia stores.
- `src/composables/` - API providers, socket helpers, branding/theme helpers.
- `src/types/` - shared frontend TypeScript types.

Important client files:

- `src/views/admin/SiteContentView.vue` - grouped Site Content CMS.
- `src/composables/useSiteBranding.ts` - loads and applies logo, favicon, title, and metadata.
- `src/views/admin/ClientRequestsView.vue` - admin inquiry management and realtime project chat.
- `src/views/ClientPortalView.vue` - client-facing inquiry/chat portal.
- `src/components/CertificationsSection.vue` - home page certifications section.

### Server

Path: `portfolio-server/`

Main technologies:

- NestJS
- TypeScript
- PostgreSQL
- Prisma
- JWT auth
- Socket.IO
- Nodemailer
- OpenAI SDK

Backend pattern:

- `src/contract/` - interfaces and app contract tokens.
- `src/provider/` - business logic.
- `src/controller/` - HTTP endpoints and DTOs.
- `src/module/` - Nest modules.
- `src/database/schema/` - Prisma schema files split by feature.
- `src/database/migrations/` - Prisma migrations.
- `src/gateway/realtime.gateway.ts` - Socket.IO realtime behavior.

## Data Model Areas

- Auth/User with OWNER, ADMIN, and CLIENT roles.
- Projects and project images.
- Tech stack and project-tech relationships.
- Experience.
- Certifications.
- Client requests, replies, client account link, and project chat messages.
- Chatbot knowledge, tags, conversations, and messages.
- Notifications.
- Site content key-value records.

## Realtime Behavior

Socket.IO is used for:

- Admin notification pushes.
- Visitor chatbot sessions and admin takeover.
- New inquiry pushes to admin via `client-request:new`.
- Project chat rooms via `project:<requestId>`.
- Project chat messages via `project-chat:message`.
- Project chat typing via `project-chat:typing`.

## Site Content Keys

Branding:

- `site_logo_text`
- `site_logo_subtitle`
- `site_logo_url`
- `site_favicon_url`
- `site_title`
- `site_meta_description`

Hero:

- `hero_title`
- `hero_subtitle`
- `hero_freelance_available`
- `hero_freelance_label`
- `hero_email`
- `hero_stat_1_value`
- `hero_stat_1_label`
- `hero_stat_2_value`
- `hero_stat_2_label`
- `hero_stat_3_value`
- `hero_stat_3_label`
- `hero_photo_url`

Other:

- `about_short`
- `cta_hire_me`
- `social_*`

## Common Commands

Frontend:

```bash
cd portfolio-client
npm run build
```

Backend:

```bash
cd portfolio-server
npm run build
npx prisma migrate deploy --schema ./src/database/schema
npm run migrate:seed
```

## Deployment

- Vercel deploys `portfolio-client`.
- Render deploys `portfolio-server`.
- Production frontend must set `VITE_API_ENDPOINT` to the Render API URL ending in `/api`.
- Production server should run Prisma generate/build during build and migrations during deploy/start.

## Maintenance Notes

- Keep frontend types updated when backend response shapes change.
- When adding a persisted feature, update Prisma schema, migration, contracts, provider, controller/DTO, module wiring, seed data, frontend provider/types/views, and docs.
- Restart the backend after changing controllers, modules, gateways, or upload endpoints.
- Do not commit `.env`, `node_modules`, `dist`, `client-dist`, or private upload data.

Last updated: 2026-05-04.
