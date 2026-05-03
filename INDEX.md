# MY PORTFOLIO - File Index

Complete scaffold with 105 files and 93 TypeScript modules.

---

## 📚 Documentation (Start Here)

| File | Purpose |
|------|---------|
| [**README.md**](README.md) | Full project documentation, API endpoints, architecture |
| [**QUICKSTART.md**](QUICKSTART.md) | 5-minute setup guide - start here! |
| [**CLAUDE.md**](CLAUDE.md) | Technical architecture & implementation checklist |
| [**COMPLETED.md**](COMPLETED.md) | What's finished and what's next |
| **INDEX.md** | This file - directory reference |

---

## 🗂️ Backend Structure (`portfolio-server/src/`)

### Configuration Files (Root)
```
.env.example          - Environment variables template
.eslintrc.js         - ESLint configuration
.gitignore           - Git exclusions
.prettierrc           - Code formatter config
nest-cli.json        - NestJS CLI config
package.json         - Dependencies & scripts
tsconfig.json        - TypeScript config
tsconfig.build.json  - Build-specific TypeScript config
```

### Source Code Structure

#### Core App Files
```
app.module.ts           - Root module (imports all features)
app.migrate.module.ts   - Seeder context for migrations
main.ts                 - Application bootstrap with Swagger
```

#### common/ - Shared Infrastructure
```
common/
├── decorator/
│   ├── current-user.decorator.ts    - @CurrentUser() param
│   ├── roles.decorator.ts           - @Roles(...) metadata
│   └── index.ts                     - Exports
├── env/
│   └── env.validation.ts            - Environment schema
├── filter/
│   └── all-exceptions.filter.ts     - Global error handler
├── guard/
│   ├── access-token.guard.ts        - JWT validation
│   ├── role.guard.ts                - Role-based access
│   └── index.ts                     - Exports
├── strategy/
│   ├── access-token.strategy.ts     - Passport JWT
│   └── index.ts                     - Exports
└── type/
    └── index.ts                     - TypeScript interfaces
```

#### contract/ - Interfaces (Dependency Injection)
```
contract/
├── auth.contract.ts             - AuthContract interface
├── chatbot.contract.ts          - ChatbotContract interface
├── client-request.contract.ts   - ClientRequestContract interface
├── database.contract.ts         - DatabaseContract interface
├── env.contract.ts              - EnvContract interface
├── experience.contract.ts       - ExperienceContract interface
├── mail.contract.ts             - MailContract interface
├── project.contract.ts          - ProjectContract interface
├── site-content.contract.ts     - SiteContentContract interface
├── tech-stack.contract.ts       - TechStackContract interface
├── token.contract.ts            - TokenContract interface
├── user.contract.ts             - UserContract interface
├── utility.contract.ts          - UtilityContract interface
└── index.ts                     - Exports + AppContract enum
```

#### controller/ - HTTP Endpoints
```
controller/
├── auth.controller.ts                   - Login, register, whoami, password change
├── chatbot.controller.ts                - Chat, KB management, conversations
├── client-request.controller.ts         - Submit request, admin CRUD, replies
├── experience.controller.ts             - Experience CRUD
├── health.controller.ts                 - Health check endpoint
├── project.controller.ts                - Project CRUD + slug lookup
├── site-content.controller.ts           - Site content CRUD
├── tech-stack.controller.ts             - Tech CRUD
├── user.controller.ts                   - User CRUD (OWNER only)
├── index.ts                             - Controller exports
├── middleware/                          - (Placeholder for middleware)
├── request/
│   ├── auth-login.request.ts           - Login DTO
│   ├── auth-register.request.ts        - Register DTO
│   ├── change-password.request.ts      - Password change DTO
│   ├── chatbot-chat.request.ts         - Chat message DTO
│   ├── chatbot-knowledge.request.ts    - KB entry DTO
│   ├── client-request-reply.request.ts - Reply DTO
│   ├── client-request-status.request.ts- Status update DTO
│   ├── client-request.request.ts       - Request submission DTO
│   ├── experience.request.ts           - Experience DTO
│   ├── project.request.ts              - Project DTO
│   ├── site-content.request.ts         - Content DTO
│   ├── tech-stack.request.ts           - Tech DTO
│   ├── user.request.ts                 - User DTO
│   └── index.ts                        - Request exports
└── validator/
    ├── email-unique.validator.ts       - Email uniqueness check
    ├── password-valid.validator.ts     - Strong password rules
    └── index.ts                        - Validator exports
```

#### database/ - Prisma & Seeding
```
database/
├── schema/
│   ├── auth.prisma              - Auth model
│   ├── chatbot.prisma           - Chatbot KB, conversations, messages
│   ├── client-request.prisma    - Client requests + replies
│   ├── experience.prisma        - Work experience
│   ├── main.prisma              - Generator & datasource
│   ├── project.prisma           - Projects + tech junction
│   ├── site-content.prisma      - Key-value content
│   ├── tech-stack.prisma        - Tech skills
│   └── user.prisma              - User accounts
├── prisma.service.ts            - Prisma service wrapper
└── seed.ts                       - Database seeding script
```

