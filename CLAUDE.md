# MY PORTFOLIO - System Architecture & Implementation Guide

## Project Overview
A full-stack portfolio application for Jhon Lisley Jeresano featuring:
- **Public Site**: Portfolio showcase with typing animations, tech stack, projects, experience, and client request form
- **Admin CMS**: Manage projects, tech stack, experience, client requests, and train AI chatbot
- **AI Chatbot**: Portfolio assistant trained on site content and custom knowledge base
- **Client Request System**: Capture project inquiries with reply functionality

**Tech Stack**:
- Backend: NestJS + PostgreSQL + Prisma
- Frontend: Vue 3 + TypeScript + Tailwind CSS + Pinia
- AI: OpenAI API (gpt-4o-mini)
- Architecture Pattern: Mirrored from DEOS project (providers, contracts, validators, seeders)

---

## IMPLEMENTATION CHECKLIST

### ✅ COMPLETED - Server (Backend)

#### Configuration & Setup
- [x] `package.json` with NestJS + PostgreSQL dependencies
- [x] `tsconfig.json` with path alias `@app/*`
- [x] `nest-cli.json` for asset management
- [x] `.env.example` template
- [x] Database connection validation

#### Database (Prisma)
- [x] Schema files:
  - `main.prisma` - Generator & datasource config
  - `auth.prisma` - User authentication model
  - `user.prisma` - User with Role enum (OWNER, ADMIN)
  - `project.prisma` - Projects with many-to-many tech stack
  - `tech-stack.prisma` - Tech skills with proficiency
  - `experience.prisma` - Work experience timeline
  - `client-request.prisma` - Client project requests + replies
  - `chatbot.prisma` - Knowledge base + conversations + messages
  - `site-content.prisma` - Key-value site configuration

#### Contracts (Interfaces for DI)
- [x] `database.contract.ts` - PrismaClient type
- [x] `env.contract.ts` - Environment config structure
- [x] `utility.contract.ts` - Hash, slugify, error formatting
- [x] `auth.contract.ts` - Login, register, password change
- [x] `token.contract.ts` - JWT signing & verification
- [x] `user.contract.ts` - User CRUD
- [x] `project.contract.ts` - Project CRUD + slug lookup
- [x] `tech-stack.contract.ts` - Tech CRUD
- [x] `experience.contract.ts` - Experience CRUD
- [x] `client-request.contract.ts` - Request CRUD + replies
- [x] `chatbot.contract.ts` - KB management + chat endpoint
- [x] `site-content.contract.ts` - Site config CRUD
- [x] `mail.contract.ts` - Email sending
- [x] `contract/index.ts` - AppContract enum + exports

#### Providers (Business Logic)
- [x] `env.provider.ts` - Config service wrapper
- [x] `database.provider.ts` - Prisma client extension
- [x] `utility.provider.ts` - Hash (argon2), slugify, error formatting
- [x] `token.provider.ts` - JWT sign/verify
- [x] `auth.provider.ts` - Login, register, password change (full flow)
- [x] `user.provider.ts` - User CRUD + soft delete
- [x] `project.provider.ts` - Project CRUD + slug uniqueness
- [x] `tech-stack.provider.ts` - Tech CRUD
- [x] `experience.provider.ts` - Experience CRUD
- [x] `client-request.provider.ts` - Request CRUD + reply with email notify
- [x] `chatbot.provider.ts` - KB CRUD + chat with KB fallback → OpenAI → hardcoded fallback
- [x] `site-content.provider.ts` - Content upsert/delete
- [x] `mail.provider.ts` - Nodemailer wrapper (Gmail ready)

#### Common (Guards, Decorators, Strategies, Filters)
- [x] Decorators:
  - `current-user.decorator.ts` - @CurrentUser() param extractor
  - `roles.decorator.ts` - @Roles(...) metadata setter
- [x] Guards:
  - `access-token.guard.ts` - JWT validation
  - `role.guard.ts` - Role-based access control
- [x] Strategies:
  - `access-token.strategy.ts` - Passport JWT extraction & validation
- [x] Filters:
  - `all-exceptions.filter.ts` - Global exception handler
- [x] Env validation:
  - `env.validation.ts` - class-validator schema

