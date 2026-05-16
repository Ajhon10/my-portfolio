# AGENTS.md

This file defines the working rules for AI agents and developers contributing to this portfolio project. The project follows the same general architecture style used in the DEOS project: a Vue 3 client, a NestJS server, and a contract/provider/module-based backend structure.

## Project Context

This repository contains a full-stack portfolio system:

- `portfolio-client/` - Vue 3, TypeScript, Vite, Tailwind CSS, Pinia, Vue Router, Axios.
- `portfolio-server/` - NestJS, TypeScript, PostgreSQL, Prisma, JWT auth, Socket.IO, OpenAI integration.
- The client is intended for Vercel deployment with `portfolio-client` as the root directory.
- The server is intended for Render deployment with `portfolio-server` as the root directory.

Use Git from the repository root:

```bash
cd MY_PORTFOLIO
git status
git add portfolio-client portfolio-server
git commit -m "Describe the change"
git push
```

Use app commands from the app folder:

```bash
cd portfolio-client
npm run build

cd portfolio-server
npm run build
```

Never commit `.env`, `node_modules`, `dist`, `client-dist`, uploads containing private user data, or generated local build artifacts.

## Shared Engineering Rules

- Preserve the existing architecture before adding new patterns.
- Keep frontend and backend changes aligned when a feature crosses both sides.
- Prefer small, focused changes over broad rewrites.
- Keep names clear and consistent with existing files.
- Add or update TypeScript types when request or response shapes change.
- Add loading, empty, error, and success states for user-facing workflows.
- Keep authentication and role checks consistent between backend guards and frontend routes.
- Update documentation when setup, commands, environment variables, or deployment behavior changes.
- Do not store secrets, tokens, passwords, API keys, or private credentials in committed files.

## Fullstack Developer Agent

Use this role when implementing features, fixing bugs, connecting client and server behavior, or preparing deployment changes.

### Backend Responsibilities

- Follow the NestJS structure used in this project:
  - `src/contract/` for interfaces and app contract tokens.
  - `src/provider/` for business logic.
  - `src/controller/` for HTTP endpoints and request DTOs.
  - `src/module/` for NestJS module wiring.
  - `src/common/` for guards, decorators, strategies, filters, and shared framework code.
  - `src/database/` for Prisma schema, seeders, and database setup.
- If a feature changes persisted data, update Prisma schema files first.
- Keep provider logic out of controllers.
- Validate request bodies with DTOs and class-validator.
- Return consistent API responses and errors.
- Respect soft-delete behavior where the project already uses it.
- Protect admin endpoints with JWT and role guards.
- Keep public endpoints limited to data that should be visible publicly.

### Frontend Responsibilities

- Follow the Vue structure used in this project:
  - `src/views/` for pages.
  - `src/components/` for reusable UI.
  - `src/layout/` for layout shells.
  - `src/router/` for route definitions and guards.
  - `src/stores/` for Pinia state.
  - `src/composables/` for reusable logic and API providers.
  - `src/types/` for shared TypeScript interfaces.
- Keep API calls centralized in composables/providers instead of scattering Axios calls across views.
- Keep admin CMS screens efficient, readable, and form-driven.
- Keep public pages polished, responsive, and portfolio-focused.
- Match backend response types with frontend TypeScript interfaces.
- Make protected pages handle expired or missing auth cleanly.

### Feature Workflow

1. Understand whether the feature touches client, server, database, or all three.
2. For backend features, update schema, contract, provider, DTO/controller, module wiring, and seed data if needed.
3. For frontend features, update types, API provider/composable, store state, routes, views, and components as needed.
4. Check auth, roles, validation, error handling, loading states, and empty states.
5. Run relevant verification commands before finishing.

Useful checks:

```bash
cd portfolio-client
npm run build

cd portfolio-server
npm run build
npm run test
```

## QA Agent

Use this role when testing features, finding regressions, preparing releases, or checking deployment readiness.

### QA Responsibilities

- Verify that the system works from the user's point of view, not only that the code compiles.
- Test public pages, admin pages, API endpoints, authentication, authorization, and data persistence.
- Confirm that client and server environment variables are set correctly.
- Check both happy paths and failure paths.
- Look for regressions in features that share providers, stores, guards, layouts, or reusable components.
- Record clear reproduction steps for every issue found.

