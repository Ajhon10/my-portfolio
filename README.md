# Jhon's portfolio

One integrated Vue 3 + TypeScript application deployed to Cloudflare Workers
with D1 and a SQLite Durable Object. The public design, admin CMS, owner/admin/
client roles, authenticator login, project inquiries/chat, chatbot with live
takeover, photography, gears, certifications and portfolio game are retained.

There are no separately deployed client/server applications. Run commands at
the repository root; Vue lives in `src/`, HTTP/live backend code in `worker/`,
and database migrations in `migrations/`.

For the incomplete Cloudflare installation, start with the
[complete Cloudflare setup guide](docs/cloudflare-deployment.md). It separates
dashboard settings, PC commands, production restoration and first login.

The commands below are for a **fresh local database**, not production. On this
workstation the existing portfolio was already restored locally: reset the
existing owner's password with `npm run owner:create -- --reset` instead of
creating another owner, then enroll the authenticator on sign-in.

```sh
npm ci
npm run setup
npm run owner:create
npm run dev
```

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

## Automatic checks and deployment

Every push runs **Portfolio CI** in GitHub Actions: locked dependency install,
Node/Worker tests, TypeScript checks, production build and a Cloudflare deployment
dry run. Pull requests targeting `main` run the same checks. No production
credentials are supplied to these checks.

Cloudflare Workers Builds is the production deployer connected to `main`.
Merging a passing PR updates `main` and starts its automatic build and deployment.
`npm run build` includes the regression tests, so the Cloudflare build also stops
before deployment if tests fail. Check both **Portfolio CI** and **Workers Builds:
my-portfolio**; a source push alone does not establish a successful deployment.
See [the deployment guide](docs/cloudflare-deployment.md#automatic-checks-and-production-deployments).

PR branches use Cloudflare Worker Previews with a separate `portfolio-preview`
database, separate authentication secret and isolated Durable Object namespaces.
All previews share that staging database; production accounts and media are not
copied into it. Apply new preview migrations with `npm run db:migrate:preview`.

## Environment files

The active local environment file is `.dev.vars` in this repository root, with
the safe key template in `.dev.vars.example`. There is no active root `.env` in
the integrated Cloudflare application. Keep `.dev.vars` private and ignored by Git.

Production values are managed in Cloudflare Workers → my-portfolio → Settings →
Variables and Secrets, or with `npx.cmd wrangler secret put NAME`. Editing the
local file does not update production. The existing private bootstrap JSON is
`.wrangler/private/production-secrets.private.json`; do not recreate or rotate
AUTH_SECRET after authenticator enrollment.

The retired client/server `.env` files remain in the private backup at
`../../BACKUPS/MY_PORTFOLIO-before-cloudflare-2026-11-05/retired-source/`, inside
`portfolio-client/` and `portfolio-server/`. They belong to the old application,
not the current Worker. Never paste their contents into chat or commit them.