#### Controllers (HTTP Endpoints)
- [x] `health.controller.ts` - GET /health
- [x] `auth.controller.ts` - POST /auth/login, register; GET /auth/whoami; POST /auth/change-password
- [x] `project.controller.ts` - CRUD endpoints + /projects/slug/:slug
- [x] `tech-stack.controller.ts` - CRUD endpoints
- [x] `experience.controller.ts` - CRUD endpoints (with date parsing)
- [x] `client-request.controller.ts` - POST /client-requests/submit (public); CRUD admin endpoints; POST /:id/reply
- [x] `chatbot.controller.ts` - POST /chatbot/chat (public); KB CRUD (protected); conversations list/get
- [x] `site-content.controller.ts` - GET (public); upsert/delete (protected)
- [x] `user.controller.ts` - User CRUD (OWNER only)

#### Request DTOs (Validators)
- [x] `auth-login.request.ts`
- [x] `auth-register.request.ts`
- [x] `change-password.request.ts`
- [x] `project.request.ts` (create & update)
- [x] `tech-stack.request.ts` (create & update)
- [x] `experience.request.ts` (create & update with date parsing)
- [x] `client-request.request.ts`
- [x] `client-request-reply.request.ts`
- [x] `client-request-status.request.ts`
- [x] `chatbot-knowledge.request.ts` (create & update)
- [x] `chatbot-chat.request.ts`
- [x] `site-content.request.ts`
- [x] `user.request.ts` (create & update)

#### Custom Validators
- [x] `email-unique.validator.ts` - Email existence check
- [x] `password-valid.validator.ts` - Strong password enforcement (8+ chars, upper, lower, digit)

#### Modules
- [x] `env.module.ts` - Global EnvProvider
- [x] `database.module.ts` - Global DatabaseProvider
- [x] `utility.module.ts` - Global UtilityProvider
- [x] `token.module.ts` - Global TokenProvider + JwtModule
- [x] `auth.module.ts` - Auth flow + PassportModule
- [x] `user.module.ts` - User management
- [x] `project.module.ts` - Project management
- [x] `tech-stack.module.ts` - Tech stack management
- [x] `experience.module.ts` - Experience management
- [x] `client-request.module.ts` - Client request management
- [x] `chatbot.module.ts` - Chatbot & KB management
- [x] `site-content.module.ts` - Site content management
- [x] `module/index.ts` - Barrel export

#### Main App Files
- [x] `app.module.ts` - Root module importing all feature modules
- [x] `app.migrate.module.ts` - Module for database seeders
- [x] `main.ts` - Bootstrap with Swagger, CORS, error handling, logging
- [x] `.prettierrc` - Code formatting (line width 120, tabs)
- [x] `.eslintrc.js` - TypeScript/ESLint config
- [x] `.gitignore` - Git exclusions
- [x] `src/database/seed.ts` - Seed admin user, tech stack, experiences, KB, site content

---

### ⏳ IN PROGRESS - Client (Frontend)

#### Scaffolding (TODO)
- [ ] Create `portfolio-client/` folder structure
- [ ] `package.json` with Vue 3, Vite, Tailwind, Pinia, axios
- [ ] Vite config with API proxy
- [ ] Tailwind config with black/blue theme + animations
- [ ] TypeScript config

#### Project Structure (TODO)
- [ ] `src/main.ts` - App bootstrap with Pinia, router, toasts
- [ ] `src/App.vue` - Root layout wrapper
- [ ] `src/router/index.ts` - Vue Router with public & protected routes
- [ ] `src/stores/` - Pinia stores (user, projects, chatbot)
- [ ] `src/composables/` - Composable hooks & API providers
- [ ] `src/views/` - Page components
- [ ] `src/components/` - Reusable UI components
- [ ] `src/types/` - TypeScript interfaces
- [ ] `src/assets/` - CSS, images, fonts

#### Pages (TODO)

**Public (No Auth)**:
- [ ] Home/Hero - Typing animation "Jhon Lisley Jeresano" → roles
- [ ] Projects - Gallery with filters, sorting, detail pages
- [ ] Tech Stack - Skills with proficiency bars + categories
- [ ] Experience - Timeline of work history
- [ ] Contact/Request Form - Client project submission
- [ ] Chatbot Widget - Floating AI assistant

