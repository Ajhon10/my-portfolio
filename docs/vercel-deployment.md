# Deploy MY_PORTFOLIO on Vercel

The frontend and backend retain Vue/Vite and NestJS. PostgreSQL is supported
through a Vercel Marketplace provider; a database does not run inside a Function.
Switching to Laravel/PHP, as used in PDEA, would still require a database service.

## Resources and application settings

Create two Vercel projects from this repository. Their `vercel.json` files contain
the build settings, so no root-level starter or framework migration is required.

| Setting | Frontend | Backend |
| --- | --- | --- |
| Root directory | `portfolio-client` | `portfolio-server` |
| Framework | Vite | NestJS |
| Install command | `npm ci --include=dev` | `npm ci --include=dev` |
| Build command | `npm run build` | `npm run build:vercel` |
| Output | `client-dist` | Framework-managed Function |
| Runtime | Node.js 22.x for the build | Node.js 22.x, Fluid compute enabled |

Connect these resources to the **backend** project:

- Managed PostgreSQL, for example [Neon through Vercel Marketplace](https://vercel.com/marketplace/neon).
  Use its pooled connection for `DATABASE_URL` and its direct connection for
  `DIRECT_URL`. Retain the provider's required TLS/pooler options. Budget the
  Prisma pool across all concurrent Function instances; provider defaults alone
  do not establish capacity. Use a database region near the Function region.
- A **public** Vercel Blob store for portfolio assets and certificates. Its
  backend `BLOB_READ_WRITE_TOKEN` signs constrained client upload tokens. These
  uploads are public assets; do not upload confidential documents here.
- Redis with the Redis wire protocol and Pub/Sub, for example a suitable
  Marketplace Redis service. Copy the `rediss://...` connection URL to
  `REDIS_URL`. A Redis REST URL/token pair cannot be used by the Socket.IO adapter.

Vercel's WebSocket documentation, checked on 21 October 2026, supports WebSockets
on all plans with Fluid compute enabled. Verify the actual Socket.IO deployment
in the intended account before release. Connections
close at Function maximum duration (configured here as 300 seconds). The client
rejoins active conversations, restores takeover intent, and reloads stored chat
after reconnect. Multi-instance broadcast, abrupt-instance-loss behavior and
provider Redis limits still require live verification.

## Environment variables

Frontend, at build time:

```env
VITE_API_ENDPOINT=https://YOUR-BACKEND.vercel.app/api
```

Backend, in its Vercel environment settings:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV=production` | Production mode |
| `APP_DOMAIN=https://YOUR-FRONTEND.vercel.app` | Exact frontend origin for CORS; comma-separated explicit origins are supported |
| `APP_TOKEN` | Strong randomly generated cookie secret |
| `ACCESS_TOKEN_SECRET` | Separate strong randomly generated JWT secret |
| `ACCESS_TOKEN_EXPIRES_IN=1d` | Existing token lifetime |
| `DATABASE_URL` | Pooled PostgreSQL application URL |
| `DIRECT_URL` | Direct database URL used by the explicit migration command |
| `UPLOAD_STORAGE=blob` | Required Vercel upload mode; default when `VERCEL=1` |
| `BLOB_READ_WRITE_TOKEN` | Backend-only Blob store credential |
| `REDIS_URL` | Redis TCP/TLS URL with Pub/Sub |
| `REDIS_KEY_PREFIX=portfolio-production` | Unique namespace for this environment |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | Existing optional SMTP settings |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Existing optional backend AI settings |

`APP_PORT` defaults to 3000; `PORT`, when supplied by the platform, takes
precedence. Do not add backend secrets to variables beginning with `VITE_`.
Application variables are not copied from a developer's private `.env` file.

Use separate PostgreSQL databases/branches, Blob stores and Redis prefixes for
preview deployments. Do not assign production database credentials to arbitrary
preview branches. Update `APP_DOMAIN` and `VITE_API_ENDPOINT` together when domains
change, then rebuild the frontend.

## Database release and initial owner

Run the following from `portfolio-server` with the intended release's backend
environment loaded securely. Do not paste credentials into command history or
commit generated environment files.

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
```

`db:migrate` applies checked-in Prisma migrations with `DIRECT_URL` when present,
falling back to `DATABASE_URL` for a direct local connection. It never resets the
database. The build generates Prisma Client but **does not run migrations**;
preview builds cannot accidentally migrate the production database.

For a new database only, set `SEED_ADMIN_EMAIL` and a unique
`SEED_ADMIN_PASSWORD` of at least 16 characters in the secure release environment,
then run `npm.cmd run migrate:seed`. Existing owner passwords are not overwritten.
Production seed credentials are never logged. Remove the seed password from the
environment after initial setup. Complete the owner's existing two-factor setup.
An existing development database must have its known default owner credentials
changed before public release; seeding does not rotate existing passwords.

For an existing portfolio database, migrate its data using the provider's
PostgreSQL import/backup tools before switching `DATABASE_URL`. Test restoration
on an isolated database first. Prisma schema migrations do not transfer content
from one database server to another.

## Existing uploads

Local files under `portfolio-server/uploads` are not deployed or served on Vercel.
Existing `/uploads/...` values in the database therefore need transfer before
cutover. Keep the old host and file backup until verification succeeds.

Re-upload referenced files through the CMS using Blob mode, saving the returned
HTTPS URL in each item: Site Content branding/portrait, project thumbnails and
galleries, technology icons, certifications, photography and user avatars.
Historical chat avatar links may also reference the old host. For a bulk transfer,
copy files with an operator-controlled script and update references transactionally
from an inspected mapping; no automatic database rewrite is performed here.
Retain old copies and the mapping for rollback. Unattached Blob objects are not
automatically deleted, because URLs can be shared by several content records.

## Deploy and verify

1. Provision isolated resources and set both projects' environment variables.
2. Run local checks below on the exact release commit. Resolve the dependency
   findings recorded in `ENGINEERING_ACCEPTANCE.md` before accepting production.
3. Back up existing content and files, then apply production migrations once in
   a controlled release operation. Seed only a new database.
4. Deploy the backend and check `GET /api/health` and `/docs`; test actual reads
   and writes too. Health alone does not verify external storage or mail.
5. Deploy the frontend with its backend URL. Refresh a nested route directly to
   verify the SPA rewrite. Check public pages, owner/client login, inquiries,
   optional email and chatbot responses.
6. Upload an image larger than 4.5 MB and a certificate near 12 MiB. Confirm the
   browser sends file bytes to Blob, the token request requires OWNER/ADMIN,
   the returned URLs load, and gallery attachments survive a new deployment.
7. Use two browsers for visitor/admin and project/client chat. Verify presence,
   typing, notifications, takeover and history after a forced reconnect and
   after the 300-second connection lifetime. Repeat with clients served by
   different Function instances; a single local server does not prove this.
8. Finish existing-file/data transfer, inspect broken asset URLs, and configure
   provider backups, restore checks, usage limits and availability monitoring.

Rollback: retain the previous Vercel deployments and previous environment settings;
switch back to a verified compatible deployment if needed. Keep migrations additive
and retain the original database/file backup. Rolling back a Function does not undo
database writes, migrations or Blob uploads. Serialize releases in the selected
deployment workflow; no account-specific CI connection is configured here.

## Local verification commands

```powershell
cd portfolio-server
npm.cmd run build:vercel
npm.cmd test -- --runInBand
cd ../portfolio-client
npm.cmd run build
npm.cmd test
```

Local development still defaults to `UPLOAD_STORAGE=local` and does not require
Blob or Redis. Add `REDIS_URL` only when testing shared realtime explicitly.
Dependency installation uses the checked-in npm lockfiles.

References checked 20 October 2026:
- [NestJS](https://vercel.com/docs/frameworks/backend/nestjs)
- [WebSockets](https://vercel.com/docs/functions/websockets)
- [Postgres](https://vercel.com/docs/postgres)
- [Storage integrations](https://vercel.com/docs/marketplace-storage)
- [Blob client uploads](https://vercel.com/docs/vercel-blob/client-upload)
- [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/)
