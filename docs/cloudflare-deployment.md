# Deploy the integrated portfolio on Cloudflare Free

The application now has one repository root, npm install, build and deployment.
Vue is in `src/`; the TypeScript API is in `worker/`. D1 and a SQLite Durable
Object are Cloudflare bindings. Laravel, NestJS, PostgreSQL, Redis and R2 are
not required by this application. See [architecture](cloudflare-unified-architecture.md).

## Local use

Use Node 22.14+ and run commands from this repository root. In PowerShell use
`npm.cmd`/`npx.cmd` if script execution policy blocks the `.ps1` launchers.

```sh
npm ci
npm run setup
npm run owner:create
npm run dev
```

`setup` creates `.dev.vars` with a random local AUTH_SECRET, applies local
migrations and adds public seed content without overwriting existing records.
Keep `.dev.vars` private and stable: it encrypts authenticator secrets.
`owner:create` prompts for a new owner and hidden password (12–128 characters).
There is no default administrator password. The first login enrolls an
authenticator. Enrollment codes cannot be reused for login; use the next code.

This workstation already has a restored local D1 database. Do not create another
owner for it. Run `npm run owner:create -- --reset`, supply the existing email
and a new password, and enroll the authenticator on login. PostgreSQL remains unchanged.

```sh
npm test
npm run test:browser
npm run build
npm run deploy:check
npm run preview
```

The browser suite uses a separate disposable local database and installed Chrome
(`PLAYWRIGHT_CHANNEL=msedge` also works). It never tests with private portfolio
records. Preview serves the built application at port 8787; dev uses port 5173.

## Cloudflare account setup

No remote database or deployment was created as part of the local conversion.
Keep the account on Workers Free. The all-zero D1 ID in `wrangler.jsonc` is a
placeholder that must be replaced before deploying.

```sh
npx wrangler login
npx wrangler d1 create portfolio
```

Copy the returned database ID into `wrangler.jsonc` under `d1_databases[0]`.
Keep binding `DB`, database name `portfolio`, and the SQLite Durable Object
migration. Create/apply the database schema before serving traffic:

```sh
npm run db:migrate:remote
```

For a fresh public portfolio, seed with `npm run db:seed -- --remote` and create
the owner with `npm run owner:create -- --remote`. For the existing portfolio,
use the private import procedure below **before seeding or creating accounts**.

Configure a unique random AUTH_SECRET of at least 32 characters as an encrypted
Worker runtime secret (dashboard or `npx wrangler secret put AUTH_SECRET`). Do
not reuse the example placeholder or expose it as a VITE variable. Preserve this
secret in your private backup; changing it makes existing 2FA secrets unreadable.

```sh
npm run deploy
```

For Cloudflare Git builds, use the repository root (blank or `/`), install
`npm ci`, build `npm run build`, and deploy `npx wrangler deploy`. Remove old
`portfolio-client`/`portfolio-server` root settings. This is a Workers project;
the generated Vite configuration deploys the Worker and Vue assets together.
Do not configure a second backend URL or database host.

After deployment check `/api/health`, owner enrollment/login, CMS edits and
uploads, a public inquiry, chatbot history/takeover, client project chat, and
direct navigation to SPA routes. Inspect actual Worker CPU, D1 reads/storage,
DO requests and errors before considering the intended workload accepted.

## Existing PostgreSQL data and uploads

The private pre-conversion backup is outside Git at
`BACKUPS/MY_PORTFOLIO-before-cloudflare-2026-11-05` in the PROJECTS workspace.
It includes the original source bundle, environment/upload ZIP, PostgreSQL
snapshot, and a D1 import archive. These contain private records and must never
be uploaded to the public repository.

The snapshot contains 184 records across 20 models. The prepared D1 import
preserves IDs, dates, soft deletes, relationships, publication states and
rewrites local upload URLs, including JSON site-content image lists. Fourteen
files (22,829,795 bytes) are included. One already-missing project thumbnail is
replaced with an available gallery image; the original reference and replacement
are recorded in the private report. Unreferenced original files remain in the
original private ZIP.

To make a new snapshot, supply DATABASE_URL privately in the shell, then run:

```sh
npm run legacy:export -- --out=legacy-export.private.json
npm run legacy:import -- --file=legacy-export.private.json --uploads=path/to/uploads --reset-2fa
```

The exporter uses a repeatable, read-only PostgreSQL transaction. The importer
only generates private SQL; it does not modify either database. By default it
refuses missing uploads and incompatible legacy MFA state. The explicit
`--fallback-missing-thumbnails` option replaces only missing project thumbnails
with their available gallery image or null and records this in the report.
Use a new `--out=directory` when regenerating to avoid overwriting evidence.

Rehearse the generated files first:

```sh
node scripts/test-migration.mjs --dir=.wrangler/private/legacy-import
node scripts/migration/apply-legacy.mjs --dir=.wrangler/private/legacy-import
```

The apply command defaults to local and refuses an already populated database.
For remote restoration, extract the prepared archive privately, apply migrations
to an **empty** D1 database, then run the apply command with `--remote`. It imports
records first, media next, and checks foreign keys. SQL import files are separate
recovery steps, not one transaction across all files: an interrupted import must
be resumed deliberately or restarted in a new empty database. Never wipe a live
database to satisfy the empty-database guard.

Check counts against `report.private.json`, verify the imported media, then reset
each imported account's password (`owner:create -- --reset`, plus `--remote` for
remote). Legacy Argon2 hashes are preserved in the private snapshot but cannot
authenticate in this runtime. Imported accounts are flagged for reset. Legacy
authenticator enrollment is cleared only with the explicit import option. No
old sessions are imported. The owner can then reset other accounts through Users.

Keep the original PostgreSQL service and private backup until remote acceptance.
Rollback is to restore the source bundle at its recorded commit and original
environment/upload files, then use the unchanged original PostgreSQL database.

## Optional integrations and finite free quotas

Without external credentials, inquiries/replies persist and the chatbot uses
grounded local portfolio/knowledge answers. Optional OPENAI_API_KEY enables
Chat Completions with the existing OPENAI_MODEL (default gpt-4o-mini), store:false
and a bounded timeout. This optional provider has its own billing.

Optional email uses Resend's HTTP API because the old SMTP transport is removed.
Set MAIL_API_TOKEN, MAIL_FROM and MAIL_TO as runtime secrets only if desired.
The durable outbox retries up to five times, with idempotency keys and a scheduled
15-minute retry. The API reports whether email was queued or not configured;
it does not claim delivery. Failed entries are retained for operator review in
`mail_outbox`. Do not enable optional integrations until their credentials,
sender identity and provider limits are verified. Live AI/email calls were not
made during local testing.

Uploads are public portfolio assets. They use D1 in 512 KiB chunks, with 8 MiB
image and 12 MiB certificate limits and a 256 MiB total media budget. This avoids
R2 billing enrollment but is intended for a small portfolio. Free database/CPU/
request quotas still apply. The hub accepts at most 128 concurrent connections.
Password hashing and QR generation run in the Durable Object with strong PBKDF2
work factors. Local tests and a small bundle do not prove the Free Worker's 10 ms
CPU limit at production traffic; inspect real deployment metrics before launch.

Use the [current Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/) and
[Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
when planning capacity. No paid products are provisioned by the setup scripts.

Owners can inspect uploads with authenticated `GET /api/upload/files` and reclaim
unused files with `DELETE /api/upload/files/:id`. Deletion refuses any reference
in content, galleries, avatars or chat history and cascades stored chunks.
