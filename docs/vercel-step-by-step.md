# Deploy MY_PORTFOLIO from GitHub to Vercel

Checked against the local project and official hosting documentation on
22 October 2026 (Asia/Manila). These are instructions, not evidence that accounts
were created or anything was deployed.

The inspected checkout is connected to
[Ajhon10/my-portfolio](https://github.com/Ajhon10/my-portfolio), on branch `main`.
Its latest local commit is `1c5ad5d`; the deployment changes are still uncommitted.
This guide applies to those local changes after they have been reviewed and pushed.

**Your repositories already exist: do not create a new GitHub repository.**
The local client and server folders both resolve to the same Git repository above.
The connected GitHub tool returned 404 during this inspection, so the remote
contents and any separately created repositories could not be verified. A 404
can also mean the connection lacks access to a private repository.

Choose the Vercel Root Directory by looking at the files in the repository you
actually import:

| GitHub repository layout | Frontend Root Directory | Backend Root Directory |
| --- | --- | --- |
| One repository containing both app folders (this local checkout) | `portfolio-client` | `portfolio-server` |
| Separate repositories, each with its own `package.json` at the top level | `.` (repository root) | `.` (repository root) |

For separate repositories, import the frontend repository once and the backend
repository once. Keep each app's matching `vercel.json`, lockfile and source in
that repository. Do not enter a subfolder name that does not exist on GitHub.
The remaining build, storage, database and environment settings below are the same.

The actual application uses **Vue 3 + TypeScript + Vite** in `portfolio-client`,
**NestJS 10 on Node.js** in `portfolio-server`, and **Prisma 5.22 + PostgreSQL**.
The frontend output is **`client-dist`**, as specified in `vite.config.ts` and
`portfolio-client/vercel.json`. Both app manifests, the API/socket clients,
backend bootstrap, deployment checks, migration wrapper and seed were inspected.

Use two Vercel projects from the same existing GitHub repository:

| Component | Service |
| --- | --- |
| Vue frontend | Vercel project rooted at `portfolio-client` |
| NestJS API | Vercel project rooted at `portfolio-server` |
| PostgreSQL records | Neon Free |
| Public images and certificates | Vercel Blob |
| Realtime chat coordination | Upstash Redis or another compatible Redis service |
| Email delivery | Optional SMTP provider for the existing mail features |
| AI-generated chatbot replies | Optional backend AI credentials |

```mermaid
flowchart LR
    Visitor[Visitor browser] --> Web[Vue frontend on Vercel]
    Visitor --> API[NestJS API on Vercel]
    API --> DB[(Neon PostgreSQL)]
    API --> Redis[(Redis for Socket.IO)]
    API --> Token[Scoped upload token]
    Token --> Visitor
    Visitor --> Blob[Public Vercel Blob assets]
```

For a new hosted PostgreSQL database, **Neon Free** is an option. You can retain
an existing managed PostgreSQL database instead if it accepts connections from
the backend and meets your needs. Transferring existing records between hosts is
only needed if you change database hosts. Apply any pending schema migrations in
step 7 whichever host you use. The database engine stays PostgreSQL.

Neon's direct Free plan and a Marketplace integration can have different
onboarding/billing screens. Select the actual Free plan, not a paid trial.
You can create Neon directly and paste its connection URLs into the backend.

**The free database does not guarantee that the whole site is free.**
[Vercel Hobby permits non-commercial personal use](https://vercel.com/docs/limits/fair-use-guidelines).
Advertising paid services requires a paid Vercel plan under those guidelines.
This portfolio has services and client-inquiry features, so consider their intended
use when choosing the Vercel plan. Review the current
[Blob allowances](https://vercel.com/docs/vercel-blob/usage-and-pricing),
[Neon plans](https://neon.com/pricing) and
[Redis plans](https://upstash.com/pricing/redis) before creating resources.
The optional paid AI integration has its own usage charges.

For this walkthrough, have your GitHub and Vercel accounts, a browser, Node.js
22.x with npm, Git (or GitHub Desktop), and an editor ready. Vercel CLI is optional
because app deployment uses the dashboard. Use the existing lockfiles and Prisma 5
configuration; the current Neon Prisma quickstart targets a newer Prisma major
version and should not be copied over this project.

## 1. Put the source changes on GitHub

From the MY_PORTFOLIO repository, inspect `git status`, review the source and
documentation changes, then commit and push the intended files. Include the new
Vercel configs, source files, scripts and updated package lockfiles. Keep private
environment files, `node_modules`, build output and the local `uploads` folder
out of the commit. Keep any existing hosting services until the replacement is
verified.

At inspection time, `portfolio-server/vercel.json`, `portfolio-server/scripts/`,
the deployment/storage/realtime implementation files, and `docs/` include new
untracked files. There are also modified package manifests and lockfiles. Review
all of them together; pushing only the frontend will omit required backend work.

From the repository root, review:

```powershell
git status --short
git diff --stat
```

Use Git or GitHub Desktop to commit the intended source and documentation files,
then push `main`. In GitHub, confirm both app folders and their `vercel.json`
files are visible in the pushed commit before importing that revision into Vercel.
If an old host is in use, keep it running until the replacement is verified.

## 2. Create the PostgreSQL database in Neon

1. Open [Neon](https://neon.com/) and sign up.
2. Select its **Free** plan and create a project, for example `my-portfolio`.
3. Choose a region near the region you will use for the Vercel backend.
4. In **Connect**, select the actual branch, database and role for this application.
5. Copy the **pooled** connection string privately. Put it in `DATABASE_URL`.
6. Copy the **direct / unpooled** connection string privately. Put it in `DIRECT_URL`.

The pooled hostname includes `-pooler`; the direct hostname does not. Preserve
the TLS parameters supplied by Neon. Some integration screens call the direct
variable `DATABASE_URL_UNPOOLED`; this project's migration script uses
**`DIRECT_URL`**, so map the direct value to that name.

If you already have data on Render and want to move it, follow Neon's
[Import Data Assistant](https://neon.com/docs/import/import-data-assistant).
Use Render's **external PostgreSQL connection string** in that private migration
workflow. Check compatibility, follow its transfer instructions, and select the
resulting imported Neon branch when copying the connection strings above.
Verify the imported schema, `_prisma_migrations` history and content before cutover.
Stop writes to the old application during the final transfer so new inquiries
are not lost. A new empty Neon database does not contain the Render records.

## 3. Create two Vercel projects

Sign into your existing Vercel account and connect GitHub. In the import screen,
select your GitHub account and the existing portfolio repository. If it is missing,
use the GitHub integration configuration to grant Vercel access to that repository,
then return to the import screen. You do not need to make a private repository public.
See [Vercel's GitHub integration guide](https://vercel.com/docs/git/vercel-for-github).

In Vercel, use **Add New / Project**, select the GitHub repository, and import it
twice with separate project names. Use these settings:

| Setting | Frontend | Backend |
| --- | --- | --- |
| Example project name | `my-portfolio-web` | `my-portfolio-api` |
| Root directory | `portfolio-client` | `portfolio-server` |
| Framework | Vite | NestJS |
| Install command | `npm ci --include=dev` | `npm ci --include=dev` |
| Build command | `npm run build` | `npm run build:vercel` |
| Output directory | `client-dist` | Leave framework-managed |
| Node version | 22.x | 22.x |

This table assumes the single repository found locally. For separate repositories,
use the root-directory mapping at the beginning of this guide. If you already
created either Vercel project, open that project's settings and check its connected
Git repository and Root Directory instead of creating a duplicate. Set the intended
production branch (`main` in this checkout); use the actual branch for other repos.

The checked-in `vercel.json` files supply the install/build/output settings.
Copy each project's **actual production domain** from Vercel; do not assume that
an example name above is available. If Vercel starts an initial deployment while
setup is incomplete, finish the next steps and redeploy. API-driven frontend
content needs the working backend connection from step 9.

Choose Node.js 22.x under each project's Settings > Build and Deployment. That
matches the locally checked runtime; Vercel's default can be a different major.
Keep the existing frontend SPA rewrite. Keep the NestJS preset for the backend:
the native integration recognizes `src/main.ts` and manages its Function output.
See [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
and [NestJS hosting](https://vercel.com/docs/frameworks/backend/nestjs).

## 4. Create public Blob storage for uploads

In Vercel's Storage area, create a **public Blob** store. Connect it to the
**backend project** for the intended environment. Confirm the backend environment
contains `BLOB_READ_WRITE_TOKEN`. Only portfolio assets intended to be public
belong here. The frontend receives limited upload tokens from the API; it never
receives this read-write credential.

Dashboard path: backend project > Storage > Create Storage > Blob. Select Public
access and connect Production. Keep a separate store for Preview. This project
explicitly validates `BLOB_READ_WRITE_TOKEN` at startup, so verify that exact
variable exists even when the dashboard also offers OIDC authentication.

## 5. Create Redis for realtime chat

Sign up for [Upstash Redis](https://upstash.com/pricing/redis) and select its
**Free** database option. Choose a nearby region. Copy the TLS/native Redis
connection URL to the backend's `REDIS_URL`:

```text
rediss://default:YOUR_PASSWORD@YOUR_REDIS_HOST:YOUR_PORT
```

Use the exact URL supplied by the service. The Socket.IO adapter uses Redis TCP
and Pub/Sub; `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not the
configuration for this adapter. Set `REDIS_KEY_PREFIX=portfolio-production`.
Use another database/prefix for testing and previews.

## 6. Set the backend environment variables

Open the backend Vercel project, then its environment-variable settings. Add
these to **Production**, replacing every placeholder:

```env
NODE_ENV=production
APP_DOMAIN=https://YOUR_ACTUAL_FRONTEND_DOMAIN
APP_TOKEN=YOUR_RANDOM_COOKIE_SECRET
ACCESS_TOKEN_SECRET=YOUR_DIFFERENT_RANDOM_JWT_SECRET
ACCESS_TOKEN_EXPIRES_IN=1d
DATABASE_URL=YOUR_NEON_POOLED_CONNECTION_STRING
DIRECT_URL=YOUR_NEON_DIRECT_CONNECTION_STRING
UPLOAD_STORAGE=blob
BLOB_READ_WRITE_TOKEN=YOUR_BACKEND_BLOB_TOKEN
REDIS_URL=YOUR_NATIVE_REDIS_TLS_URL
REDIS_KEY_PREFIX=portfolio-production
```

`APP_DOMAIN` is the frontend origin, without a trailing slash or `/api`.
Use separate randomly generated secrets of at least 32 random bytes for the
cookie and JWT values. Generate them in your password manager, or run this
locally twice and save each result privately:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Mail and AI variables remain optional; add them when enabling those integrations.
No backend credentials belong in frontend `VITE_` variables. Give preview
deployments separate databases, Blob stores and Redis prefixes.

The current backend startup rejects a Vercel deployment without Blob mode, a Blob
token, a native Redis URL and a Redis prefix. These services are required by this
implementation even if you are initially testing only the homepage.

## 7. Apply the database migrations and initialize a new owner

Use Node.js 22 locally. Open a terminal in `portfolio-server`:

```powershell
cd C:\Users\Lenovo\Desktop\PROJECTS\PERSONAL_PROJECTS\MY_PORTFOLIO\portfolio-server
npm.cmd ci --include=dev
npm.cmd run db:generate
```

Create a private file named **`.env.vercel.local`** in that folder using your text
editor. Copy the backend configuration from step 6 into it, using the actual Neon
URLs and your secrets. This filename is ignored by Git and Vercel uploads. It
keeps the existing local-development `.env` file intact.

Then apply checked-in migrations to the intended Neon database:

```powershell
node --env-file=.env.vercel.local scripts/migrate.cjs
```

The wrapper uses `DIRECT_URL` for migrations. It does not reset or erase the
database. Existing shell environment variables take precedence over an env file,
so ensure you have not left a different `DATABASE_URL` or `DIRECT_URL` set in that
terminal. Do not run `migrate:reset` against a database you want to keep.

For a **new empty database**, add these two local-only setup variables to
`.env.vercel.local` using a unique strong password of at least 16 characters:

```env
SEED_ADMIN_EMAIL=YOUR_OWNER_EMAIL
SEED_ADMIN_PASSWORD=YOUR_UNIQUE_OWNER_PASSWORD
```

Run the existing seed through Node with that same environment:

```powershell
node --env-file=.env.vercel.local -r ts-node/register -r tsconfig-paths/register src/database/seed.ts
```

The seed creates the initial portfolio content and OWNER account. Remove the
seed password from the private setup file after use. For an imported existing
database, keep your existing account and skip initialization unless you have
reviewed what the seed will add. Change any known development password before
making that database publicly accessible, and complete owner two-factor setup.

## 8. Deploy the backend

In the backend Vercel project, confirm Fluid compute is enabled, then deploy or
redeploy with the production configuration. The build generates Prisma Client;
it does not apply migrations automatically. No custom always-running start command
is needed for the native NestJS integration.

Open these addresses using the actual backend domain:

```text
https://YOUR_ACTUAL_BACKEND_DOMAIN/api/health
https://YOUR_ACTUAL_BACKEND_DOMAIN/api/projects
```

Health should report success, and projects should return API JSON. A healthy
process alone does not prove successful reads, uploads or chat. Current Vercel
documentation supports WebSockets on all plans with Fluid compute enabled; test
the actual NestJS/Socket.IO connection after deployment. Connections close at
the configured Function duration and must reconnect.
[WebSocket hosting documentation](https://vercel.com/docs/functions/websockets)

## 9. Connect and deploy the frontend

In the frontend Vercel project's Production environment, set:

```env
VITE_API_ENDPOINT=https://YOUR_ACTUAL_BACKEND_DOMAIN/api
```

Redeploy the frontend so Vite embeds the new public API URL. Confirm the backend's
`APP_DOMAIN` matches the resulting frontend origin exactly. If you change that
backend value, redeploy the backend as well.

## 10. Transfer files and finish the release checks

Re-upload the old local images, certificates, branding assets and avatars through
the CMS, then save their new Blob URLs. Files under `uploads/` and old
`/uploads/...` links do not transfer with a Vercel deployment. Keep original file
and database backups until the new deployment is verified.

Test public content, owner/client login, inquiries, uploads, chat and notifications.
Use two browser sessions to test administrator takeover and chat after reconnect;
connections are configured for a maximum 300-second lifetime. Refresh a nested
frontend URL directly. Check both service dashboards for usage against free limits.
If migrating from Render or another host, retire the old services only after the
data, files and features are verified.

Verify `/login`, an authenticated `/admin/...` page and `/client/portal` in
addition to the public homepage. Test realtime messages in two browser sessions
and after a reconnect. Both the frontend and the public API must be reachable by
ordinary visitors; check whether Vercel Deployment Protection is intercepting
requests before diagnosing an application CORS error.

## 11. Enable optional email and AI features

For email delivery, add the existing backend variables `MAIL_HOST`, `MAIL_PORT`,
`MAIL_USER`, `MAIL_PASS` and `MAIL_FROM` using your SMTP provider's actual settings,
then redeploy and test an inquiry/reply. A saved inquiry alone does not prove
email delivery.

For AI-generated chatbot replies, configure the backend's `OPENAI_API_KEY` and
`OPENAI_MODEL` for your API account, then redeploy and test the chatbot. Keep
these credentials on the backend. Existing application configuration and
`portfolio-server/.env.example` list the supported variable names.

## 12. Add a custom domain, if wanted

The Vercel-provided domains can be used immediately. To use a domain you own,
open the frontend project's Settings > Domains, add it, and apply the exact DNS
records Vercel displays at your DNS provider. Once it is active, update backend
`APP_DOMAIN` to the new frontend origin and redeploy the backend. If the API domain
also changes, update `VITE_API_ENDPOINT` with its `/api` suffix and redeploy the
frontend. [Domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain)

## Common problems for this project

| Symptom | Check |
| --- | --- |
| Frontend output directory not found | Use `client-dist`, matching `vite.config.ts`. |
| Homepage loads but content does not | Set `VITE_API_ENDPOINT` to the live backend plus `/api`; rebuild the frontend. Check real API reads. |
| Browser reports CORS or an authentication page instead of JSON | Match `APP_DOMAIN` to the frontend origin; redeploy the backend; inspect Deployment Protection and the response. |
| Backend fails to start | Inspect runtime logs for missing environment variable names, database connectivity or Redis connectivity. |
| Prisma Client missing during build | Use `npm run build:vercel`, which generates Prisma Client before compiling NestJS. |
| Database tables missing | Apply the checked-in migrations to the intended database; application builds do not migrate it. |
| Redis configuration rejected | Use `redis://` or `rediss://`; the adapter does not accept an HTTPS REST URL. |
| Images disappear after migration | Move local uploads to Blob and update saved references through the CMS. |
| Chat disconnects after several minutes | Check reconnect, resubscription and history recovery; Function duration is configured as 300 seconds. |
| Frontend deep links return 404 | Confirm the existing SPA rewrite was pushed in `portfolio-client/vercel.json`. |

## Inspection and verification on 22 October 2026

- Backend `npm.cmd run build:vercel`: passed, including Prisma 5.22 generation.
- Frontend `npm.cmd run build`: passed, including Vue type-check and production
  output in `client-dist`. The first attempt hit the sandbox's ancestor-directory
  read restriction; the same command passed with normal filesystem access.
- Both checks used the existing Node.js 22.21.0 installation and installed
  dependencies. A clean install and the actual Vercel builder remain cloud checks.
- This inspection did not run cloud database migrations, seed a database, create
  accounts/resources, push commits or deploy either application.
- Both builds were rerun successfully on 22 October using installed dependencies.
  The frontend again needed normal filesystem access for esbuild's ancestor lookup.
  Vite reported outdated Browserslist data, but the build completed.
- GitHub remote contents were not verified: the connector returned 404 for the
  configured repository. The repository mapping above comes from local Git remotes.
- The GitHub import, NestJS entrypoint and Fluid compute/WebSocket instructions
  were checked against official Vercel documentation on 22 October. Provider plan
  details retain their earlier review date; confirm current allowances at signup.

Existing dependency vulnerabilities recorded in
`ENGINEERING_ACCEPTANCE.md` still require remediation before production acceptance.
The earlier audit was not repeated during this documentation inspection. This
walkthrough does not imply that those issues or live-cloud checks are complete.

Additional references:
- https://neon.com/pricing
- https://neon.com/docs/guides/prisma
- https://neon.com/docs/import/import-data-assistant
- https://upstash.com/pricing/redis
- https://upstash.com/docs/redis/overall/usecases
- https://vercel.com/docs/vercel-blob/usage-and-pricing
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/functions/websockets

For the detailed deployment contract and rollback notes, see `vercel-deployment.md`.