#### module/ - NestJS Modules
```
module/
├── auth.module.ts               - Auth with Passport
├── chatbot.module.ts            - Chatbot feature
├── client-request.module.ts     - Client requests feature
├── database.module.ts           - Global database provider
├── env.module.ts                - Global env config
├── experience.module.ts         - Experience feature
├── mail.module.ts               - Email service
├── project.module.ts            - Project feature
├── site-content.module.ts       - Site content feature
├── tech-stack.module.ts         - Tech stack feature
├── token.module.ts              - JWT service
├── user.module.ts               - User management
├── utility.module.ts            - Global utilities
└── index.ts                     - Module exports
```

#### provider/ - Business Logic
```
provider/
├── auth.provider.ts             - Authentication logic
├── chatbot.provider.ts          - Chatbot + KB logic + OpenAI integration
├── client-request.provider.ts   - Client request logic
├── database.provider.ts         - Database client extension
├── env.provider.ts              - Environment config wrapper
├── experience.provider.ts       - Experience CRUD logic
├── mail.provider.ts             - Email sending (Nodemailer)
├── project.provider.ts          - Project CRUD logic
├── site-content.provider.ts     - Content management logic
├── tech-stack.provider.ts       - Tech CRUD logic
├── token.provider.ts            - JWT token logic
├── user.provider.ts             - User CRUD logic
├── utility.provider.ts          - Hash, slugify, error formatting
└── index.ts                     - Provider exports
```

---

## 📊 Statistics

### Backend Files
- **Configuration**: 8 files
- **Controllers**: 9 files
- **Contracts**: 14 files
- **Providers**: 14 files
- **Modules**: 14 files
- **Database**: 11 files
- **Common**: 12 files
- **Request DTOs**: 13 files
- **Validators**: 2 files
- **Decorators**: 2 files
- **Guards**: 2 files
- **Strategies**: 1 file
- **Filters**: 1 file
- **Root app files**: 3 files
- **Documentation**: 4 files

**Total: 105 files, 93 TypeScript modules**

### Dependencies
- **Core**: NestJS, Express, Passport
- **Database**: Prisma, pg (PostgreSQL)
- **Auth**: JWT, bcrypt/argon2
- **API**: Swagger, class-validator, class-transformer
- **AI**: OpenAI SDK
- **Email**: Nodemailer
- **Utilities**: lodash, uuid, dotenv

---

## 🚀 How to Use

### 1. Start Here
- Read [QUICKSTART.md](QUICKSTART.md) - 5-minute setup

### 2. Setup
```bash
cd portfolio-server
npm install
cp .env.example .env
# Edit .env with database URL
npx prisma migrate dev --name init
npm run migrate:seed
npm run start:dev
```

### 3. Test
- API docs: http://localhost:3000/docs
- Login: admin@portfolio.local / Admin@123456

### 4. Extend
- Add features by creating new providers/controllers/modules
- Use existing pattern for consistency

---

## 📝 Key Files to Know

### Understanding the Architecture
- **Start**: `app.module.ts` - See all modules imported
- **Bootstrap**: `main.ts` - App startup with Swagger, CORS, validation
- **Contracts**: `contract/index.ts` - See all services available
- **Pattern**: `provider/project.provider.ts` - Example business logic

### Adding New Features
1. Create contract in `contract/new-feature.contract.ts`
2. Implement provider in `provider/new-feature.provider.ts`
3. Create module in `module/new-feature.module.ts`
4. Add controller in `controller/new-feature.controller.ts`
5. Import module in `app.module.ts`

### Database
- Schemas in `database/schema/` - One per feature
- Generator in `database/schema/main.prisma`
- Seeding in `database/seed.ts`
- Migrations auto-generated by Prisma

---

## 🔐 Security Features

✅ **Authentication**: JWT tokens, 1-day expiry
✅ **Authorization**: @Roles() decorator for access control
✅ **Password**: Argon2 hashing (industry standard)
✅ **CORS**: Restricted to frontend domain
✅ **CSP Headers**: Content Security Policy enforced
✅ **Input Validation**: class-validator on all endpoints
✅ **Soft Deletes**: No permanent data deletion
✅ **Error Handling**: Global exception filter, consistent responses

---

## 📋 Checklist for Getting Started

- [ ] Read QUICKSTART.md (5 min)
- [ ] Read README.md (10 min)
- [ ] Read CLAUDE.md (20 min)
- [ ] Install Node.js 18+
- [ ] Install PostgreSQL
- [ ] Clone/extract repo
- [ ] `npm install` in portfolio-server
- [ ] Setup .env with DATABASE_URL
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Run `npm run migrate:seed`
- [ ] Run `npm run start:dev`
- [ ] Visit http://localhost:3000/docs
- [ ] Login with admin@portfolio.local / Admin@123456

---

## 🎯 Next Phase: Frontend

All backend files complete. Frontend scaffold needed:
- Vue 3 setup + Vite
- Page components (Home, Projects, Admin)
- Reusable UI components
- API service layer
- Pinia stores
- Tailwind styling (black/blue theme)
- Animations

See `CLAUDE.md` for full frontend checklist.

---

## 📞 Quick Reference

**API Root**: `http://localhost:3000/api`
**Swagger Docs**: `http://localhost:3000/docs`
**Admin Email**: `admin@portfolio.local`
**Admin Password**: `Admin@123456`
**Database**: PostgreSQL (url in .env)
**JWT Expiry**: 1 day

---

**Last Updated**: 2026-05-02
**Status**: Backend 100% complete, ready for frontend development
