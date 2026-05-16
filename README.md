# MY PORTFOLIO

A full-stack portfolio system for Jhon Lisley Jeresano with a public portfolio site, admin CMS, AI chatbot, certifications, client inquiry flow, and realtime project chat.

## Features

### Public Site
- Home page with hero, about, tech stack, featured projects, experience, certifications, and contact inquiry form.
- Project listing and project detail pages.
- Certifications section on the home page, managed from the admin CMS.
- AI chatbot widget with knowledge base and portfolio context.
- Dynamic branding from Site Content: logo, logo text, favicon, browser title, and meta description.

### Admin CMS
- Dashboard for portfolio overview.
- Projects CMS with images and tech stack assignments.
- Tech Stack CMS with icons, categories, proficiency, and sort order.
- Experience CMS.
- Certifications CMS with image/PDF certificate upload.
- Client Requests CMS with status management, email replies, client account creation, realtime inquiry notifications, and realtime project chat.
- Chatbot knowledge base and live conversation tools.
- Site Content CMS grouped into Branding, Hero Section, Other Site Content, and Social Media Links.
- Owner-only user management and profile/security settings.

### Client Portal
- Clients can sign in after an admin creates their client account.
- Clients can submit project inquiries from their portal.
- Clients can chat with the admin in real time, including typing indicators.

## Tech Stack

### Frontend
- Vue 3, TypeScript, Vite
- Tailwind CSS
- Pinia
- Vue Router
- Axios
- Socket.IO client

### Backend
- NestJS, TypeScript
- PostgreSQL
- Prisma
- JWT authentication
- Socket.IO gateway
- Nodemailer
- OpenAI integration

## Project Structure

```text
MY_PORTFOLIO/
  portfolio-client/      Vue 3 frontend, intended for Vercel
  portfolio-server/      NestJS backend, intended for Render
  AGENTS.md              Agent/developer workflow guidance
  README.md              Main project documentation
  QUICKSTART.md          Local setup guide
  CLAUDE.md              Architecture notes
  COMPLETED.md           Current completion/status summary
  INDEX.md               File and module index
```

## Local Setup

### Backend

```bash
cd portfolio-server
npm install
cp .env.example .env
npx prisma migrate dev --schema ./src/database/schema
npm run migrate:seed
npm run start:dev
```

API: `http://localhost:3000/api`

Swagger: `http://localhost:3000/docs`

### Frontend

```bash
cd portfolio-client
npm install
```

Create `.env.local`:

```env
VITE_API_ENDPOINT=http://localhost:3000/api
```

Start the client:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

## Default Admin

```text
Email: admin@portfolio.local
Password: Admin@123456
```

Change this password before deploying publicly.

## Important Commands

```bash
# Frontend build/type-check
cd portfolio-client
npm run build

# Backend build
cd portfolio-server
npm run build

# Apply production migrations
cd portfolio-server
npx prisma migrate deploy --schema ./src/database/schema

# Seed/update baseline content
cd portfolio-server
npm run migrate:seed
```

## Key API Areas

### Public
- `GET /api/projects`
- `GET /api/projects/slug/:slug`
- `GET /api/tech-stack`
- `GET /api/experiences`
- `GET /api/certifications`
- `GET /api/site-content`
- `POST /api/client-requests/submit`
- `POST /api/chatbot/chat`

### Client
- `POST /api/client-requests/my/submit`
- `GET /api/client-requests/my`
- `GET /api/client-requests/:id/chat`
- `POST /api/client-requests/:id/chat`

### Admin
- Projects, tech stack, experience, certifications, site content, chatbot knowledge, users, and client requests CRUD.
- `POST /api/client-requests/:id/client-account`
- `POST /api/client-requests/:id/reply`
- Upload endpoints:
  - `POST /api/upload/image`
  - `POST /api/upload/site-asset`
  - `POST /api/upload/certification`
  - `POST /api/upload/project-images/:projectId`

## Realtime Events

Socket.IO is used for:
- Admin notifications.
- Live chatbot conversations.
- New client inquiry events: `client-request:new`.
- Project chat messages: `project-chat:message`.
- Project chat typing indicators: `project-chat:typing`.

## Deployment

### Vercel Frontend
- Root directory: `portfolio-client`
- Build command: `npm run build`
- Output directory: `client-dist`
- Environment variable:
  - `VITE_API_ENDPOINT=https://your-render-api.onrender.com/api`

### Render Backend
- Root directory: `portfolio-server`
- Build command: `npm install && npx prisma generate --schema ./src/database/schema && npm run build`
- Start command: `npx prisma migrate deploy --schema ./src/database/schema && npm run start:prod`
- Configure all server environment variables in Render.

## Environment Notes

Backend `.env` must include database, JWT, mail, OpenAI, and app domain settings. Frontend `.env.local` only needs `VITE_API_ENDPOINT` for normal use.

## Status

Current status: full-stack implementation active and buildable. Client and server builds pass with `npm run build`.

Last updated: 2026-05-04.
