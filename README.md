# Jhon's portfolio

One integrated Vue 3 + TypeScript application deployed to Cloudflare Workers
with D1 and a SQLite Durable Object. The public design, admin CMS, owner/admin/
client roles, authenticator login, project inquiries/chat, chatbot with live
takeover, photography, gears, certifications and portfolio game are retained.

There are no separately deployed client/server applications. Run commands at
the repository root; Vue lives in `src/`, HTTP/live backend code in `worker/`,
and database migrations in `migrations/`.

```sh
npm ci
npm run setup
npm run owner:create
npm run dev
```

On this workstation the existing portfolio has already been restored to local
D1. Reset the existing owner's password with `npm run owner:create -- --reset`
instead of creating a new owner, then enroll the authenticator on sign-in.

```sh
npm test
npm run test:browser
npm run build
npm run deploy:check
```

See [local setup, Cloudflare deployment and data restoration](docs/cloudflare-deployment.md),
[architecture decisions](docs/cloudflare-unified-architecture.md), and
[verification evidence and release limits](docs/ENGINEERING_ACCEPTANCE.md).

Cloudflare account setup and a real D1 binding are still required before remote
deployment. Core hosting targets the Free plan. Optional AI and email providers
are separate integrations; the app works without their credentials. Private
records, secrets, uploads, local database state and backup archives stay out of Git.

Historical NestJS/Vercel documents are under `docs/legacy/`; the original source
is recoverable from Git and the private pre-conversion backup.