**Admin (Protected)**:
- [ ] Login page
- [ ] Dashboard - Quick stats (requests, projects, conversations)
- [ ] Projects CMS - Create, edit, delete projects + tech association
- [ ] Tech Stack CMS - Manage skills & categories
- [ ] Experience CMS - Add/edit work history
- [ ] Client Requests - List, view, reply, change status
- [ ] Chatbot KB - Train with Q&A pairs
- [ ] Chatbot Conversations - View past conversations
- [ ] Site Content - Edit homepage text, about, etc.
- [ ] Users (OWNER) - Create/manage admin accounts

#### Components (TODO)
- [ ] Navbar - Navigation with admin link
- [ ] Footer - Links, contact info
- [ ] HeroSection - Typing animation + CTA buttons
- [ ] ProjectCard - Project preview with image + tech tags
- [ ] TechBadge - Tech name + proficiency indicator
- [ ] ExperienceTimeline - Vertical timeline with dates
- [ ] RequestForm - Multi-step form with validation
- [ ] ChatbotWidget - Message bubble interface
- [ ] AdminNav - Sidebar/top nav for CMS
- [ ] LoadingSpinner - Skeleton screens
- [ ] ConfirmDialog - Delete confirmations
- [ ] Breadcrumbs - Navigation helper

#### Composables/Services (TODO)
- [ ] `composables/provider/api.provider.ts` - Axios interceptor + GET/POST/PUT/DELETE
- [ ] `composables/provider/auth.provider.ts` - Login, register, whoami
- [ ] `composables/provider/project.provider.ts` - Project CRUD
- [ ] `composables/provider/chatbot.provider.ts` - Chat + KB management
- [ ] `composables/provider/client-request.provider.ts` - Request CRUD
- [ ] Utility composables - Date formatting, slugs, etc.

#### Stores (TODO)
- [ ] `stores/user.ts` - Auth state, login, logout
- [ ] `stores/projects.ts` - Cached projects, filters
- [ ] `stores/chatbot.ts` - Conversation history, messages
- [ ] `stores/ui.ts` - Modal states, notifications