### Required Test Areas

- Public portfolio pages:
  - Home/hero content.
  - Branding, logo, favicon, browser title, and meta description from Site Content.
  - Projects list and project detail page.
  - Tech stack display.
  - Experience timeline.
  - Certifications section on the home page.
  - Contact/client request form.
  - Chatbot widget.
- Admin CMS:
  - Login/logout.
  - Dashboard.
  - Projects CRUD.
  - Tech stack CRUD.
  - Experience CRUD.
  - Certifications CRUD and certificate upload.
  - Client requests list, status update, and reply.
  - Client account creation from inquiries.
  - Realtime project chat and typing indicators.
  - Chatbot knowledge base and conversations.
  - Site content management grouped into Branding, Hero Section, Other Site Content, and Social Media Links.
  - Owner-only user management.
  - Client portal access for CLIENT users.
- Backend:
  - Health endpoint.
  - Public endpoints.
  - Protected endpoints.
  - Role-restricted endpoints.
  - Validation errors.
  - Database writes and reads.
  - Email and OpenAI fallback behavior when configured.
- Frontend:
  - Type-check/build.
  - Route guards.
  - Loading, empty, error, and success states.
  - Mobile, tablet, and desktop responsiveness.
  - Form validation and disabled states.
- Deployment:
  - Vercel root directory is `portfolio-client`.
  - Render root directory is `portfolio-server`.
  - Environment variables are configured in hosting dashboards.
  - No local-only paths or localhost URLs are hardcoded for production.

Useful checks:

```bash
cd portfolio-client
npm run build
npm run lint

cd portfolio-server
npm run build
npm run test
npm run lint
```

## UI/UX Designer Agent

Use this role when creating or improving layouts, components, user flows, dashboards, forms, and public portfolio pages.

### Design Direction

- Create clean, modern, professional UI that matches the DEOS and Portfolio style.
- Prefer practical, readable layouts over decorative pages.
- Make admin screens dense enough for real work, with clear tables, filters, forms, actions, and status indicators.
- Make public pages visually polished and portfolio-focused without hiding important content behind decoration.
- Keep spacing, typography, borders, colors, and component behavior consistent.
- Use Tailwind utilities in a maintainable way.
- Use existing components and layout patterns before creating new ones.

### UI Requirements

- Every interactive control should have clear hover, focus, active, disabled, loading, and error states when relevant.
- Forms should have labels, validation feedback, helpful placeholders, and predictable submit behavior.
- Tables and lists should have empty states and loading states.
- Modals and destructive actions should have clear confirmation flows.
- Text must not overlap, overflow awkwardly, or become unreadable on mobile.
- Dashboards should prioritize scanability and repeated use.
- Public pages should feel polished but still fast, readable, and responsive.
- Use accessible contrast and keyboard-friendly controls.

### Visual Style Guardrails

- Keep the portfolio identity visible and professional.
- Avoid cluttered cards, excessive gradients, and decorative elements that do not support the workflow.
- Keep cards and panels restrained, with consistent radius, border, and shadow usage.
- Use icons where they improve recognition, especially in action buttons and navigation.
- Keep responsive behavior intentional for mobile, tablet, and desktop.

## Documentation Strategy

Use one root `AGENTS.md` per project as the main instruction file. This is better than one global file for all projects because each project has its own structure, commands, deployment settings, and design rules.

A shared template can be reused across DEOS, Portfolio, and future projects, but each repository should still keep its own project-specific `AGENTS.md`.

Recommended setup:

- `AGENTS.md` - Main roles, architecture rules, workflow, and verification checklist.
- `CONTEXT.md` - Optional. Use only when project architecture or domain rules become too large for `AGENTS.md`.
- `TESTING.md` - Optional. Better than `QA Agent.md` if the project needs detailed manual and automated test plans.
- `MEMORY.md` - Optional. Use only for non-secret decisions, tradeoffs, and project history. Do not store credentials or private notes.
- `SKILLS.md` - Optional. Use only if the project has repeatable commands or specialized workflows that are not already clear from README files.

For this project, start with `AGENTS.md`. Add separate files only when this file becomes too long or when the information needs a dedicated home.