#### Styling (TODO)
- [ ] Tailwind theme colors (black #000000, blue #0066ff, accent gold/cyan)
- [ ] Animation library integration (GSAP or Framer Motion equivalent)
- [ ] Dark mode support
- [ ] Responsive design (mobile-first)

#### Features (TODO)

**Public**:
- [ ] Hero section with typing animation (roles rotate)
- [ ] Project showcase with filtering by category
- [ ] Tech stack display with proficiency levels
- [ ] Experience timeline
- [ ] Client request form with validation
- [ ] Floating chatbot widget
- [ ] Toast notifications for errors/success

**Admin**:
- [ ] Protected routes with JWT
- [ ] CRUD forms for all resources
- [ ] Rich text editor for descriptions (or markdown)
- [ ] Image upload (or external URL)
- [ ] Bulk actions (archive, delete)
- [ ] Search & filter on all lists
- [ ] Pagination for large datasets
- [ ] Export data (CSV/PDF)

**Chatbot**:
- [ ] Train with custom Q&A pairs
- [ ] View conversation history
- [ ] Analytics (question frequency, satisfaction)
- [ ] Fallback message customization

---

## ARCHITECTURE NOTES

### Coding Style (Mirrored from DEOS)
- **Contracts**: Interface-based dependency injection
- **Providers**: Business logic implementation of contracts
- **Controllers**: HTTP handlers that delegate to providers
- **Modules**: Organize features into importable units
- **Validators**: Custom class-validator decorators for DTO validation
- **Guards**: Passport strategies + custom role/auth guards
- **Error Handling**: Global exception filter with consistent response shape
- **Response Format**: Always `{ success: bool, message: string, data?: T }`

### Database Soft Deletes
- All models have `deleted` boolean (default false) and `deletedAt` timestamp
- Prisma extensions auto-filter deleted records in finds
- Update/delete operations set flags instead of removing rows

### Auth Flow
1. User submits email + password to `/auth/login`
2. Provider hashes & compares with DB
3. On match: sign JWT with user ID, email, role, name
4. Return `{ accessToken, user: { id, email, role, firstName, lastName } }`
5. Frontend stores token in localStorage/cookie
6. Protected endpoints validate JWT via `AccessTokenGuard` + optional `RoleGuard`

### Chatbot Flow
1. User sends message via `/chatbot/chat`
2. Message + session stored in DB
3. Provider attempts KB keyword matching
4. If KB match found → return answer, source: 'KB'
5. Else → call OpenAI with system prompt (portfolio context + KB + projects)
6. If OpenAI succeeds → return answer, source: 'AI'
7. Fallback → generic message, source: 'FALLBACK'

---

## NEXT STEPS (In Priority Order)

### Server - CRITICAL
1. ✅ Server scaffold complete! Ready for testing
2. ✅ Database schemas defined (run `npx prisma migrate dev --name init`)
3. ✅ Seed script ready (run `npm run migrate:seed`)
4. Test all endpoints with Postman/Insomnia
5. Setup local PostgreSQL and run migrations
6. Fix any TypeScript compilation errors

### Client - HIGH PRIORITY
1. Scaffold Vue 3 + Vite project structure
2. Build reusable component library (buttons, inputs, modals)
3. Create public pages (Hero, Projects, Tech, Experience, Contact)
4. Implement auth flow (login, token storage, protected routes)
5. Build admin CMS pages (CRUD forms)
6. Implement chatbot widget

### Deployment
1. Containerize (Docker files for server + client)
2. Set up GitHub Actions CI/CD
3. Deploy to Vercel (frontend) + Railway/Render (backend)
4. Configure custom domain
5. Set up email service (Gmail app password or SendGrid)

---

## FILE STRUCTURE SUMMARY

```
MY PORTFOLIO/
├── portfolio-server/
│   ├── src/
│   │   ├── common/          # Guards, decorators, filters, strategies, types
│   │   ├── contract/        # Interfaces for DI
│   │   ├── controller/      # HTTP endpoints + request DTOs + validators
│   │   ├── database/        # Prisma schema + seeders (TODO)
│   │   ├── module/          # NestJS module definitions
│   │   ├── provider/        # Business logic implementation
│   │   ├── app.module.ts    # Root module (TODO)
│   │   └── main.ts          # Bootstrap (TODO)
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── .env.example
│
└── portfolio-client/
    ├── src/
    │   ├── components/      # Reusable UI components (TODO)
    │   ├── composables/     # Hooks & API providers (TODO)
    │   ├── router/          # Vue Router config (TODO)
    │   ├── stores/          # Pinia stores (TODO)
    │   ├── types/           # TypeScript interfaces (TODO)
    │   ├── views/           # Page components (TODO)
    │   ├── App.vue          # Root (TODO)
    │   └── main.ts          # Bootstrap (TODO)
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## ENVIRONMENT VARIABLES

### Server (.env)
```
NODE_ENV=development
APP_PORT=3000
APP_DOMAIN=http://localhost:5173
APP_TOKEN=your-secret-key

DATABASE_URL=postgresql://user:password@localhost:5432/portfolio

ACCESS_TOKEN_SECRET=your-jwt-secret
ACCESS_TOKEN_EXPIRES_IN=1d

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=itsajhon@gmail.com
MAIL_PASS=app-specific-password

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Client (.env.local)
```
VITE_API_ENDPOINT=http://localhost:3000/api
VITE_APP_NAME="MY PORTFOLIO"
```

---

## TESTING NOTES
- Unit tests: Jest (server) + Vitest (client)
- E2E tests: Cypress or Playwright
- API testing: Postman collections for manual testing
- Chatbot: Test KB matching, OpenAI fallback, conversation persistence

---

## DESIGN REFERENCE
- **Colors**: Black (#000000), Blue (#0066ff), Gold (#FFD700) accents, Cyan highlights
- **Typography**: Inter font (sans-serif), clear hierarchy
- **Animations**: Smooth transitions, typing effect on hero, hover states on cards
- **Responsive**: Mobile-first, breakpoints at 640px, 1024px, 1280px
